// ===================== Boss 7：港口守望者（机炮扇扫 / 轨道激光柱 / 投放巡逻机器人） =====================
import { CFG } from './config.js';
import { rand, clamp, overlap } from './utils.js';
import { rect } from './utils.js';
import { Assets, drawSprite } from './assets.js';
import { ebSpeed } from './enemies.js';
import { BaseBoss, ARENA_LEFT_PAD } from './bossbase.js';

const G = CFG.GROUND_Y;
const RAIL_Y = 56;         // 顶部轨道高度

export class WardenBoss extends BaseBoss {
  constructor() {
    super();
    this.w = 190;
    this.h = 58;
    this.x = CFG.ARENA_WALL_X - 300;
    this.y = RAIL_Y + 16;
    this.vx = 0;
    this.facing = -1;
    // core = 平台中部反应堆（弱点，全额伤害）；平台主体命中减半（基类 damage）
    this.core = { x: this.x + this.w / 2, y: this.y + 30, r: 20, hp: 180, max: 180 };
    this.clearText = '港口守望者已瘫痪';
    this.title = '港口守望者';
    this.state = 'idle';   // idle / sweep / laser / deploy
    this.timer = 1.4;
    this.tx = this.x;      // 滑行目标点
    this.sub = 0;          // 扫射/投放计数
    this.sweepA = 0;
    this.laserPhase = 0;   // 0 无 / 1 蓄力 / 2 发射
    this.laserX = 0;       // 激光柱落点（蓄力时追踪玩家，发射后横扫）
    this.laserDir = -1;
    this.roared = false;
    this.killScore = 16000;
    this.dyingBoomInterval = 0.1;
    this.dyingDuration = 2.2;
  }

  dyingBoomPos() {
    return { x: this.x + rand(0, this.w), y: this.y + rand(0, this.h), s: rand(0.9, 1.5) };
  }

  scorePos() { return { x: this.x + this.w / 2, y: this.y + 30 }; }

  arenaLo() { return CFG.ARENA_WALL_X - ARENA_LEFT_PAD; }
  arenaHi() { return CFG.ARENA_WALL_X - this.w - 10; }

  // 二阶段双柱：另一根关于平台中心镜像
  laserXs() {
    if (this.phase2) {
      const c = this.x + this.w / 2;
      return [this.laserX, 2 * c - this.laserX];
    }
    return [this.laserX];
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
      particles.text(this.x + this.w / 2 - 30, this.y + this.h + 16, '狂暴!!', '#ff6a50');
    }

    this.facing = px < this.x + this.w / 2 ? -1 : 1;
    const cd = this.phase2 ? 0.6 : 1;   // 二阶段冷却缩短

    // 沿轨道滑向目标点（二阶段提速）
    const sp = this.phase2 ? 230 : 150;
    const dx = this.tx - this.x;
    if (Math.abs(dx) > 3) this.x += clamp(dx, -sp * dt, sp * dt);
    this.x = clamp(this.x, this.arenaLo(), this.arenaHi());

