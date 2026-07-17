// ===================== Boss：要塞核心（双副炮 + 扇形弹幕 + 出兵门） =====================
import { CFG } from './config.js';
import { rand, clamp } from './utils.js';
import { rect } from './utils.js';
import { Assets, drawSprite } from './assets.js';

export class Boss {
  constructor() {
    this.wallX = CFG.ARENA_WALL_X;
    // 核心与副炮凸出在墙面左侧，否则子弹会先撞墙体被吞掉
    this.core = { x: this.wallX - 30, y: 285, r: 26, hp: 90, max: 90 };
    this.cannons = [
      { x: this.wallX - 46, y: 130, w: 42, h: 42, hp: 25, max: 25, alive: true, timer: 1.4, burst: 0, burstT: 0, aim: Math.PI },
      { x: this.wallX - 46, y: 400, w: 42, h: 42, hp: 25, max: 25, alive: true, timer: 2.6, burst: 0, burstT: 0, aim: Math.PI },
    ];
    this.fanTimer = 3.4;
    this.doorTimer = 4.0;
    this.flash = 0;
    this.dead = false;   // 核心已毁，播放连锁爆炸
    this.done = false;   // 爆炸演完 → 胜利
    this.dyingT = 0;
    this.boomT = 0;
  }

  update(dt, world) {
    if (this.done) return;
    const { player, enemies, particles, audio } = world;
    const px = player.x + CFG.PLAYER_W / 2;
    const py = player.y + player.h / 2;
    this.flash = Math.max(0, this.flash - dt);

    if (this.dead) {
      // 连锁爆炸演出
      this.dyingT += dt;
      this.boomT -= dt;
      if (this.boomT <= 0) {
        this.boomT = 0.09;
        particles.explosion(this.wallX + rand(0, 150), rand(60, CFG.GROUND_Y), rand(0.8, 1.6));
        audio.sfx('explode');
        world.shake(6);
      }
      if (this.dyingT > 1.8) {
        this.done = true;
        particles.bigExplosion(this.core.x, this.core.y);
        audio.sfx('bigExplode');
        world.shake(18);
      }
      return;
    }

// 副炮：三连发瞄准弹
    for (const c of this.cannons) {
      if (!c.alive) continue;
      const cx = c.x + 34, cy = c.y + c.h / 2;
      c.aim = Math.atan2(py - cy, px - cx);
      c.timer -= dt;
      if (c.timer <= 0 && c.burst === 0 && !player.dead) {
        c.burst = 3;
        c.burstT = 0;
        c.timer = rand(2.2, 3.0);
      }
      if (c.burst > 0) {
        c.burstT -= dt;
        if (c.burstT <= 0) {
          enemies.fireAimed(cx + Math.cos(c.aim) * 30, cy + Math.sin(c.aim) * 30, px, py, CFG.EBULLET_SPEED + 40);
          audio.sfx('eshoot');
          c.burst--;
          c.burstT = 0.22;
        }
      }
    }

    // 核心：扇形弹幕
    this.fanTimer -= dt;
    if (this.fanTimer <= 0 && !player.dead) {
      enemies.fireFan(this.core.x - 20, this.core.y, px, py, 5, 0.9);
      audio.sfx('spread');
      this.flash = 0.15;
      this.fanTimer = rand(3.0, 3.8);
    }

    // 出兵门
    this.doorTimer -= dt;
    if (this.doorTimer <= 0) {
      if (enemies.runnerCount() < 3) {
        enemies.spawnRunners(1, -1, world.camX);
        const r = enemies.list[enemies.list.length - 1];
        r.x = this.wallX - 50;
        r.y = CFG.GROUND_Y - r.h;
      }
      this.doorTimer = 5.0;
    }
  }

  // 子弹命中检测：返回 'core' / cannon / null
  hitTest(b) {
    const c = this.core;
    if (!this.dead) {
      const dx = b.x - c.x, dy = b.y - c.y;
      if (dx * dx + dy * dy <= (c.r + 4) * (c.r + 4)) return 'core';
    }
    for (const cn of this.cannons) {
      if (cn.alive && b.x > cn.x && b.x < cn.x + cn.w && b.y > cn.y && b.y < cn.y + cn.h) return cn;
    }
    return null;
  }

