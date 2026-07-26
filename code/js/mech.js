// ===================== Boss 3：巨型机甲（踏地震波 / 导弹齐射 / 胸部激光） =====================
import { CFG } from './config.js';
import { rand, clamp, overlap } from './utils.js';
import { rect } from './utils.js';
import { Assets, drawSprite } from './assets.js';

const G = CFG.GROUND_Y;
const LASER_Y = G - 38;      // 激光束中心高度（站立必中，蹲下/跳起可躲）
const ARENA_LEFT_PAD = 660;  // 机甲活动范围（Boss 墙左侧）

export class MechBoss {
  constructor() {
    this.w = 116;
    this.h = 150;
    this.x = CFG.ARENA_WALL_X - 280;
    this.y = G - this.h;
    this.facing = -1;
    // core = 头部驾驶舱（弱点，全额伤害）；身体命中减半
    this.core = { x: this.x + 40, y: this.y + 22, r: 24, hp: 130, max: 130 };
    this.cannons = [];
    this.clearText = '机甲已摧毁';
    this.title = '巨型机甲';
    this.state = 'idle';   // idle / stomp / salvo / laser
    this.timer = 1.6;
    this.sub = 0;          // 齐射剩余弹数
    this.laserPhase = 0;   // 0 无 / 1 预警 / 2 发射
    this.flash = 0;
    this.walkT = 0;
    this.dead = false;
    this.done = false;
    this.dyingT = 0;
    this.boomT = 0;
  }

  get phase2() { return this.core.hp <= this.core.max / 2; }

  update(dt, world) {
    if (this.done) return;
    const { player, enemies, particles, audio } = world;
    const px = player.x + CFG.PLAYER_W / 2;
    const py = player.y + player.h / 2;
    this.flash = Math.max(0, this.flash - dt);

    if (this.dead) {
      this.dyingT += dt;
      this.boomT -= dt;
      if (this.boomT <= 0) {
        this.boomT = 0.1;
        particles.explosion(this.x + rand(0, this.w), this.y + rand(0, this.h), rand(0.9, 1.6));
        audio.sfx('explode');
        world.shake(6);
      }
      if (this.dyingT > 2.0) {
        this.done = true;
        particles.bigExplosion(this.x + this.w / 2, this.y + this.h / 2);
        audio.sfx('bigExplode');
        world.shake(18);
      }
      return;
    }

    this.facing = px < this.x + this.w / 2 ? -1 : 1;
    const dist = Math.abs(px - (this.x + this.w / 2));
    const cd = this.phase2 ? 0.62 : 1;   // 二阶段冷却缩短

    switch (this.state) {
      case 'idle': {
        this.timer -= dt;
        // 液压步进逼近
        this.walkT += dt;
        this.x += this.facing * (this.phase2 ? 40 : 26) * dt;
        this.clampArena();
        if (this.timer <= 0 && !player.dead) {
          if (dist < 200) { this.state = 'stomp'; this.timer = 0.45; }
          else if (Math.random() < 0.5) { this.state = 'salvo'; this.sub = this.phase2 ? 6 : 4; this.timer = 0.3; }
          else { this.state = 'laser'; this.laserPhase = 1; this.timer = this.phase2 ? 0.6 : 0.85; audio.sfx('laser'); }
        }
        break;
      }
      case 'stomp': {
        this.timer -= dt;
        if (this.timer <= 0) {
          const wv = this.phase2 ? 340 : 280;
          enemies.bullets.push({ x: this.x + 16, y: G - 6, vx: -wv, vy: 0, r: 12, kind: 'wave', life: 2.4 });
          enemies.bullets.push({ x: this.x + this.w - 16, y: G - 6, vx: wv, vy: 0, r: 12, kind: 'wave', life: 2.4 });
          audio.sfx('boom');
          world.shake(14);
          particles.explosion(this.x + this.w / 2, G - 10, 1.1);
          this.state = 'idle';
          this.timer = rand(1.0, 1.5) * cd;
        }
        break;
      }
      case 'salvo': {
        this.timer -= dt;
        if (this.timer <= 0) {
          // 肩部导弹：抛物线覆盖玩家区域
          const sx = this.x + this.w / 2 + this.facing * 20;
          const sy = this.y + 34;
          const dx = px - sx;
          const T = rand(0.9, 1.4), g = 800;
          enemies.bullets.push({
            x: sx, y: sy,
            vx: dx / T + rand(-90, 90),
            vy: (py - sy - 0.5 * g * T * T) / T,
            r: 7, grav: g, kind: 'missile',
          });
          audio.sfx('launch');
          this.sub--;
          if (this.sub > 0) this.timer = 0.2;
          else { this.state = 'idle'; this.timer = rand(1.1, 1.7) * cd; }
        }
        break;
      }
      case 'laser': {
        this.timer -= dt;
        if (this.laserPhase === 1 && this.timer <= 0) {
          this.laserPhase = 2;
          this.timer = 0.7;
          audio.sfx('laser');
        } else if (this.laserPhase === 2) {
          // 发射中：站立玩家被命中（蹲下/跳起可躲）
          const beam = { x: CFG.ARENA_WALL_X - ARENA_LEFT_PAD, y: LASER_Y - 6, w: this.x - (CFG.ARENA_WALL_X - ARENA_LEFT_PAD), h: 12 };
          if (!player.dead && overlap(beam, { x: player.x, y: player.y, w: player.w, h: player.h })) {
            world.killPlayer();
          }
          if (this.timer <= 0) {
            this.laserPhase = 0;
            this.state = 'idle';
            this.timer = rand(1.0, 1.6) * cd;
          }
        }
        break;
      }
    }
    this.core.x = this.x + (this.facing < 0 ? 34 : this.w - 34);
    this.core.y = this.y + 22;
  }

