// ===================== Boss 8：核心主宰（射线 / 环爆碎片 / 闪烁传送） =====================
import { CFG } from './config.js';
import { rand, clamp } from './utils.js';
import { rect } from './utils.js';
import { Assets, drawSprite } from './assets.js';
import { ebSpeed } from './enemies.js';
import { BaseBoss } from './bossbase.js';

const G = CFG.GROUND_Y;
const ARENA_LEFT_PAD = 700;

export class CoreOverlord extends BaseBoss {
  constructor() {
    super();
    this.w = 92;
    this.h = 92;
    this.x = CFG.ARENA_WALL_X - 260;
    this.y = G - 260;
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    // core = 中央晶核（全额）；外壳命中减半
    this.core = { x: this.x + 46, y: this.y + 18, r: 18, hp: 180, max: 180 };
    this.clearText = '核心已崩解';
    this.title = '核心主宰';
    this.state = 'idle';   // idle / beam / ring / blink
    this.timer = 1.0;
    this.hoverT = 0;
    this.roared = false;
    this.killScore = 18000;
    this.dyingBoomInterval = 0.09;
    this.dyingDuration = 2.2;
  }

  dyingBoomPos() {
    return { x: this.x + rand(0, this.w), y: this.y + rand(0, this.h), s: rand(0.9, 1.7) };
  }

  dyingTick(dt) {
    this.vy = Math.min(this.vy + 380 * dt, 540);
    this.y = Math.min(this.y + this.vy * dt, G - this.h);
  }

  finalBoomPos() { return { x: this.x + this.w / 2, y: this.y + this.h / 2 }; }

  scorePos() { return { x: this.x + this.w / 2, y: this.y + 24 }; }

