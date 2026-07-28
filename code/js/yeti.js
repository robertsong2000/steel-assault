// ===================== Boss 2：雪怪 Yeti（跳扑 / 冰晶冲击波 / 掷冰岩） =====================
import { CFG } from './config.js';
import { rand, clamp } from './utils.js';
import { rect } from './utils.js';
import { Assets, drawSprite } from './assets.js';
import { ebSpeed } from './enemies.js';
import { BaseBoss } from './bossbase.js';

const G = CFG.GROUND_Y;

export class YetiBoss extends BaseBoss {
  constructor() {
    super();
    this.w = 84;
    this.h = 96;
    this.x = CFG.ARENA_WALL_X - 220;
    this.y = G - this.h;
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    // core 兼作弱点判定 / 追踪弹目标 / HUD 血条数据源
    this.core = { x: this.x + 42, y: this.y + 44, r: 40, hp: 110, max: 110 };
    this.state = 'idle';   // idle / jump / throw / slam
    this.clearText = '雪怪已讨伐';
    this.title = '雪怪 Yeti';
    this.timer = 1.4;
    this.throwN = 0;
    this.roared = false;   // 二阶段怒吼只放一次
    this.dyingBoomInterval = 0.11;
  }

  dyingBoomPos() {
    return { x: this.x + rand(-10, this.w + 10), y: this.y + rand(0, this.h), s: rand(0.8, 1.4) };
  }

  update(dt, world) {
    if (this.done) return;
    const { player, enemies, particles, audio } = world;
    const px = player.x + CFG.PLAYER_W / 2;
    const py = player.y + player.h / 2;
    this.flash = Math.max(0, this.flash - dt);

    if (this.dead) {
      // 连锁爆炸演出
      this.updateDying(dt, world);
      return;
    }

    // 二阶段怒吼
    if (this.phase2 && !this.roared) {
      this.roared = true;
      audio.sfx('roar');
      world.shake(10);
      particles.text(this.x + 42, this.y - 20, '狂暴!!', '#ff6a50');
    }

    this.facing = px < this.x + this.w / 2 ? -1 : 1;
    const dist = Math.abs(px - (this.x + this.w / 2));
    const speedUp = this.phase2 ? 0.65 : 1;   // 二阶段冷却缩短

    switch (this.state) {
      case 'idle': {
        this.timer -= dt;
        // 缓慢逼近玩家（保持压迫感）
        this.x += this.facing * (this.phase2 ? 46 : 30) * dt;
        this.clampArena();
        if (this.timer <= 0 && !player.dead) {
          if (dist > 400) this.startJump(px);
          else if (dist > 150) this.startThrow();
          else this.state = 'slam', this.timer = 0.38;
        }
        break;
      }
      case 'jump': {
        this.vy += CFG.GRAV * 0.85 * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.clampArena();
        if (this.y >= G - this.h) {
          // 落地：冰晶冲击波（双向，跳起躲避）
          this.y = G - this.h;
          this.vx = 0;
          this.vy = 0;
          const wv = ebSpeed(this.phase2 ? 320 : 260);
          enemies.bullets.push({ x: this.x + 10, y: G - 6, vx: -wv, vy: 0, r: 12, kind: 'wave', life: 2.4 });
          enemies.bullets.push({ x: this.x + this.w - 10, y: G - 6, vx: wv, vy: 0, r: 12, kind: 'wave', life: 2.4 });
          audio.sfx('boom');
          world.shake(12);
          particles.explosion(this.x + this.w / 2, G - 10, 0.9);
          this.state = 'idle';
          this.timer = rand(0.9, 1.4) * speedUp;
        }
        break;
      }
      case 'throw': {
        this.timer -= dt;
        if (this.timer <= 0) {
          const cx = this.x + this.w / 2 + this.facing * 30;
          const cy = this.y + 20;
          const dx = px - cx;
          const T = rand(1.1, 1.5), g = 1000;
          enemies.bullets.push({
            x: cx, y: cy,
            vx: dx / T + rand(-40, 40),
            vy: (py - cy - 0.5 * g * T * T) / T,
            r: 9, grav: g, kind: 'ice',
          });
          audio.sfx('eshoot');
          this.throwN--;
          if (this.throwN > 0) this.timer = 0.45;
          else { this.state = 'idle'; this.timer = rand(1.0, 1.6) * speedUp; }
        }
        break;
      }
      case 'slam': {
        this.timer -= dt;
        if (this.timer <= 0) {
          // 近战重击：正面短程冲击弹（瞬时）
          enemies.bullets.push({
            x: this.x + this.w / 2 + this.facing * 60, y: G - 24,
            vx: this.facing * 200, vy: 0, r: 16, kind: 'wave', life: 0.28,
          });
          audio.sfx('boom');
          world.shake(7);
          this.state = 'idle';
          this.timer = rand(0.8, 1.2) * speedUp;
        }
        break;
      }
    }
    this.core.x = this.x + this.w / 2;
    this.core.y = this.y + 44;
  }

