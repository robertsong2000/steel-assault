// ===================== Boss 4：武装直升机（穿梭扫射 / 悬停投弹 / 机炮扇扫） =====================
import { CFG } from './config.js';
import { rand, clamp } from './utils.js';
import { rect } from './utils.js';
import { Assets, drawSprite } from './assets.js';
import { ebSpeed } from './enemies.js';
import { BaseBoss } from './bossbase.js';

const G = CFG.GROUND_Y;
const ARENA_LEFT = () => CFG.ARENA_WALL_X - 680;

export class HeliBoss extends BaseBoss {
  constructor() {
    super();
    this.w = 130;
    this.h = 56;
    this.x = CFG.ARENA_WALL_X - 200;
    this.y = 90;
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    // core = 尾旋翼（弱点，全额伤害）；机身命中减半
    this.core = { x: this.x + 110, y: this.y + 20, r: 18, hp: 120, max: 120 };
    this.clearText = '直升机已击落';
    this.title = '武装直升机';
    this.state = 'enter';   // enter / strafe / hover / sweep
    this.timer = 1.0;
    this.tx = this.x; this.ty = 160;   // 飞行目标点
    this.dir = -1;          // 穿梭方向
    this.sub = 0;           // 连发/投弹计数
    this.sweepA = 0;
    this.rotorT = 0;
    this.spin = 0;          // 坠毁旋转
    this.killScore = 10000;
    this.dyingBoomInterval = 0.16;
    this.dyingShake = 5;
  }

  dyingBoomPos() {
    return { x: this.x + rand(0, this.w), y: this.y + rand(0, this.h), s: rand(0.7, 1.2) };
  }

  // 失控旋转下坠
  dyingTick(dt, world) {
    this.spin += dt * 7;
    this.vy = Math.min(this.vy + CFG.GRAV * 0.6 * dt, 700);
    this.x += this.vx * 0.3 * dt;
    this.y += this.vy * dt;
  }

  // 触地提前终爆
  dyingFinished() { return this.y > G - 40 || this.dyingT > 2.6; }

  finalBoomPos() { return { x: this.x + this.w / 2, y: Math.min(this.y, G - 20) }; }

  scorePos() { return { x: this.x + this.w / 2, y: this.y + 20 }; }

  update(dt, world) {
    if (this.done) return;
    const { player, enemies, audio } = world;
    const px = player.x + CFG.PLAYER_W / 2;
    const py = player.y + player.h / 2;
    this.flash = Math.max(0, this.flash - dt);
    this.rotorT += dt;

    if (this.dead) {
      // 失控旋转下坠 → 触地爆炸
      this.updateDying(dt, world);
      return;
    }

    const speed = this.phase2 ? 1.3 : 1;
    const cd = this.phase2 ? 0.62 : 1;

    // 飞向目标点（平滑逼近）
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);
    const sp = (this.state === 'strafe' ? 300 : 170) * speed;
    if (d > 4) {
      this.vx = (dx / d) * Math.min(sp, d * 4);
      this.vy = (dy / d) * Math.min(sp, d * 4);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else {
      this.vx = 0; this.vy = 0;
    }
    this.x = clamp(this.x, ARENA_LEFT(), CFG.ARENA_WALL_X - this.w - 10);
    this.y = clamp(this.y, 70, G - 160);
    this.facing = px < this.x + this.w / 2 ? -1 : 1;

    switch (this.state) {
      case 'enter': {
        this.timer -= dt;
        if (this.timer <= 0) this.startStrafe(px);
        break;
      }
      case 'strafe': {
        // 穿梭中持续点射
        this.timer -= dt;
        if (this.timer <= 0 && !player.dead) {
          const gx = this.x + this.w / 2 + this.facing * 30;
          const gy = this.y + this.h - 6;
          enemies.fireAimed(gx, gy, px, py, ebSpeed(CFG.EBULLET_SPEED + 40));
          audio.sfx('eshoot');
          this.timer = (this.phase2 ? 0.5 : 0.7);
        }
        if (Math.abs(this.x - this.tx) < 30) {
          // 到达对侧：换招
          if (Math.random() < 0.5) this.startHover(px);
          else this.startSweep();
        }
        break;
      }
      case 'hover': {
        // 悬停玩家头顶投弹
        this.tx = clamp(px - this.w / 2, ARENA_LEFT(), CFG.ARENA_WALL_X - this.w - 10);
        this.ty = 120;
        this.timer -= dt;
        if (this.timer <= 0 && !player.dead) {
          enemies.bullets.push({
            x: this.x + this.w / 2, y: this.y + this.h,
            vx: rand(-30, 30), vy: 60, r: 7, grav: 800, kind: 'missile',
          });
          audio.sfx('launch');
          this.sub--;
          this.timer = this.sub > 0 ? 0.45 : 0;
          if (this.sub <= 0) this.startStrafe(px);
        }
        break;
      }
      case 'sweep': {
        // 机炮扇形扫射：扫过一片角度（降低密度，给走位空间）
        this.timer -= dt;
        if (this.timer <= 0 && !player.dead) {
          const gx = this.x + (this.facing < 0 ? 6 : this.w - 6);
          const gy = this.y + this.h - 8;
          this.sweepA += 0.14;
          const base = Math.atan2(py - gy, px - gx);
          for (const off of [-0.06, 0.06]) {
            const a = base + Math.sin(this.sweepA) * 0.7 + off;
            const sp = ebSpeed(270);
            enemies.bullets.push({ x: gx, y: gy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 4 });
          }
          audio.sfx('shoot');
          this.sub--;
          this.timer = 0.24;
          if (this.sub <= 0) this.startStrafe(px);
        }
        break;
      }
    }
    // 尾旋翼弱点位置（朝向后侧）
    this.core.x = this.x + (this.facing < 0 ? this.w - 14 : 14);
    this.core.y = this.y + 18;
  }