  update(dt, world) {
    if (this.done) return;
    const { player, particles, audio } = world;
    const px = player.x + CFG.PLAYER_W / 2;
    const py = player.y + player.h / 2;
    this.flash = Math.max(0, this.flash - dt);
    this.hoverT += dt;

    if (this.dead) {
      this.updateDying(dt, world);
      return;
    }

    if (this.phase2 && !this.roared) {
      this.roared = true;
      audio.sfx('roar');
      world.shake(12);
      particles.text(this.x + 46, this.y - 18, '崩坏!!', '#e8a0ff');
    }

    this.facing = px < this.x + this.w / 2 ? -1 : 1;
    const cd = this.phase2 ? 0.55 : 1;

    switch (this.state) {
      case 'idle': {
        this.timer -= dt;
        const ox = Math.cos(this.hoverT * 1.4) * (this.phase2 ? 36 : 24);
        this.y = G - 260 + Math.sin(this.hoverT * 1.8) * 16;
        this.x += ox * dt * 0.8;
        this.clampArena();
        if (this.timer <= 0 && !player.dead) {
          const r = Math.random();
          if (r < 0.34) this.startBlink();
          else if (r < 0.67) this.startBeam();
          else this.startRing();
        }
        break;
      }
      case 'beam': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.fireBeam(world, px, py);
          this.state = 'idle';
          this.timer = rand(0.8, 1.25) * cd;
        }
        break;
      }
      case 'ring': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.fireRing(world);
          this.state = 'idle';
          this.timer = rand(0.85, 1.3) * cd;
        }
        break;
      }
      case 'blink': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.doBlink();
          this.startBeam();
        }
        break;
      }
    }
    this.core.x = this.x + this.w / 2;
    this.core.y = this.y + 18;
  }

  startBeam() {
    this.state = 'beam';
    this.timer = 0.14;
  }

  startRing() {
    this.state = 'ring';
    this.timer = 0.18;
  }

  startBlink() {
    this.state = 'blink';
    this.timer = 0.12;
  }

  doBlink() {
    const left = CFG.ARENA_WALL_X - ARENA_LEFT_PAD;
    const right = CFG.ARENA_WALL_X - this.w - 16;
    const mid = (left + right) / 2;
    this.x = this.x < mid ? right : left;
    this.y = G - 250;
  }

  fireBeam(world, px, py) {
    const { enemies, audio } = world;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const dir = px < cx ? -1 : 1;
    const n = this.phase2 ? 2 : 1;
    const sp = ebSpeed(this.phase2 ? 440 : 360);
    for (let i = 0; i < n; i++) {
      enemies.bullets.push({
        x: cx + dir * 24,
        y: cy + (i - (n - 1) / 2) * 20,
        vx: dir * sp,
        vy: (py - cy) * 0.08,
        r: 6,
        kind: 'beam',
        life: 2.2,
      });
    }
    audio.sfx('laser');
    world.shake(5);
  }

  fireRing(world) {
    const { enemies, audio } = world;
    const n = this.phase2 ? 8 : 6;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const sp = ebSpeed(this.phase2 ? 250 : 200);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.hoverT;
      enemies.bullets.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 6,
        kind: 'shard',
        life: 2.6,
      });
    }
    audio.sfx('eshoot');
  }

  clampArena() {
    this.x = clamp(this.x, CFG.ARENA_WALL_X - ARENA_LEFT_PAD, CFG.ARENA_WALL_X - this.w - 16);
    this.y = clamp(this.y, 70, G - this.h - 40);
  }

  hitTest(b) {
    if (this.dead) return null;
    const c = this.core;
    const dx = b.x - c.x, dy = b.y - c.y;
    if (dx * dx + dy * dy <= (c.r + 4) * (c.r + 4)) return 'core';
    if (b.x > this.x && b.x < this.x + this.w && b.y > this.y && b.y < this.y + this.h) return 'body';
    return null;
  }

  draw(ctx, time) {
    if (this.done) return;
    if (this.dead && Math.floor(time * 10) % 2) return;
    const bob = Math.sin(this.hoverT * 1.8) * 3;
    const img = Assets.get('overlord');
    if (img) {
      drawSprite(ctx, img, this.x - 10, this.y - 10 + bob, this.w + 20, this.h + 20,
        { flip: this.facing > 0, scale: this.flash > 0 ? 1.04 : 1 });
    } else {
      const x = this.x, y = this.y + bob;
      const shell = this.flash > 0 ? '#c8b0e8' : '#2a1838';
      const glow = this.phase2 ? '#e8a0ff' : '#c46ae0';
      // 外环
      ctx.strokeStyle = glow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + this.w / 2, y + this.h / 2, 44, 0, Math.PI * 2);
      ctx.stroke();
      // 八角外壳
      rect(ctx, x + 18, y + 18, 56, 56, shell);
      rect(ctx, x + 26, y + 8, 40, 12, '#3a2450');
      rect(ctx, x + 26, y + 72, 40, 12, '#3a2450');
      rect(ctx, x + 8, y + 26, 12, 40, '#3a2450');
      rect(ctx, x + 72, y + 26, 12, 40, '#3a2450');
      // 中央晶核
      const pulse = 0.65 + Math.sin(time * 7) * 0.35;
      ctx.fillStyle = `rgba(232,160,255,${0.28 + pulse * 0.45})`;
      ctx.beginPath();
      ctx.arc(this.core.x, this.core.y + bob, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(this.core.x, this.core.y + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff4ff';
      ctx.beginPath();
      ctx.arc(this.core.x - 3, this.core.y + bob - 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!this.dead) {
      ctx.fillStyle = this.phase2 ? 'rgba(232,160,255,0.7)' : 'rgba(196,106,224,0.5)';
      for (let i = 0; i < 8; i++) {
        const a = time * 3.2 + i * (Math.PI / 4);
        const r = 50 + Math.sin(time * 5 + i) * 4;
        ctx.fillRect(this.x + this.w / 2 + Math.cos(a) * r - 1.5,
          this.y + this.h / 2 + Math.sin(a) * r - 1.5, 3, 3);
      }
    }
  }
}
