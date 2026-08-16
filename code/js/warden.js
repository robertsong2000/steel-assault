// ===================== Boss 7：风暴守卫（落雷 / 能量球 / 冲刺） =====================
import { CFG } from './config.js';
import { rand, clamp } from './utils.js';
import { rect } from './utils.js';
import { Assets, drawSprite } from './assets.js';
import { ebSpeed } from './enemies.js';
import { BaseBoss } from './bossbase.js';

const G = CFG.GROUND_Y;
const ARENA_LEFT_PAD = 680;

export class StormWarden extends BaseBoss {
  constructor() {
    super();
    this.w = 88;
    this.h = 96;
    this.x = CFG.ARENA_WALL_X - 260;
    this.y = G - 250;           // 悬空，不是贴地泰坦
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    // core = 面甲电核（全额）；身体命中减半
    this.core = { x: this.x + 44, y: this.y + 22, r: 20, hp: 165, max: 165 };
    this.clearText = '风暴已平息';
    this.title = '风暴守卫';
    this.state = 'idle';   // idle / bolt / volley / dash
    this.timer = 1.1;
    this.volN = 0;
    this.hoverT = 0;
    this.roared = false;
    this.killScore = 16000;
    this.dyingBoomInterval = 0.1;
    this.dyingDuration = 2.0;
  }

  dyingBoomPos() {
    return { x: this.x + rand(0, this.w), y: this.y + rand(0, this.h), s: rand(0.9, 1.6) };
  }

  dyingTick(dt) {
    this.vy = Math.min(this.vy + 420 * dt, 520);
    this.y = Math.min(this.y + this.vy * dt, G - this.h);
  }

  finalBoomPos() { return { x: this.x + this.w / 2, y: this.y + this.h / 2 }; }

  scorePos() { return { x: this.x + this.w / 2, y: this.y + 28 }; }

  update(dt, world) {
    if (this.done) return;
    const { player, enemies, particles, audio } = world;
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
      world.shake(10);
      particles.text(this.x + 44, this.y - 18, '过载!!', '#7ad0ff');
    }

    this.facing = px < this.x + this.w / 2 ? -1 : 1;
    const dist = Math.abs(px - (this.x + this.w / 2));
    const cd = this.phase2 ? 0.58 : 1;

    switch (this.state) {
      case 'idle': {
        this.timer -= dt;
        this.y = G - 250 + Math.sin(this.hoverT * 2.2) * 18;
        this.x += this.facing * (this.phase2 ? 56 : 38) * dt;
        this.clampArena();
        if (this.timer <= 0 && !player.dead) {
          if (dist > 260) this.startDash();
          else if (Math.random() < 0.55) this.startBolt();
          else this.startVolley();
        }
        break;
      }
      case 'bolt': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.dropBolts(world, px);
          this.state = 'idle';
          this.timer = rand(0.85, 1.35) * cd;
        }
        break;
      }
      case 'volley': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.fireOrb(world, px, py);
          this.volN--;
          if (this.volN > 0) this.timer = this.phase2 ? 0.18 : 0.28;
          else {
            this.state = 'idle';
            this.timer = rand(0.8, 1.25) * cd;
          }
        }
        break;
      }
      case 'dash': {
        this.x += this.facing * (this.phase2 ? 560 : 420) * dt;
        this.clampArena();
        this.timer -= dt;
        if (this.timer <= 0) {
          this.startBolt();
        }
        break;
      }
    }
    this.core.x = this.x + this.w / 2;
    this.core.y = this.y + 22;
  }

  startBolt() {
    this.state = 'bolt';
    this.timer = 0.16;
  }

  startVolley() {
    this.state = 'volley';
    this.volN = this.phase2 ? 4 : 3;
    this.timer = 0.14;
  }

  startDash() {
    this.state = 'dash';
    this.timer = 0.42;
  }

  dropBolts(world, px) {
    const { enemies, audio } = world;
    const n = this.phase2 ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const ox = (i - (n - 1) / 2) * 70;
      enemies.bullets.push({
        x: px + ox,
        y: 24 + i * 12,
        vx: 0,
        vy: ebSpeed(this.phase2 ? 420 : 340),
        r: 7,
        kind: 'bolt',
        life: 2.4,
      });
    }
    audio.sfx('laser');
    world.shake(6);
  }

  fireOrb(world, px, py) {
    const { enemies, audio } = world;
    const cx = this.x + this.w / 2 + this.facing * 28;
    const cy = this.y + 40;
    const dx = px - cx;
    const dy = py - cy;
    const d = Math.hypot(dx, dy) || 1;
    const sp = ebSpeed(this.phase2 ? 280 : 220);
    enemies.bullets.push({
      x: cx, y: cy,
      vx: (dx / d) * sp,
      vy: (dy / d) * sp,
      r: 8,
      kind: 'orb',
      life: 3.0,
    });
    audio.sfx('eshoot');
  }

  clampArena() {
    this.x = clamp(this.x, CFG.ARENA_WALL_X - ARENA_LEFT_PAD, CFG.ARENA_WALL_X - this.w - 16);
    this.y = clamp(this.y, 70, G - this.h - 40);
  }

  // 命中检测：面甲电核 'core'（全额）/ 身体 'body'（减半）；始终在场可打
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
    const bob = Math.sin(this.hoverT * 2.2) * 3;
    const img = Assets.get('warden');
    if (img) {
      drawSprite(ctx, img, this.x - 12, this.y - 8 + bob, this.w + 24, this.h + 12,
        { flip: this.facing > 0, scale: this.flash > 0 ? 1.04 : 1 });
    } else {
      const x = this.x, y = this.y + bob;
      const shell = this.flash > 0 ? '#8aa0c0' : '#2a3448';
      const glow = this.phase2 ? '#7ad0ff' : '#4aa8e0';
      // 披风
      ctx.fillStyle = '#1a2230';
      ctx.beginPath();
      ctx.moveTo(x + 18, y + 36);
      ctx.lineTo(x + (this.facing < 0 ? -8 : this.w + 8), y + 70);
      ctx.lineTo(x + 70, y + 40);
      ctx.closePath();
      ctx.fill();
      // 躯干
      rect(ctx, x + 16, y + 28, 56, 48, shell);
      rect(ctx, x + 16, y + 28, 56, 6, '#3a4a62');
      // 臂
      rect(ctx, x + 4, y + 34, 14, 36, shell);
      rect(ctx, x + 70, y + 34, 14, 36, shell);
      // 头 / 面甲
      rect(ctx, x + 26, y + 4, 36, 28, shell);
      const pulse = 0.65 + Math.sin(time * 8) * 0.35;
      ctx.fillStyle = `rgba(120,210,255,${0.3 + pulse * 0.45})`;
      ctx.beginPath();
      ctx.arc(this.core.x, this.core.y + bob, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(this.core.x, this.core.y + bob, 8, 0, Math.PI * 2);
      ctx.fill();
      // 眼缝
      rect(ctx, x + 32, y + 16, 24, 5, glow);
      // 靴
      rect(ctx, x + 20, y + 76, 18, 16, '#1c2432');
      rect(ctx, x + 50, y + 76, 18, 16, '#1c2432');
    }
    if (this.phase2 && !this.dead) {
      ctx.fillStyle = 'rgba(120,210,255,0.55)';
      for (let i = 0; i < 6; i++) {
        const a = time * 5 + i * 1.05;
        ctx.fillRect(this.x + this.w / 2 + Math.cos(a) * 52, this.y + 40 + Math.sin(a) * 36, 3, 3);
      }
    }
  }
}
