// ===================== 主循环：状态机 / 镜头 / 碰撞调度 =====================
import { CFG, SCORE } from './config.js';
import { clamp, rand, overlap, rect } from './utils.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { Particles } from './particles.js';
import { LEVEL, groundTopAt, drawBackground, drawTerrain } from './level.js';
import { EnemyManager } from './enemies.js';
import { Player } from './player.js';
import { Boss } from './boss.js';
import { drawHUD, drawTitle, drawPause, drawGameOver, drawVictory } from './hud.js';
import { Assets } from './assets.js';

const STEP = 1 / 60;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.input = new Input();
    this.audio = new AudioSys();
    this.particles = new Particles();
    this.enemies = new EnemyManager();
    this.player = new Player();

    this.state = 'title';
    this.time = 0;
    this.playTime = 0;
    this.camX = 0;
    this.score = 0;
    this.hi = +(localStorage.getItem('steel_assault_hi') || 0);
    this.shakeT = 0;
    this.konami = false;
    this.boss = null;
    this.bossBanner = 0;
    this.bullets = [];

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
    };

    this.acc = 0;
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    this.audio.ensure();
    this.score = 0;
    this.playTime = 0;
    this.camX = 0;
    this.boss = null;
    this.bossBanner = 0;
    this.bullets.length = 0;
    this.particles.clear();
    this.enemies.clear();
    this.player.reset(this.konami ? 30 : CFG.START_LIVES);
    // 固定敌人
    for (const t of LEVEL.turrets) this.enemies.spawnTurret(t.x, t.y);
    for (const s of LEVEL.snipers) this.enemies.spawnSniper(s.x, s.y);
    // 触发器复位
    this.triggers = LEVEL.triggers.map((t) => ({ ...t, fired: false }));
    this.state = 'playing';
    this.audio.playJingle('start');
    this.audio.startBGM('level');
  }

  addScore(n, x, y) {
    this.score += n;
    if (x !== undefined) this.particles.text(x, y - 10, `+${n}`);
    if (this.score > this.hi) {
      this.hi = this.score;
      localStorage.setItem('steel_assault_hi', String(this.hi));
    }
  }

  shake(n) {
    this.shakeT = Math.max(this.shakeT, n / 60);
  }

  onPitDeath() {
    if (this.player.dead) return;
    this.player.lives--;
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
      this.audio.sfx('hit');
      this.shake(10);
      this.particles.explosion(this.player.x + 13, this.player.y + 20, 0.8);
    }
  }

  respawn() {
    const sx = clamp(this.player.lastSafe.x, this.camX + 30, this.camX + CFG.W - 200);
    const top = groundTopAt(sx + CFG.PLAYER_W / 2);
    this.player.respawn(sx, (top ?? CFG.GROUND_Y) - CFG.PLAYER_H);
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

    switch (this.state) {
      case 'title':
        if (this.input.wasPressed('start')) { this.audio.sfx('select'); this.start(); }
        break;

      case 'playing':
        if (this.input.wasPressed('start')) { this.state = 'paused'; this.audio.sfx('select'); break; }
        this.playTime += dt;
        this.bossBanner = Math.max(0, this.bossBanner - dt);
        this.world.camX = this.camX;
        this.world.time = this.time;

        this.player.update(dt, this.input, this.world);
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
        // Boss 触发
        if (!this.boss && this.player.x > CFG.BOSS_TRIGGER_X) {
          this.boss = new Boss();
          this.bossBanner = 2.4;
          this.audio.startBGM('boss');
          this.shake(6);
        }
        if (this.boss && this.boss.done && this.state === 'playing') this.victory();
        break;

      case 'paused':
        if (this.input.wasPressed('start')) { this.state = 'playing'; this.audio.sfx('select'); }
        break;

      case 'gameover':
      case 'victory':
        this.particles.update(dt);
        if (this.input.wasPressed('start')) { this.state = 'title'; this.konami = false; this.audio.sfx('select'); }
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
      }
    }
  }

  updateCamera() {
    const maxCam = LEVEL.width - CFG.W;
    const target = this.player.x - CFG.W * 0.42;
    if (target > this.camX) this.camX = Math.min(target, maxCam);
  }

  updateBullets(dt) {
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < this.camX - 40 || b.x > this.camX + CFG.W + 40 || b.y < -40 || b.y > CFG.H + 40) b.remove = true;
    }
    // 子弹 vs 敌人
    for (const b of this.bullets) {
      if (b.remove) continue;
      const br = { x: b.x - 4, y: b.y - 4, w: 8, h: 8 };
      for (const e of this.enemies.list) {
        if (overlap(br, e)) {
          this.enemies.damage(e, 1, this.world);
          this.particles.sparks(b.x, b.y, 5, '#ffe0a0');
          b.remove = true;
          break;
        }
      }
    }
    // 子弹 vs Boss
    if (this.boss && !this.boss.done) {
      for (const b of this.bullets) {
        if (b.remove) continue;
        const part = this.boss.hitTest(b);
        if (part) {
          this.boss.damage(part, 1, this.world);
          this.particles.sparks(b.x, b.y, 5, '#ffd0a0');
          b.remove = true;
        }
      }
    }
    // 子弹 vs 地形
    for (const b of this.bullets) {
      if (b.remove) continue;
      for (const s of LEVEL.solids) {
        if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h) {
          this.particles.sparks(b.x, b.y, 4, '#c8c8d8');
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
    if (p.inv <= 0) {
      for (const b of this.enemies.bullets) {
        if (overlap({ x: b.x - 4, y: b.y - 4, w: 8, h: 8 }, pr)) {
          this.killPlayer();
          return;
        }
      }
      // 敌人撞击
      for (const e of this.enemies.list) {
        if (e.type === 'runner' && overlap(e, pr)) {
          this.killPlayer();
          return;
        }
      }
    }
    // 道具拾取
    for (const pw of this.enemies.powerups) {
      if (overlap(pw, pr)) {
        pw.remove = true;
        p.weapon = pw.kind;
        this.audio.sfx('powerup');
        this.addScore(SCORE.powerup, pw.x, pw.y);
        this.particles.text(pw.x + 14, pw.y - 24, pw.kind === 'S' ? '散弹枪!' : '机枪!', '#6aff8a');
      }
    }
    this.enemies.powerups = this.enemies.powerups.filter((pw) => !pw.remove);
  }

  // ---------------- 绘制 ----------------
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CFG.W, CFG.H);

    if (this.state === 'title') {
      drawTitle(ctx, this.time, this.konami);
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
    // 玩家子弹
    for (const b of this.bullets) {
      rect(ctx, b.x - 5, b.y - 2, 10, 4, '#ffe95a');
      rect(ctx, b.x - 2, b.y - 3, 4, 6, '#fff6c8');
    }
    this.player.draw(ctx, this.time);
    this.particles.draw(ctx);
    ctx.restore();

    // HUD
    drawHUD(ctx, this);
    if (this.state === 'paused') drawPause(ctx);
    else if (this.state === 'gameover') drawGameOver(ctx, this.score, this.hi);
    else if (this.state === 'victory') drawVictory(ctx, this.score, this.playTime);
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