  startStrafe(px) {
    this.state = 'strafe';
    this.dir = -this.dir;
    this.tx = this.dir < 0 ? ARENA_LEFT() + 20 : CFG.ARENA_WALL_X - this.w - 30;
    this.ty = rand(120, 220);
    this.timer = 0.3;
  }

  startHover(px) {
    this.state = 'hover';
    this.sub = this.phase2 ? 4 : 3;
    this.timer = 0.4;
  }

  startSweep() {
    this.state = 'sweep';
    this.sub = this.phase2 ? 8 : 6;
    this.sweepA = 0;
    this.tx = CFG.ARENA_WALL_X - 340;
    this.ty = 150;
    this.timer = 0.5;
  }

  // 命中检测：尾旋翼 'core'（全额）/ 机身 'body'（减半），damage 用基类实现（killScore=10000）
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
    const img = Assets.get('heli');
    const bob = Math.sin(time * 5) * 2;
    ctx.save();
    if (this.dead) {
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate(this.spin * this.dir);
      ctx.translate(-cx, -cy);
    }
    if (img) {
      drawSprite(ctx, img, this.x - 14, this.y - 16 + bob, this.w + 28, this.h + 22,
        { flip: this.facing > 0, scale: this.flash > 0 ? 1.05 : 1 });
    } else {
      // ---- 代码手绘回退：武装直升机 ----
      const x = this.x, y = this.y + bob;
      const body = this.flash > 0 ? '#7a8070' : '#4a5244';
      // 机身
      rect(ctx, x + 10, y + 12, 100, 32, body);
      rect(ctx, x + 10, y + 12, 100, 6, '#6a7260');
      // 座舱玻璃
      const cx0 = this.facing < 0 ? x + 12 : x + 88;
      rect(ctx, cx0, y + 16, 30, 16, '#e88a2a');
      // 尾梁 + 尾旋翼
      const tailX = this.facing < 0 ? x + 106 : x - 6;
      rect(ctx, tailX, y + 18, 30, 10, body);
      rect(ctx, tailX + (this.facing < 0 ? 24 : 0), y + 8, 4, 24, '#2b2b33');
      // 机炮
      rect(ctx, x + (this.facing < 0 ? 0 : this.w - 10), y + 38, 14, 5, '#2b2b33');
      // 起落架
      rect(ctx, x + 24, y + 44, 6, 10, '#2b2b33');
      rect(ctx, x + 88, y + 44, 6, 10, '#2b2b33');
    }
    // 主旋翼（高速模糊）
    const rw = 150 + Math.sin(this.rotorT * 60) * 14;
    ctx.fillStyle = 'rgba(200,210,225,0.75)';
    ctx.fillRect(this.x + this.w / 2 - rw / 2, this.y - 4 + bob, rw, 3);
    ctx.restore();
    // 甲板投影
    if (!this.dead) {
      const sh = clamp(1 - (G - 160 - this.y) / 400, 0.25, 0.7);
      ctx.fillStyle = `rgba(10,16,30,${sh * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(this.x + this.w / 2, G + 4, this.w * 0.5 * sh + 20, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