  damage(part, dmg, world) {
    if (part === 'core') {
      this.core.hp -= dmg;
      this.flash = 0.08;
      world.audio.sfx('bossHit');
      if (this.core.hp <= 0) {
        this.dead = true;
        this.dyingT = 0;
        world.addScore(5000, this.core.x, this.core.y);
      }
    } else {
      part.hp -= dmg;
      world.audio.sfx('bossHit');
      if (part.hp <= 0) {
        part.alive = false;
        world.particles.explosion(part.x + 20, part.y + 20, 1.4);
        world.audio.sfx('turretDie');
        world.addScore(500, part.x + 20, part.y);
        world.shake(4);
      }
    }
  }

  draw(ctx, time) {
    const wx = this.wallX;
    // 墙体装甲板
    for (let y = 0; y < CFG.GROUND_Y; y += 60) {
      const shade = (y / 60) % 2 ? '#3a3b4a' : '#343544';
      rect(ctx, wx, y, 60, 58, shade);
      rect(ctx, wx, y, 60, 3, '#4d4e62');
      rect(ctx, wx + 6, y + 8, 5, 5, '#585970');
      rect(ctx, wx + 48, y + 40, 5, 5, '#585970');
    }
    // 底部警示条纹
    for (let x = 0; x < 60; x += 20) {
      ctx.fillStyle = (x / 20) % 2 ? '#d8a020' : '#2a2a32';
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(wx + x, CFG.GROUND_Y);
      ctx.lineTo(wx + x + 20, CFG.GROUND_Y);
      ctx.lineTo(wx + x + 10, CFG.GROUND_Y - 24);
      ctx.lineTo(wx + x - 10, CFG.GROUND_Y - 24);
      ctx.fill();
      ctx.restore();
    }
    // 出兵门
    rect(ctx, wx + 8, CFG.GROUND_Y - 74, 44, 74, '#17171f');
    rect(ctx, wx + 8, CFG.GROUND_Y - 74, 44, 6, '#4d4e62');

    // 副炮
    for (const c of this.cannons) {
      if (!c.alive) {
        rect(ctx, c.x, c.y + 20, 40, 12, '#22232c');
        continue;
      }
      const cx = c.x + 34, cy = c.y + c.h / 2;
      const cimg = Assets.get('boss_cannon');
      if (cimg) {
        drawSprite(ctx, cimg, c.x - 2, c.y - 6, c.w + 10, c.h + 10);
      } else {
        rect(ctx, c.x + 18, c.y, c.w - 18, c.h, '#51526a');
        rect(ctx, c.x + 18, c.y, c.w - 18, 6, '#6d6e8c');
      }
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(c.aim);
      rect(ctx, 0, -5, 32, 10, c.burst > 0 ? '#ffd76a' : '#26272f');
      ctx.restore();
      rect(ctx, cx - 4, cy - 4, 8, 8, '#191a20');
      // 副炮血条
      rect(ctx, c.x - 4, c.y - 10, 44, 5, '#20202a');
      rect(ctx, c.x - 4, c.y - 10, 44 * Math.max(0, c.hp / c.max), 5, '#e0a030');
    }

    // 核心
    const c = this.core;
    if (!this.dead) {
      const pulse = Math.sin(time * 6) * 0.5 + 0.5;
      ctx.save();
      ctx.globalAlpha = 0.25 + pulse * 0.2;
      ctx.fillStyle = '#ff5a2a';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 14 + pulse * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const cimg = Assets.get('boss_core');
      const drawn = cimg && drawSprite(ctx, cimg, c.x - c.r - 12, c.y - c.r - 12, (c.r + 12) * 2, (c.r + 12) * 2, { scale: this.flash > 0 ? 1.06 : 1 });
      if (!drawn) {
        ctx.fillStyle = this.flash > 0 ? '#ffffff' : '#ff7a3c';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c22e1c';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd0a0';
        ctx.beginPath();
        ctx.arc(c.x - 6, c.y - 6, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      // 旋转装甲环
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(time * 1.5);
      ctx.strokeStyle = '#8a8b9e';
      ctx.lineWidth = 6;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, c.r + 8, i * Math.PI / 2 + 0.2, (i + 1) * Math.PI / 2 - 0.2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