    switch (this.state) {
      case 'idle': {
        this.timer -= dt;
        // 跟随玩家头顶缓慢施压
        this.tx = clamp(px - this.w / 2, this.arenaLo(), this.arenaHi());
        if (this.timer <= 0 && !player.dead) {
          const roll = Math.random();
          if (roll < 0.38) this.startLaser(px);
          else if (roll < 0.72) this.startSweep();
          else this.startDeploy();
        }
        break;
      }
      case 'sweep': {
        // 底部机炮扇形扫射（降低密度，给走位空间）
        this.timer -= dt;
        if (this.timer <= 0 && !player.dead) {
          const gx = this.x + this.w / 2;
          const gy = this.y + this.h;
          this.sweepA += 0.15;
          const base = Math.atan2(py - gy, px - gx);
          for (const off of [-0.07, 0.07]) {
            const a = base + Math.sin(this.sweepA) * 0.75 + off;
            const spd = ebSpeed(this.phase2 ? 330 : 290);
            enemies.bullets.push({ x: gx, y: gy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 4 });
          }
          audio.sfx('shoot');
          this.sub--;
          this.timer = 0.22;
          if (this.sub <= 0) {
            this.state = 'idle';
            this.timer = rand(1.0, 1.6) * cd;
          }
        }
        break;
      }
      case 'laser': {
        this.timer -= dt;
        if (this.laserPhase === 1) {
          // 蓄力：落点限速追踪玩家（跑位可甩开），主炮充能音
          const track = this.phase2 ? 210 : 150;
          this.laserX += clamp(px - this.laserX, -track * dt, track * dt);
          this.laserX = clamp(this.laserX, this.arenaLo() + 20, CFG.ARENA_WALL_X - 30);
          if (Math.random() < 0.3) particles.sparks(this.x + this.w / 2, this.y + this.h - 6, 2, '#ff8a5a');
          if (this.timer <= 0) {
            this.laserPhase = 2;
            this.timer = this.phase2 ? 1.1 : 0.95;
            this.laserDir = px > this.laserX ? 1 : -1;
            audio.sfx('laser');
          }
        } else if (this.laserPhase === 2) {
          // 发射：垂直激光柱横扫地面（二阶段双柱），碰到即死（尊重无敌/防护罩）
          const sweep = (this.phase2 ? 300 : 210) * this.laserDir * dt;
          this.laserX = clamp(this.laserX + sweep, this.arenaLo() + 20, CFG.ARENA_WALL_X - 30);
          for (const lx of this.laserXs()) {
            const beam = { x: lx - 13, y: this.y + this.h, w: 26, h: G - (this.y + this.h) };
            if (!player.dead && player.inv <= 0 && player.shieldT <= 0
              && overlap(beam, { x: player.x, y: player.y, w: player.w, h: player.h })) {
              world.killPlayer();
            }
            if (Math.random() < 0.5) particles.sparks(lx + rand(-10, 10), G - 4, 3, '#ff6a3c');
          }
          if (this.timer <= 0) {
            this.laserPhase = 0;
            this.state = 'idle';
            this.timer = rand(1.0, 1.6) * cd;
          }
        }
        break;
      }
      case 'deploy': {
        // 投放巡逻机器人杂兵（场上限 4 台）
        this.timer -= dt;
        if (this.timer <= 0) {
          const bots = enemies.list.filter((e) => e.type === 'patrolbot').length;
          if (bots < 4) {
            const bx = clamp(this.x + this.w / 2 + rand(-60, 60), this.arenaLo() + 20, CFG.ARENA_WALL_X - 40);
            enemies.spawnPatrolbot(bx, G);
            particles.smoke(bx, G - 20, 1.0);
            audio.sfx('launch');
          }
          this.sub--;
          if (this.sub > 0) this.timer = 0.45;
          else {
            this.state = 'idle';
            this.timer = rand(1.2, 1.8) * cd;
          }
        }
        break;
      }
    }

