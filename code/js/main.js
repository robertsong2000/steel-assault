// ===================== 主循环：状态机 / 镜头 / 碰撞调度 =====================
import { CFG, DIFFS, LEVEL_MUSIC } from './config.js';
import { clamp, rand, rect, bigText, loadSave, saveGame, resetGameSave, setAccessibility, ACCESSIBILITY, seededRandom } from './utils.js';
import { Input, rebindKey, resetKeybinds } from './input.js';
import { setupTouch } from './touch.js';
import { AudioSys } from './audio.js';
import { Particles } from './particles.js';
import { LEVEL, LEVELS, setLevel, groundTopAt, drawBackground, drawTerrain, laserActive, updateLevelDynamics } from './level.js';
import { EnemyManager } from './enemies.js';
import { Player } from './player.js';
import { Boss } from './boss.js';
import { BOSS_CLASSES } from './bosses.js';
import { drawHUD, drawTitle, drawPause, drawGameOver, drawVictory, drawStageBanner, drawSettings, REBIND_ACTIONS } from './hud.js';
import { Assets } from './assets.js';
import { statRow } from './combat.js';
import { CombatSystem } from './combat-system.js';

const STEP = 1 / 60;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.input = new Input();
    document.addEventListener('visibilitychange', () => this.pauseForBackground());
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
    const save = loadSave();
    this.accessibility = { ...ACCESSIBILITY, ...(save.accessibility || {}) };
    setAccessibility(this.accessibility);
    this.hi = save.hi;
    this.shakeT = 0;
    this.hitStop = 0;   // 打击顿帧（秒）
    this.debug = new URLSearchParams(location.search).has('debug');
    this.frameMs = 0;
    this.perfBudget = 'ok';
    this.bossHint = '';
    this.bossHintT = 0;
    this.konami = false;
    this.boss = null;
    this.bossBanner = 0;
    this.bossHint = '';
    this.bossHintT = 0;
    this.bullets = [];
    this.levelIdx = 0;
    this.unlocked = clamp(Math.round(save.unlocked), 0, LEVELS.length - 1);
    this.difficulty = clamp(Math.round(save.difficulty), 0, DIFFS.length - 1);
    this.stats = { kills: 0, shots: 0, hits: 0, deaths: 0, weapons: {} };
    this.campaign = { totalTime: 0, levels: [], newGamePlus: false };
    this.challengeIndex = 0;
    this.challenge = null;
    this.nativeRandom = Math.random;
    // 设置界面：sel=选中项（0-2 音量 / 3-10 键位 / 11 恢复默认 / 12 返回），capture=重绑捕获中的动作
    this.settings = { sel: 0, capture: null };

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
      accessibility: this.accessibility,
    };
    this.combat = new CombatSystem(this);

    this.acc = 0;
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  // 逻辑坐标始终保持 960×540，背板按设备像素比放大，避免 Retina 画面发虚。
  resizeCanvas() {
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const width = Math.round(CFG.W * dpr), height = Math.round(CFG.H * dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  pauseForBackground() {
    if (!document.hidden || this.state !== 'playing') return;
    this.state = 'paused';
    this.input.clear();
    this.audio.ctx?.suspend();
  }

  start(keepRun = false) {
    this.audio.ensure();
    setLevel(this.levelIdx);
    // 关卡资源独立加载：公共资源已在启动阶段加载，进入玩法前等待主题素材就绪。
    this.levelReady = false;
    const levelLoad = Assets.load(Assets.levelNames(LEVEL));
    this.levelLoadPromise = levelLoad.then(() => {
      this.levelReady = true;
      if (this.state === 'loading') {
        this.state = 'playing';
        this.audio.startBGM('level', LEVEL_MUSIC[this.levelIdx] || {});
      }
    });
    if (this.challengeIndex > 0) {
      const rules = [
        { name: '铁人挑战', lives: 1, weapon: 'R', seed: 240810 },
        { name: '单武器挑战', lives: 3, weapon: 'L', seed: 240811 },
        { name: 'Boss Rush', lives: 2, weapon: 'R', seed: 240812, bossRush: true },
      ][this.challengeIndex - 1];
      this.challenge = { ...rules };
      Math.random = seededRandom(this.challenge.seed);
    } else {
      this.challenge = null;
      Math.random = this.nativeRandom;
    }
    if (!keepRun) {   // 连关时保留分数与战绩，整场战役累计计分
      this.score = 0;
      this.stats = { kills: 0, shots: 0, hits: 0, deaths: 0, weapons: {} };
      this.world.stats = this.stats;
      this.campaign = { totalTime: 0, levels: [], newGamePlus: this.campaign.newGamePlus };
    }
    this.playTime = 0;
    this.camX = 0;
    this.boss = null;
    this.bossBanner = 0;
    this.bullets.length = 0;
    this.particles.clear();
    this.enemies.clear();
    this.player.reset(this.challenge?.lives || (this.konami ? 30 : DIFFS[this.difficulty].lives));
    if (this.challenge?.weapon) this.player.weapon = this.challenge.weapon;
    if (this.challenge?.bossRush) this.player.x = CFG.BOSS_TRIGGER_X + 1;
    CFG.DIFF_MUL = DIFFS[this.difficulty].mul;
    // 固定敌人
    for (const t of LEVEL.turrets) this.enemies.spawnTurret(t.x, t.y);
    for (const s of LEVEL.snipers) this.enemies.spawnSniper(s.x, s.y);
    for (const g of LEVEL.grenadiers || []) this.enemies.spawnGrenadier(g.x, g.y);
    for (const g of LEVEL.bombers || []) this.enemies.spawnBomber(g.x, g.y);
    for (const s of LEVEL.shielders || []) this.enemies.spawnShielder(s.x, s.y);
    for (const m of LEVEL.mortars || []) this.enemies.spawnMortar(m.x, m.y);
    for (const b of LEVEL.patrolbots || []) this.enemies.spawnPatrolbot(b.x, b.y);
    for (const wm of LEVEL.sandworms || []) this.enemies.spawnSandworm(wm.x, CFG.GROUND_Y);
    // 触发器复位
    this.triggers = LEVEL.triggers.map((t) => ({ ...t, fired: false }));
    this.stageBanner = 2.4;   // 关卡名横幅
    this.state = 'loading';
    this.audio.playJingle('start');
  }

  addScore(n, x, y) {
    this.score += n;
    if (x !== undefined) this.particles.text(x, y - 10, `+${n}`);
    if (this.score > this.hi) {
      this.hi = this.score;
      saveGame((save) => { save.hi = this.hi; });
    }
  }

  recordHit(b) {
    // 一枚穿透/爆炸子弹命中多个目标时，只计一次命中，保证 hits <= shots。
    if (b.hitCounted) return;
    b.hitCounted = true;
    this.stats.hits++;
    const row = this.stats.weapons?.[b.type];
    if (row) row.hits++;
  }

  recordKill(e, weapon = e?.lastHitWeapon || this.player.weapon) {
    this.stats.kills++;
    const row = this.stats.weapons?.[weapon];
    if (row) row.kills++;
  }

  shake(n) {
    if (!this.accessibility.shake) return;
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
    if (this.challenge?.weapon) this.player.weapon = this.challenge.weapon;
  }

  gameOver() {
    this.state = 'gameover';
    this.audio.stopBGM();
    this.audio.playJingle('defeat');
  }

  victory() {
    this.state = 'victory';
    this.campaign.levels.push({ level: this.levelIdx, score: this.score, time: this.playTime, deaths: this.stats.deaths });
    this.audio.stopBGM();
    this.audio.playJingle('victory');
  }

  // ---------------- 更新 ----------------
  update(dt) {
    this.time += dt;
    this.frameMs = this.frameMs * 0.9 + dt * 1000 * 0.1;
    if (this.debug) this.perfBudget = this.frameMs > 33.3 ? 'critical' : this.frameMs > 16.7 ? 'slow' : 'ok';
    this.input.pollGamepad();   // 手柄轮询：注入动作层输入
    if (this.input.wasPressed('mute')) this.audio.toggleMute();
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.bossHintT = Math.max(0, this.bossHintT - dt);

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
          saveGame((save) => { save.difficulty = this.difficulty; });
          this.audio.ensure(); this.audio.sfx('select');
        }
        if (this.input.wasPressed('challenge')) {
          this.challengeIndex = (this.challengeIndex + 1) % 4;
          this.audio.ensure(); this.audio.sfx('select');
        }
        // settings 与 start 同帧互斥（设置优先），防同帧双触发
        if (this.input.wasPressed('settings')) {
          this.state = 'settings';
          this.settings.sel = 0;
          this.settings.capture = null;
          this.audio.ensure(); this.audio.sfx('select');
        } else if (this.input.wasPressed('start')) { this.audio.sfx('select'); this.start(); }
        break;
      }

      case 'loading':
        // 资源 Promise 完成后切换到 playing；此状态避免半加载素材进入可操作流程。
        break;

      case 'settings':
        this.updateSettings();
        break;

      case 'playing':
        if (this.input.wasPressed('start')) {
          this.state = 'paused';
          this.audio.sfx('select');
          this.audio.ctx?.suspend();   // 暂停挂起音频
          break;
        }
        this.playTime += dt;
        this.campaign.totalTime += dt;
        const currentWeapon = statRow(this.stats, this.player.weapon);
        currentWeapon.time += dt;
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
        if (this.boss) this.boss.update(dt * (DIFFS[this.difficulty].bossSpeed || 1), this.world);

        this.fireTriggers();
        this.updateCamera();
        this.combat.updateBullets(dt);
        this.combat.checkCollisions();
        this.particles.update(dt);

        // 玩家死亡结算
        if (this.player.dead && this.player.deathT > 1.4) {
          if (this.player.lives > 0) this.respawn();
          else this.gameOver();
        }
        // Boss 触发（按关卡配置选 Boss）
        if (!this.boss && this.player.x > CFG.BOSS_TRIGGER_X) {
          this.boss = new (BOSS_CLASSES[LEVEL.boss] || Boss)();
          this.boss.applyDifficulty?.(DIFFS[this.difficulty]);
          this.bossHint = {
            fortress: '提示：保持移动，炮台齐射时跳跃躲避。',
            yeti: '提示：看到雪球预警后跳起，空中射击弱点。',
            mech: '提示：激光门启动时蹲下或跳过红色光束。',
            heli: '提示：侧移躲避扇形弹幕，优先攻击核心。',
            beast: '提示：跳过冲击波，别站在巨兽正下方。',
            titan: '提示：躲开冲锋撞击，泰坦沉入岩浆时是无敌的。',
            drill: '提示：钻地出土会形成冲击圈，及时拉开距离。',
            warden: '提示：侧风会改变跳跃轨迹，贴近地面调整位置。',
            overlord: '提示：多阶段攻击间隙很短，留好护盾与补给。',
          }[LEVEL.boss] || '';
          this.bossHintT = 5;
          this.bossSupplyT = 12;   // Boss 战补给倒计时
          this.bossBanner = 2.4;
          this.audio.startBGM('boss');
          if (LEVEL.boss === 'yeti') this.audio.sfx('roar');
          this.shake(6);
        }
        if (this.boss && this.boss.done && this.state === 'playing') this.victory();
        // Boss 战补给：每 18 秒一架随机补给无人机
        if (this.boss && !this.boss.done && !this.boss.dead) {
          this.bossSupplyT -= dt * (DIFFS[this.difficulty].supply || 1);
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

      case 'settings':
        this.updateSettings();
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
            this.unlocked = Math.max(this.unlocked, this.levelIdx + 1);
            saveGame((save) => { save.unlocked = this.unlocked; });
            this.levelIdx++;
            this.start(true);  // 连关：直接进入下一关（分数/战绩累计）
          } else {
            if (this.input.pressed.has('KeyN')) {
              this.campaign.newGamePlus = true;
              this.difficulty = Math.min(DIFFS.length - 1, this.difficulty + 1);
              this.unlocked = LEVELS.length - 1;
              this.levelIdx = 0;
              saveGame((save) => { save.difficulty = this.difficulty; save.unlocked = this.unlocked; });
              this.start(false);
            } else {
              this.state = 'title'; this.konami = false;
            }
          }
        }
        break;
    }
    this.input.endFrame();
  }

  // ---------------- 设置界面 ----------------
  updateSettings() {
    const s = this.settings;
    // 重绑捕获态：下一次按键替换该动作主键，ESC 取消
    if (s.capture) {
      if (this.input.pressed.has('Escape')) {
        s.capture = null;
      } else if (this.input.pressed.size) {
        rebindKey(s.capture, [...this.input.pressed][0]);
        s.capture = null;
      }
      if (!s.capture) { this.audio.ensure(); this.audio.sfx('select'); }
      return;
    }
    const ACCESS_ROWS = ['shake', 'flashes', 'particles', 'textScale', 'contrast'];
    const KEY_OFFSET = 3 + ACCESS_ROWS.length;
    const ITEMS = KEY_OFFSET + REBIND_ACTIONS.length + 3;
    if (this.input.wasPressed('up')) { s.sel = (s.sel + ITEMS - 1) % ITEMS; this.audio.ensure(); this.audio.sfx('select'); }
    if (this.input.wasPressed('down')) { s.sel = (s.sel + 1) % ITEMS; this.audio.ensure(); this.audio.sfx('select'); }
    // 退出：设置键 / ESC 随时返回标题
    if (this.input.wasPressed('settings') || this.input.pressed.has('Escape')) {
      this.state = 'title';
      this.audio.sfx('select');
      return;
    }
    if (s.sel < 3) {
      // 音量行：←→ 步进 10%（ENTER 也当 +10%），立即生效 + 试听
      const VOL_PROPS = ['volMaster', 'volSfx', 'volBgm'];
      const VOL_SETTERS = ['setMasterVol', 'setSfxVol', 'setBgmVol'];
      let d = 0;
      if (this.input.wasPressed('left')) d = -0.1;
      if (this.input.wasPressed('right') || this.input.wasPressed('start')) d = 0.1;
      if (d) {
        this.audio[VOL_SETTERS[s.sel]](this.audio[VOL_PROPS[s.sel]] + d);
        this.audio.ensure(); this.audio.sfx('select');
      }
    } else if (s.sel < KEY_OFFSET) {
      const key = ACCESS_ROWS[s.sel - 3];
      if (this.input.wasPressed('left') || this.input.wasPressed('right') || this.input.wasPressed('start')) {
        if (key === 'particles') this.accessibility.particles = this.accessibility.particles === 'high' ? 'low' : this.accessibility.particles === 'low' ? 'off' : 'high';
        else if (key === 'textScale') this.accessibility.textScale = this.accessibility.textScale === 1 ? 1.25 : 1;
        else this.accessibility[key] = !this.accessibility[key];
        setAccessibility(this.accessibility);
        saveGame((save) => { save.accessibility = { ...this.accessibility }; });
        this.audio.ensure(); this.audio.sfx('select');
      }
    } else if (s.sel < KEY_OFFSET + REBIND_ACTIONS.length) {
      // 键位行：ENTER/→ 进入捕获态
      if (this.input.wasPressed('right') || this.input.wasPressed('start')) {
        s.capture = REBIND_ACTIONS[s.sel - KEY_OFFSET][0];
      }
    } else if (s.sel === ITEMS - 3) {
      // 恢复默认键位
      if (this.input.wasPressed('right') || this.input.wasPressed('start')) {
        resetKeybinds();
        this.audio.ensure(); this.audio.sfx('select');
      }
    } else if (s.sel === ITEMS - 2) {
      if (this.input.wasPressed('right') || this.input.wasPressed('start')) {
        this.unlocked = 0;
        this.levelIdx = 0;
        saveGame((save) => { save.unlocked = 0; });
        this.audio.ensure(); this.audio.sfx('select');
      }
    } else if (this.input.wasPressed('right') || this.input.wasPressed('start')) {
      // 返回标题
      this.state = 'title';
      this.audio.sfx('select');
    }
  }

  resetAllSaveData() {
    const save = resetGameSave();
    this.hi = save.hi;
    this.difficulty = save.difficulty;
    this.unlocked = save.unlocked;
    this.levelIdx = 0;
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
        else if (t.type === 'snowballs') this.enemies.spawnSnowballs(t.n, t.dir, this.camX);
        else if (t.type === 'paras') this.enemies.spawnParas(t.n, this.camX);
        else if (t.type === 'patrolbots') this.enemies.spawnPatrolbots(t.n, t.dir, this.camX);
      }
    }
  }

  updateCamera() {
    const maxCam = LEVEL.width - CFG.W;
    const target = this.player.x - CFG.W * 0.42;
    if (target > this.camX) this.camX = Math.min(target, maxCam);
  }

  // 兼容工具和外部调试入口；实际实现由 CombatSystem 持有。
  updateBullets(dt) { this.combat.updateBullets(dt); }
  checkCollisions() { this.combat.checkCollisions(); }

  // ---------------- 绘制 ----------------
  render() {
    const ctx = this.ctx;
    ctx.filter = this.accessibility.contrast ? 'contrast(1.35) saturate(1.15)' : 'none';
    ctx.clearRect(0, 0, CFG.W, CFG.H);

    if (this.state === 'title') {
      drawTitle(ctx, this.time, this.konami, {
        levels: LEVELS, levelIdx: this.levelIdx, unlocked: this.unlocked,
        diffName: DIFFS[this.difficulty].name,
        challenge: this.challengeIndex,
      });
      return;
    }

    if (this.state === 'settings') {
      drawSettings(ctx, this);
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
    if ((this.state === 'playing' || this.state === 'loading') && this.stageBanner > 0) drawStageBanner(ctx, LEVEL.name, this.stageBanner);
    if (this.state === 'loading') bigText(ctx, '加载关卡资源…', CFG.W / 2, 330, 24, '#d7f5ff');
    if (this.state === 'paused') drawPause(ctx, this);
    else if (this.state === 'settings') drawSettings(ctx, this);
    else if (this.state === 'gameover') drawGameOver(ctx, this.score, this.hi);
    else if (this.state === 'victory') drawVictory(ctx, this.score, this.playTime, this.levelIdx < LEVELS.length - 1, this.boss?.clearText || '要塞已摧毁', this.stats, this.campaign);
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
const bootStatus = document.getElementById('bootStatus');
const bootRetry = document.getElementById('bootRetry');
const setBootStatus = ({ loaded, total, failed = 0 }) => {
  if (!bootStatus) return;
  const failedCount = Array.isArray(failed) ? failed.length : failed;
  bootStatus.textContent = `加载资源：${loaded}/${total}${failedCount ? `（${failedCount} 个将使用手绘回退）` : ''}`;
  bootStatus.className = failedCount ? 'warn' : '';
};
bootCtx.fillStyle = '#0a0812';
bootCtx.fillRect(0, 0, bootCanvas.width, bootCanvas.height);
bootCtx.fillStyle = '#ffb830';
bootCtx.font = 'bold 28px monospace';
bootCtx.textAlign = 'center';
bootCtx.fillText('STEEL ASSAULT 加载中…', bootCanvas.width / 2, bootCanvas.height / 2);

const boot = () => Assets.load(Assets.commonNames(), setBootStatus)
  .then((result) => {
    window.__game ??= new Game(bootCanvas);
    if (result.failed.length) {
      setBootStatus(result);
      bootRetry.hidden = false;
    } else if (bootStatus) {
      bootStatus.textContent = '';
      bootRetry.hidden = true;
    }
  })
  .catch((error) => {
    if (bootStatus) {
      bootStatus.textContent = `启动失败：${error.message || '未知错误'}。请刷新页面后重试。`;
      bootStatus.className = 'error';
    }
  });

bootRetry?.addEventListener('click', () => {
  bootRetry.disabled = true;
  Assets.retryFailed(setBootStatus).then((result) => {
    bootRetry.hidden = result.failed.length === 0;
    bootRetry.disabled = false;
  });
});
boot();