  clampArena() {
    this.x = clamp(this.x, CFG.ARENA_WALL_X - ARENA_LEFT_PAD, CFG.ARENA_WALL_X - this.w - 16);
  }

  // 命中检测：头部 'core'（全额）/ 身体 'body'（减半）
  hitTest(b) {
    if (this.dead) return null;
    const c = this.core;
    const dx = b.x - c.x, dy = b.y - c.y;
    if (dx * dx + dy * dy <= (c.r + 4) * (c.r + 4)) return 'core';
    if (b.x > this.x && b.x < this.x + this.w && b.y > this.y + 40 && b.y < this.y + this.h) return 'body';
    return null;
  }

  damage(part, dmg, world) {
    if (this.dead) return;
    this.core.hp -= part === 'core' ? dmg : dmg * 0.5;
    this.flash = 0.08;
    world.audio.sfx('bossHit');
    if (this.core.hp <= 0) {
      this.dead = true;
      this.dyingT = 0;
      world.addScore(8000, this.x + this.w / 2, this.y + 40);
    }
  }

  draw(ctx, time) {
    if (this.done) return;
    if (this.dead && Math.floor(time * 10) % 2) return;
    const img = Assets.get('mech');
    const step = this.state === 'idle' ? Math.sin(this.walkT * 6) * 3 : 0;
    if (img) {
      drawSprite(ctx, img, this.x - 26, this.y - 10 + step * 0.4, this.w + 52, this.h + 10,
        { flip: this.facing > 0, scale: this.flash > 0 ? 1.04 : 1 });
    } else {
      // ---- 代码手绘回退：巨型机甲 ----
      const x = this.x, y = this.y + step * 0.4;
      const armor = this.flash > 0 ? '#8a90a2' : '#4a4f60';
      const dark = '#333742';
      // 腿（液压）
      rect(ctx, x + 16, y + 96, 26, 54, dark);
      rect(ctx, x + 72, y + 96, 26, 54, dark);
      rect(ctx, x + 10, y + 140, 38, 10, '#262932');
      rect(ctx, x + 66, y + 140, 38, 10, '#262932');
      // 躯干
      rect(ctx, x + 6, y + 34, 104, 66, armor);
      rect(ctx, x + 6, y + 34, 104, 8, '#6a7085');
      // 警示条纹
      for (let i = 0; i < 5; i++) rect(ctx, x + 14 + i * 20, y + 86, 12, 6, i % 2 ? '#c9a020' : '#26282e');
      // 肩导弹舱
      rect(ctx, x - 8, y + 26, 22, 30, dark);
      rect(ctx, x + 102, y + 26, 22, 30, dark);
      rect(ctx, x - 4, y + 30, 6, 6, '#c23a2e');
      rect(ctx, x + 108, y + 30, 6, 6, '#c23a2e');
      // 头部驾驶舱（弱点，随朝向偏移）
      const hx = this.facing < 0 ? x + 20 : x + 70;
      rect(ctx, hx, y + 4, 28, 24, '#3c404e');
      const eyeOn = Math.sin(time * 5) > -0.4;
      rect(ctx, hx + (this.facing < 0 ? 2 : 14), y + 12, 12, 7, eyeOn ? '#ff3a28' : '#6a1a12');
      // 胸部激光发射器（预警时充能发光）
      const charging = this.state === 'laser';
      rect(ctx, x + (this.facing < 0 ? 2 : this.w - 14), y + 52, 12, 16, charging ? '#ff6a3c' : '#262932');
    }
    // 激光预警线 / 光束（世界坐标）
    if (this.state === 'laser' && !this.dead) {
      const x0 = CFG.ARENA_WALL_X - ARENA_LEFT_PAD;
      const x1 = this.x + (this.facing < 0 ? 8 : this.w - 8);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (this.laserPhase === 1) {
        // 预警：红色虚线闪烁
        if (Math.floor(time * 12) % 2) {
          ctx.fillStyle = 'rgba(255,80,50,0.6)';
          for (let x = x0; x < x1; x += 18) ctx.fillRect(x, LASER_Y - 1, 10, 2);
        }
      } else if (this.laserPhase === 2) {
        ctx.fillStyle = 'rgba(255,60,30,0.3)';
        ctx.fillRect(x0, LASER_Y - 9, x1 - x0, 18);
        ctx.fillStyle = 'rgba(255,90,50,0.9)';
        ctx.fillRect(x0, LASER_Y - 4, x1 - x0, 8);
        ctx.fillStyle = '#ffe0c0';
        ctx.fillRect(x0, LASER_Y - 1, x1 - x0, 2);
      }
      ctx.restore();
    }
    // 二阶段过载电弧
    if (this.phase2 && !this.dead) {
      ctx.fillStyle = 'rgba(255,120,60,0.6)';
      for (let i = 0; i < 4; i++) {
        const a = time * 3 + i * 1.57;
        ctx.fillRect(this.x + this.w / 2 + Math.cos(a) * 70, this.y + 60 + Math.sin(a) * 55, 3, 3);
      }
    }
  }
}