    // 弱点位置（反应堆）
    this.core.x = this.x + this.w / 2;
    this.core.y = this.y + 30;
  }

  startSweep() {
    this.state = 'sweep';
    this.sub = this.phase2 ? 10 : 7;
    this.sweepA = 0;
    this.timer = 0.4;
  }

  startLaser(px) {
    this.state = 'laser';
    this.laserPhase = 1;
    this.laserX = clamp(px, this.arenaLo() + 20, CFG.ARENA_WALL_X - 30);
    this.timer = this.phase2 ? 0.65 : 0.85;
  }

  startDeploy() {
    this.state = 'deploy';
    this.sub = this.phase2 ? 3 : 2;
    this.timer = 0.3;
  }

  // 命中检测：反应堆 'core'（全额）/ 平台主体 'body'（减半），damage 用基类实现
  hitTest(b) {
    if (this.dead) return null;
    const c = this.core;
    const dx = b.x - c.x, dy = b.y - c.y;
    if (dx * dx + dy * dy <= (c.r + 4) * (c.r + 4)) return 'core';
    if (b.x > this.x && b.x < this.x + this.w && b.y > this.y && b.y < this.y + this.h) return 'body';
    return null;
  }

  draw(ctx, time) {
    // 顶部轨道（始终绘制，Boss 的"家"）
    const railLo = this.arenaLo() - 30;
    const railHi = CFG.ARENA_WALL_X;
    rect(ctx, railLo, RAIL_Y, railHi - railLo, 10, '#333742');
    rect(ctx, railLo, RAIL_Y, railHi - railLo, 3, '#4d4e62');
    ctx.fillStyle = '#262932';
    for (let x = railLo + 20; x < railHi; x += 46) ctx.fillRect(x, RAIL_Y + 3, 6, 4);

    // 激光预警线 / 光柱（世界坐标，竖直落地）
    if (this.state === 'laser' && !this.dead) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const beamTop = this.y + this.h;
      if (this.laserPhase === 1) {
        // 预警：落点红色虚线闪烁
        if (Math.floor(time * 12) % 2) {
          ctx.fillStyle = 'rgba(255,80,50,0.6)';
          for (let y = beamTop; y < G; y += 20) ctx.fillRect(this.laserX - 1, y, 2, 12);
          ctx.fillRect(this.laserX - 14, G - 2, 28, 2);
        }
      } else if (this.laserPhase === 2) {
        for (const lx of this.laserXs()) {
          ctx.fillStyle = 'rgba(255,60,30,0.3)';
          ctx.fillRect(lx - 13, beamTop, 26, G - beamTop);
          ctx.fillStyle = 'rgba(255,90,50,0.9)';
          ctx.fillRect(lx - 6, beamTop, 12, G - beamTop);
          ctx.fillStyle = '#ffe0c0';
          ctx.fillRect(lx - 2, beamTop, 4, G - beamTop);
          // 地面灼烧点
          ctx.fillStyle = 'rgba(255,150,60,0.8)';
          ctx.fillRect(lx - 16, G - 3, 32, 3);
        }
      }
      ctx.restore();
    }

    if (this.done) return;
    if (this.dead && Math.floor(time * 10) % 2) return;

    const img = Assets.get('warden');
    if (img) {
      drawSprite(ctx, img, this.x - 18, this.y - 24, this.w + 36, this.h + 24,
        { flip: this.facing > 0, scale: this.flash > 0 ? 1.04 : 1 });
    } else {
      // ---- 代码手绘回退：轨道炮平台 ----
      const x = this.x, y = this.y;
      const armor = this.flash > 0 ? '#9aa2b8' : '#565e74';
      const dark = '#333742';
      // 轨道滑车
      rect(ctx, x + 40, RAIL_Y - 4, this.w - 80, 12, dark);
      rect(ctx, x + 52, RAIL_Y - 8, 14, 8, '#262932');
      rect(ctx, x + this.w - 66, RAIL_Y - 8, 14, 8, '#262932');
      // 平台主体（吊挂于轨道下）
      rect(ctx, x, y, this.w, this.h - 12, armor);
      rect(ctx, x, y, this.w, 7, '#6a738c');
      // 舷窗
      for (let i = 0; i < 5; i++) {
        rect(ctx, x + 16 + i * 34, y + 12, 16, 10, Math.sin(time * 2 + i) > -0.6 ? '#e8c82a' : '#6a5a20');
      }
      // 警示条纹
      for (let i = 0; i < 8; i++) rect(ctx, x + 10 + i * 22, y + this.h - 22, 12, 5, i % 2 ? '#c9a020' : '#26282e');
      // 底部机炮
      const gunX = x + this.w / 2 - 24;
      rect(ctx, gunX, y + this.h - 12, 48, 12, dark);
      rect(ctx, gunX + 20, y + this.h - 4, 8, 12, this.state === 'sweep' ? '#ffd76a' : '#262932');
      // 主炮（蓄力时充能发光）
      const charging = this.state === 'laser';
      const pulse = charging ? Math.sin(time * 14) * 0.5 + 0.5 : 0;
      rect(ctx, x + this.w / 2 - 10, y + this.h - 16, 20, 16, charging ? '#ff6a3c' : '#262932');
      if (charging) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,120,60,${0.2 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(x + this.w / 2, y + this.h - 8, 16 + pulse * 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // 中部反应堆（弱点）
      const c = this.core;
      const cpulse = Math.sin(time * 6) * 0.5 + 0.5;
      ctx.save();
      ctx.globalAlpha = 0.25 + cpulse * 0.2;
      ctx.fillStyle = '#ff5a2a';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 8 + cpulse * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = this.flash > 0 ? '#ffffff' : '#ff7a3c';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r - 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c22e1c';
      ctx.beginPath();
      ctx.arc(c.x, c.y, (c.r - 6) * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // 投放舱门
      rect(ctx, x + 20, y + this.h - 12, 26, 10, this.state === 'deploy' ? '#17171f' : dark);
      rect(ctx, x + this.w - 46, y + this.h - 12, 26, 10, this.state === 'deploy' ? '#17171f' : dark);
    }
    // 二阶段过载电弧
    if (this.phase2 && !this.dead) {
      ctx.fillStyle = 'rgba(120,200,255,0.6)';
      for (let i = 0; i < 4; i++) {
        const a = time * 4 + i * 1.57;
        ctx.fillRect(this.x + this.w / 2 + Math.cos(a) * 100, this.y + 24 + Math.sin(a) * 22, 3, 3);
      }
    }
  }
}