  startJump(px) {
    this.state = 'jump';
    // 按滞空时间解算水平速度，落点瞄准玩家
    const T = 0.85;
    this.vy = -CFG.GRAV * 0.85 * T * 0.62;
    this.vx = clamp((px - (this.x + this.w / 2)) / T, -420, 420);
  }

  startThrow() {
    this.state = 'throw';
    this.throwN = this.phase2 ? 3 : 2;
    this.timer = 0.3;
  }

  clampArena() {
    // 活动范围：Boss 墙左侧 640px 的竞技场
    this.x = clamp(this.x, CFG.ARENA_WALL_X - 660, CFG.ARENA_WALL_X - this.w - 16);
  }

  // 子弹命中检测：返回 'core' / null（接口与 Boss 一致）
  hitTest(b) {
    if (this.dead) return null;
    if (b.x > this.x - 6 && b.x < this.x + this.w + 6 && b.y > this.y - 6 && b.y < this.y + this.h + 6) return 'core';
    return null;
  }

  damage(part, dmg, world) {
    if (part !== 'core' || this.dead) return;
    this.core.hp -= dmg;
    this.flash = 0.08;
    world.audio.sfx('bossHit');
    if (this.core.hp <= 0) {
      this.dead = true;
      this.dyingT = 0;
      world.addScore(5000, this.core.x, this.core.y);
    }
  }

  draw(ctx, time) {
    if (this.done) return;
    const img = Assets.get('yeti');
    const flash = this.flash > 0;
    const bob = this.state === 'idle' ? Math.sin(time * 3) * 3 : 0;
    if (this.dead) {
      // 死亡倒地闪烁
      if (Math.floor(time * 10) % 2) return;
    }
    if (img) {
      drawSprite(ctx, img, this.x - 22, this.y - 14 + bob, this.w + 44, this.h + 14, { flip: this.facing > 0, scale: flash ? 1.05 : 1 });
    } else {
      // ---- 代码手绘回退：白色雪怪 ----
      const x = this.x, y = this.y + bob;
      const fur = flash ? '#ffffff' : '#e8eef6';
      const shade = '#b8c8dc';
      // 腿
      rect(ctx, x + 14, y + 70, 20, 26, shade);
      rect(ctx, x + 50, y + 70, 20, 26, shade);
      // 身体（魁梧）
      rect(ctx, x + 4, y + 22, 76, 56, fur);
      rect(ctx, x + 4, y + 22, 76, 10, '#f6fafd');
      // 手臂（长臂）
      const armSwing = this.state === 'slam' ? 16 : Math.sin(time * 3) * 4;
      rect(ctx, x - 8, y + 30 + armSwing, 16, 44, fur);
      rect(ctx, x + 76, y + 30 - armSwing, 16, 44, fur);
      rect(ctx, x - 8, y + 68 + armSwing, 16, 8, '#8a4a3a');   // 爪
      rect(ctx, x + 76, y + 68 - armSwing, 16, 8, '#8a4a3a');
      // 头
      rect(ctx, x + 22, y - 2, 40, 28, fur);
      // 角
      rect(ctx, x + 18, y - 10, 10, 10, '#3a5a8c');
      rect(ctx, x + 56, y - 10, 10, 10, '#3a5a8c');
      // 眼睛（二阶段更红更亮）
      const eye = this.phase2 ? '#ff2a1a' : '#e04a3a';
      const ex = this.facing > 0 ? 46 : 26;
      rect(ctx, x + ex, y + 8, 8, 5, eye);
      rect(ctx, x + ex - this.facing * 14, y + 8, 8, 5, eye);
      // 獠牙
      rect(ctx, x + 30, y + 22, 5, 6, '#ffffff');
      rect(ctx, x + 49, y + 22, 5, 6, '#ffffff');
    }
    // 二阶段寒气环绕
    if (this.phase2 && !this.dead) {
      ctx.fillStyle = 'rgba(154,232,255,0.5)';
      for (let i = 0; i < 5; i++) {
        const a = time * 2 + i * 1.26;
        ctx.fillRect(this.x + 42 + Math.cos(a) * 60, this.y + 40 + Math.sin(a) * 46, 3, 3);
      }
    }
  }
}
