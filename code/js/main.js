// ===================== 主循环：状态机 / 镜头 / 碰撞调度 =====================
import { CFG, SCORE, WEAPON_LABEL, DIFFS, LEVEL_MUSIC } from './config.js';
import { clamp, rand, overlap, circleRect, rect, loadNum, saveVal } from './utils.js';
import { Input } from './input.js';
import { setupTouch } from './touch.js';
import { AudioSys } from './audio.js';
import { Particles } from './particles.js';
import { LEVEL, LEVELS, setLevel, groundTopAt, drawBackground, drawTerrain, laserActive, updateLevelDynamics } from './level.js';
import { EnemyManager } from './enemies.js';
import { Player } from './player.js';
import { Boss } from './boss.js';
import { YetiBoss } from './yeti.js';
import { MechBoss } from './mech.js';
import { HeliBoss } from './heli.js';
import { LavaBeast } from './lavabeast.js';
import { drawHUD, drawTitle, drawPause, drawGameOver, drawVictory, drawStageBanner } from './hud.js';
import { Assets } from './assets.js';

const STEP = 1 / 60;

// Boss 注册表：关卡 def 的 boss 字段 → Boss 类
const BOSS_CLASSES = { fortress: Boss, yeti: YetiBoss, mech: MechBoss, heli: HeliBoss, beast: LavaBeast };

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.input = new Input();
    setupTouch(this.input);   // 触屏设备启用虚拟按键
    this.audio = new AudioSys();
    this.particles = new Particles();
    this.enemies = new EnemyManager();
    this.player = new Player();

    this.state = 'title';
    this.time = 0;
    this.playTime = 0;
    this.camX = 0;
    this.score = 0;
    this.hi = loadNum('steel_assault_hi', 0);
    this.shakeT = 0;
    this.hitStop = 0;   // 打击顿帧（秒）
    this.konami = false;
    this.boss = null;
    this.bossBanner = 0;
    this.bullets = [];
    this.levelIdx = 0;
    this.unlocked = LEVELS.length - 1;  // 关卡全部直接开放，无需解锁
    this.difficulty = clamp(Math.round(loadNum('steel_assault_diff', 1)), 0, DIFFS.length - 1);
    this.stats = { kills: 0, shots: 0, hits: 0, deaths: 0 };

    this.input.onKonami = () => {
      if (this.state === 'title' && !this.konami) {
        this.konami = true;
        this.audio.ensure();
        this.audio.sfx('konami');
      }
    };

    this.world = {
      player: this.player, enemies: this.enemies, particles: this.particles,
      audio: this.audio, bullets: this.bullets, camX: 0, time: 0,
      addScore: (n, x, y) => this.addScore(n, x, y),
      shake: (n) => this.shake(n),
      onPitDeath: () => this.onPitDeath(),
      killPlayer: () => this.killPlayer(),
      stats: this.stats,
    };

    this.acc = 0;
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  start(keepRun = false) {
    this.audio.ensure();
    setLevel(this.levelIdx);
    if (!keepRun) {   // 连关时保留分数与战绩，整场战役累计计分
      this.score = 0;
      this.stats = { kills: 0, shots: 0, hits: 0, deaths: 0 };
      this.world.stats = this.stats;
    }
    this.playTime = 0;
    this.camX = 0;
    this.boss = null;
    this.bossBanner = 0;
    this.bullets.length = 0;
    this.particles.clear();
    this.enemies.clear();
    this.player.reset(this.konami ? 30 : DIFFS[this.difficulty].lives);
    CFG.DIFF_MUL = DIFFS[this.difficulty].mul;
    // 固定敌人
    for (const t of LEVEL.turrets) this.enemies.spawnTurret(t.x, t.y);
    for (const s of LEVEL.snipers) this.enemies.spawnSniper(s.x, s.y);
    for (const g of LEVEL.grenadiers || []) this.enemies.spawnGrenadier(g.x, g.y);
    for (const s of LEVEL.shielders || []) this.enemies.spawnShielder(s.x, s.y);
    for (const wm of LEVEL.sandworms || []) this.enemies.spawnSandworm(wm.x, CFG.GROUND_Y);
    // 触发器复位
    this.triggers = LEVEL.triggers.map((t) => ({ ...t, fired: false }));
    this.stageBanner = 2.4;   // 关卡名横幅
    this.state = 'playing';
    this.audio.playJingle('start');
    this.audio.startBGM('level', LEVEL_MUSIC[this.levelIdx] || {});
  }

  addScore(n, x, y) {
    this.score += n;
    if (x !== undefined) this.particles.text(x, y - 10, `+${n}`);
    if (this.score > this.hi) {
      this.hi = this.score;
      saveVal('steel_assault_hi', this.hi);
    }
  }

  shake(n) {
    this.shakeT = Math.max(this.shakeT, n / 60);
  }

  onPitDeath() {
    if (this.player.dead) return;
    this.player.lives--;
    this.stats.deaths++;
    this.audio.sfx('hit');
    this.shake(8);
    if (this.player.lives > 0) {
      this.respawn();
    } else {
      this.gameOver();
    }
  }

  killPlayer() {
    if (this.player.die()) {
      this.player.lives--;
      this.stats.deaths++;
      this.audio.sfx('hit');
      this.shake(10);
      this.particles.explosion(this.player.x + 13, this.player.y + 20, 0.8);
    }
  }

  respawn() {
    const sx = clamp(this.player.lastSafe.x, this.camX + 30, this.camX + CFG.W - 200);
    // 安全点扫描：跳过已塌落的平台和流沙，附近找不到安全地面才回退默认地面
    let top = null, rx = sx;
    for (const dx of [0, -48, 48, -96, 96, -144, 144]) {
      const x = clamp(sx + dx, this.camX + 30, this.camX + CFG.W - 200);
      const t = groundTopAt(x + CFG.PLAYER_W / 2, { safe: true });
      if (t !== null) { top = t; rx = x; break; }
    }
    this.player.respawn(rx, (top ?? CFG.GROUND_Y) - CFG.PLAYER_H);
  }

  gameOver() {
    this.state = 'gameover';
    this.audio.stopBGM();
    this.audio.playJingle('defeat');
  }

  victory() {
    this.state = 'victory';
    this.audio.stopBGM();
    this.audio.playJingle('victory');
  }

  // ---------------- 更新 ----------------
  update(dt) {
    this.time += dt;
    if (this.input.wasPressed('mute')) this.audio.toggleMute();
    this.shakeT = Math.max(0, this.shakeT - dt);

    // 打击顿帧：世界冻结几帧，增强爆炸打击感
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.input.endFrame();
      return;
    }

    switch (this.state) {
      case 'title': {
        // ←/→ 或数字键选关（只能选已解锁的）
        if (this.input.wasPressed('left') && this.levelIdx > 0) {
          this.levelIdx--; this.audio.ensure(); this.audio.sfx('select');
        }
        if (this.input.wasPressed('right') && this.levelIdx < this.unlocked) {
          this.levelIdx++; this.audio.ensure(); this.audio.sfx('select');
        }
        for (let i = 0; i < LEVELS.length; i++) {
          if (i <= this.unlocked && this.input.pressed.has(`Digit${i + 1}`)) {
            this.levelIdx = i; this.audio.ensure(); this.audio.sfx('select');
          }
        }
        // ↑/↓ 切换难度
        if (this.input.wasPressed('up') || this.input.wasPressed('down')) {
          this.difficulty = (this.difficulty + (this.input.wasPressed('down') ? 1 : 2)) % DIFFS.length;
          saveVal('steel_assault_diff', this.difficulty);
          this.audio.ensure(); this.audio.sfx('select');
        }
        if (this.input.wasPressed('start')) { this.audio.sfx('select'); this.start(); }
        break;
      }

      case 'playing':
        if (this.input.wasPressed('start')) {
          this.state = 'paused';
          this.audio.sfx('select');
          this.audio.ctx?.suspend();   // 暂停挂起音频
          break;
        }
        this.playTime += dt;
        this.stageBanner = Math.max(0, this.stageBanner - dt);
        this.bossBanner = Math.max(0, this.bossBanner - dt);
        this.world.camX = this.camX;
        this.world.time = this.time;

        this.player.update(dt, this.input, this.world);
        updateLevelDynamics(dt, this.world);
        // 侧风：空中跳跃被吹偏
        if (!this.player.onGround && LEVEL.winds) {
          for (const w of LEVEL.winds) {
            if (this.player.x > w.x0 && this.player.x < w.x1) this.player.x += w.force * dt;
          }
        }
        this.enemies.update(dt, this.world);
        if (this.boss) this.boss.update(dt, this.world);

        this.fireTriggers();
        this.updateCamera();
        this.updateBullets(dt);
        this.checkCollisions();
        this.particles.update(dt);

        // 玩家死亡结算
        if (this.player.dead && this.player.deathT > 1.4) {
          if (this.player.lives > 0) this.respawn();
          else this.gameOver();
        }
        // Boss 触发（按关卡配置选 Boss）
        if (!this.boss && this.player.x > CFG.BOSS_TRIGGER_X) {
          this.boss = new (BOSS_CLASSES[LEVEL.boss] || Boss)();
          this.bossSupplyT = 12;   // Boss 战补给倒计时
          this.bossBanner = 2.4;
          this.audio.startBGM('boss');
          if (LEVEL.boss === 'yeti') this.audio.sfx('roar');
          this.shake(6);
        }
        if (this.boss && this.boss.done && this.state === 'playing') this.victory();
        // Boss 战补给：每 18 秒一架随机补给无人机
        if (this.boss && !this.boss.done && !this.boss.dead) {
          this.bossSupplyT -= dt;
          if (this.bossSupplyT <= 0) {
            this.bossSupplyT = 18;
            const carries = ['M', 'S', 'L', 'G', 'H', 'F', 'B'];
            this.enemies.spawnDrone(carries[Math.floor(Math.random() * carries.length)], this.camX);
          }
        }
        break;

      case 'paused':
        if (this.input.wasPressed('start')) {
          this.state = 'playing';
          this.audio.ctx?.resume();    // 恢复音频
          this.audio.sfx('select');
        }
        break;

      case 'gameover':
        this.particles.update(dt);
        if (this.input.wasPressed('start')) { this.state = 'title'; this.konami = false; this.audio.sfx('select'); }
        break;

      case 'victory':
        this.particles.update(dt);
        if (this.input.wasPressed('start')) {
          this.audio.sfx('select');
          if (this.levelIdx < LEVELS.length - 1) {
            this.levelIdx++;
            this.start(true);  // 连关：直接进入下一关（分数/战绩累计）
          } else {
            this.state = 'title'; this.konami = false;
          }
        }
        break;
    }
    this.input.endFrame();
  }

  fireTriggers() {
    for (const t of this.triggers) {
      if (!t.fired && this.camX + CFG.W + 80 >= t.x) {
        t.fired = true;
        if (t.type === 'runners') this.enemies.spawnRunners(t.n, t.dir, this.camX);
        else if (t.type === 'drone') this.enemies.spawnDrone(t.carry, this.camX);
        else if (t.type === 'flyers') this.enemies.spawnFlyers(t.n, this.camX);
        else if (t.type === 'jumpers') this.enemies.spawnJumpers(t.n, t.dir, this.camX);
        else if (t.type === 'rollers') this.enemies.spawnRollers(t.n, t.dir, this.camX);
        else if (t.type === 'paras') this.enemies.spawnParas(t.n, this.camX);
        else if (t.type === 'patrols') this.enemies.spawnPatrols(t.n, this.camX);
      }
    }
  }

  updateCamera() {
    const maxCam = LEVEL.width - CFG.W;
    const target = this.player.x - CFG.W * 0.42;
    if (target > this.camX) this.camX = Math.min(target, maxCam);
  }

  // 追踪导弹：朝最近敌人（或 Boss 核心）转向
  steerHoming(b, dt) {
    let tx = null, ty = null, best = Infinity;
    for (const e of this.enemies.list) {
      if (e.remove) continue;
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      const d2 = (cx - b.x) ** 2 + (cy - b.y) ** 2;
      if (d2 < best) { best = d2; tx = cx; ty = cy; }
    }
    if (tx === null && this.boss && !this.boss.done && !this.boss.dead) {
      tx = this.boss.core.x; ty = this.boss.core.y;
    }
    if (tx === null) return;
    const cur = Math.atan2(b.vy, b.vx);
    let diff = Math.atan2(ty - b.y, tx - b.x) - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const sp = Math.hypot(b.vx, b.vy);
    const na = cur + clamp(diff, -b.homing * dt, b.homing * dt);
    b.vx = Math.cos(na) * sp;
    b.vy = Math.sin(na) * sp;
  }

  // 爆炸子弹（榴弹/导弹）：AOE 范围伤害 + 特效 + 震屏 + 顿帧
  explodeBullet(b) {
    const r = b.aoe;
    this.particles.explosion(b.x, b.y, r / 70);
    this.audio.sfx('boom');
    this.shake(7);
    this.hitStop = Math.max(this.hitStop, 0.05);
    const r2 = r * r;
    for (const e of this.enemies.list) {
      if (e.remove) continue;
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      const dx = cx - b.x, dy = cy - b.y;
      if (dx * dx + dy * dy <= r2) {
        this.stats.hits++;
        if (this.enemies.damage(e, b.dmg + 1, this.world)) this.stats.kills++;
      }
    }
    if (this.boss && !this.boss.done) {
      const c = this.boss.core;
      if (!this.boss.dead) {
        const dx = c.x - b.x, dy = c.y - b.y;
        if (dx * dx + dy * dy <= (r + c.r) * (r + c.r)) { this.stats.hits++; this.boss.damage('core', b.dmg, this.world); }
      }
      for (const cn of this.boss.cannons) {
        if (cn.alive && circleRect(b.x, b.y, r, cn)) { this.stats.hits++; this.boss.damage(cn, b.dmg, this.world); }
      }
    }
  }

  updateBullets(dt) {
    if (this.bullets.length > 240) this.bullets.splice(0, this.bullets.length - 240);   // 性能护栏
    for (const b of this.bullets) {
      if (b.homing) this.steerHoming(b, dt);
      if (b.grav) b.vy += b.grav * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) {
        if (b.aoe) this.explodeBullet(b); // 超时空爆
        b.remove = true;
        continue;
      }
      // 火焰：膨胀 + 火舌上飘
      if (b.flame) {
        b.r = 7 + (1 - b.life / b.maxLife) * 13;
        b.vy -= 260 * dt;
      }
      // 拖尾
      b.trailT -= dt;
      if (b.trailT <= 0) {
        if (b.type === 'H') { this.particles.smoke(b.x, b.y, 0.65); b.trailT = 0.035; }
        else if (b.type === 'G') { this.particles.sparks(b.x, b.y, 1, '#ffd76a'); b.trailT = 0.07; }
        else if (b.type === 'F') { this.particles.sparks(b.x, b.y, 1, '#ff9a50'); b.trailT = 0.09; }
        else b.trailT = 1;
      }
      if (b.x < this.camX - 40 || b.x > this.camX + CFG.W + 40 || b.y < -40 || b.y > CFG.H + 40) b.remove = true;
    }
    // 子弹 vs 敌人
    for (const b of this.bullets) {
      if (b.remove) continue;
      const br = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
      for (const e of this.enemies.list) {
        if (e.remove || (b.hitSet && b.hitSet.has(e))) continue;
        if (overlap(br, e)) {
          if (b.aoe) { this.explodeBullet(b); b.remove = true; break; }
          // 盾牌兵：正面挡弹（爆炸物/火焰除外）
          if (e.type === 'shielder' && !b.flame && Math.sign(b.vx || e.facing) === -e.facing) {
            this.particles.sparks(b.x, b.y, 4, '#c8ccdc');
            this.audio.sfx('bossHit');
            b.remove = true;
            break;
          }
          this.stats.hits++;
          if (this.enemies.damage(e, b.dmg, this.world)) this.stats.kills++;
          this.particles.sparks(b.x, b.y, 5, b.flame ? '#ff9a50' : '#ffe0a0');
          if (b.pierce) b.hitSet.add(e);
          else { b.remove = true; break; }
        }
      }
    }
    // 子弹 vs Boss
    if (this.boss && !this.boss.done) {
      for (const b of this.bullets) {
        if (b.remove) continue;
        const part = this.boss.hitTest(b);
        if (part) {
          const key = part === 'core' ? 'core' : part;
          if (b.hitSet && b.hitSet.has(key)) continue;
          if (b.aoe) { this.explodeBullet(b); b.remove = true; continue; }
          this.stats.hits++;
          this.boss.damage(part, b.dmg, this.world);
          this.particles.sparks(b.x, b.y, 5, b.flame ? '#ff9a50' : '#ffd0a0');
          if (b.pierce) b.hitSet.add(key);
          else b.remove = true;
        }
      }
    }
    // 子弹 vs 地形（火焰可越过地形，短射程自生自灭）
    for (const b of this.bullets) {
      if (b.remove || b.flame) continue;
      for (const s of LEVEL.solids) {
        if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h) {
          if (b.aoe) this.explodeBullet(b);
          else this.particles.sparks(b.x, b.y, 4, b.type === 'L' ? '#9ae8ff' : '#c8c8d8');
          b.remove = true;
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.remove);
    this.world.bullets = this.bullets;
  }

  checkCollisions() {
    const p = this.player;
    if (p.dead) return;
    const pr = { x: p.x, y: p.y, w: p.w, h: p.h };
    // 敌方子弹
    if (p.inv <= 0 && p.shieldT <= 0) {
      for (const b of this.enemies.bullets) {
        const r = b.r || 4;
        if (overlap({ x: b.x - r, y: b.y - r, w: r * 2, h: r * 2 }, pr)) {
          this.killPlayer();
          return;
        }
      }
      // 敌人撞击（跑男/盾牌兵/寒冰无人机/蛙跳兵/空降兵/沙虫出土时）
      for (const e of this.enemies.list) {
        const toucher = e.type === 'runner' || e.type === 'shielder' || e.type === 'flyer'
          || e.type === 'jumper' || e.type === 'para' || e.type === 'patrol'
          || (e.type === 'worm' && e.state !== 'hide');
        if (toucher && overlap(e, pr)) {
          this.killPlayer();
          return;
        }
      }
    }
    // 激光门（基地主题，激活时碰到即死）
    if (LEVEL.lasers && p.inv <= 0 && p.shieldT <= 0) {
      for (const g of LEVEL.lasers) {
        if (laserActive(g, this.time) && overlap({ x: g.x - 3, y: CFG.GROUND_Y - g.h, w: 6, h: g.h }, pr)) {
          this.killPlayer();
          return;
        }
      }
    }
    // 道具拾取
    for (const pw of this.enemies.powerups) {
      if (overlap(pw, pr)) {
        pw.remove = true;
        if (pw.kind === 'B') {
          p.shieldT = 10;   // B 防护罩：10 秒无敌
        } else {
          p.weapon = pw.kind;
        }
        this.audio.sfx('powerup');
        this.addScore(SCORE.powerup, pw.x, pw.y);
        this.particles.text(pw.x + 14, pw.y - 24, WEAPON_LABEL[pw.kind] || '新武器!', '#6aff8a');
      }
    }
    this.enemies.powerups = this.enemies.powerups.filter((pw) => !pw.remove);
  }

  // ---------------- 绘制 ----------------
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CFG.W, CFG.H);

    if (this.state === 'title') {
      drawTitle(ctx, this.time, this.konami, {
        levels: LEVELS, levelIdx: this.levelIdx, unlocked: this.unlocked,
        diffName: DIFFS[this.difficulty].name,
      });
      return;
    }

    // 世界（镜头 + 震屏）
    ctx.save();
    const sx = this.shakeT > 0 ? rand(-1, 1) * this.shakeT * 30 : 0;
    const sy = this.shakeT > 0 ? rand(-1, 1) * this.shakeT * 30 : 0;
    drawBackground(ctx, this.camX, this.time);
    ctx.translate(Math.round(-this.camX + sx), Math.round(sy));
    drawTerrain(ctx, this.camX, this.time);
    this.enemies.draw(ctx, this.time);
    if (this.boss) this.boss.draw(ctx, this.time);
    // 玩家子弹（按类型绘制）
    for (const b of this.bullets) this.drawBullet(ctx, b);
    this.player.draw(ctx, this.time);
    this.particles.draw(ctx);
    ctx.restore();

    // HUD
    drawHUD(ctx, this);
    if (this.state === 'playing' && this.stageBanner > 0) drawStageBanner(ctx, LEVEL.name, this.stageBanner);
    if (this.state === 'paused') drawPause(ctx, this);
    else if (this.state === 'gameover') drawGameOver(ctx, this.score, this.hi);
    else if (this.state === 'victory') drawVictory(ctx, this.score, this.playTime, this.levelIdx < LEVELS.length - 1, this.boss?.clearText || '要塞已摧毁', this.stats);
  }

  // 按子弹类型绘制：R/M/S 能量弹 / L 激光 / G 榴弹 / H 导弹 / F 火焰
  drawBullet(ctx, b) {
    const ang = Math.atan2(b.vy, b.vx);
    switch (b.type) {
      case 'L': {
        const img = Assets.get('bullet_laser');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        if (img) ctx.drawImage(img, -24, -24, 48, 48); // 方帧等比绘制，内容居中
        else {
          rect(ctx, -16, -3, 32, 6, '#39d0e8');
          rect(ctx, -12, -1.5, 24, 3, '#eafcff');
        }
        ctx.restore();
        break;
      }
      case 'G': {
        const img = Assets.get('bullet_grenade');
        if (img) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(this.time * 12);
          ctx.drawImage(img, -11, -11, 22, 22);
          ctx.restore();
        } else {
          rect(ctx, b.x - 5, b.y - 5, 10, 10, '#3a5e2c');
          rect(ctx, b.x - 3, b.y - 3, 5, 5, '#5fae4a');
        }
        break;
      }
      case 'H': {
        const img = Assets.get('bullet_missile');
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        if (img) ctx.drawImage(img, -22, -22, 44, 44);
        else {
          rect(ctx, -10, -3, 18, 6, '#c8c8d8');
          rect(ctx, 6, -3, 5, 6, '#e0434b');
        }
        ctx.restore();
        break;
      }
      case 'F': {
        const t = 1 - b.life / b.maxLife;
        const frames = [0, 1, 2, 3].map((i) => Assets.get(`flame_${i}`));
        const img = frames.every(Boolean) ? frames[Math.floor(this.time * 20) % 4] : null;
        const s = 14 + t * 26;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, b.life / (b.maxLife * 0.35));
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        if (img) ctx.drawImage(img, -s * 0.6, -s * 0.6, s * 1.2, s * 1.2);
        else {
          rect(ctx, -s / 2, -s / 2, s, s, '#ff8a3a');
          rect(ctx, -s / 4, -s / 4, s / 2, s / 2, '#ffe95a');
        }
        ctx.restore();
        break;
      }
      default: {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        rect(ctx, -5, -2, 10, 4, '#ffe95a');
        rect(ctx, -2, -3, 4, 6, '#fff6c8');
        ctx.restore();
      }
    }
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    this.acc += dt;
    while (this.acc >= STEP) {
      this.update(STEP);
      this.acc -= STEP;
    }
    this.render();
  }
}

// 先加载生成素材，再启动游戏（缺失素材会自动回退代码手绘）
const bootCanvas = document.getElementById('game');
const bootCtx = bootCanvas.getContext('2d');
bootCtx.fillStyle = '#0a0812';
bootCtx.fillRect(0, 0, bootCanvas.width, bootCanvas.height);
bootCtx.fillStyle = '#ffb830';
bootCtx.font = 'bold 28px monospace';
bootCtx.textAlign = 'center';
bootCtx.fillText('STEEL ASSAULT 加载中…', bootCanvas.width / 2, bootCanvas.height / 2);

Assets.load().then(() => {
  window.__game = new Game(bootCanvas);
});
