// ===================== Boss 6：钻地破坏王（冲锋碾压 / 钻地突袭 / 旋转抛石） =====================
import { CFG } from './config.js';
import { rand, clamp, overlap } from './utils.js';
import { rect } from './utils.js';
import { Assets, drawSprite } from './assets.js';
import { BaseBoss, ARENA_LEFT_PAD } from './bossbase.js';

const G = CFG.GROUND_Y;

export class DrillBoss extends BaseBoss {
  constructor() {
    super();
    this.w = 150;
    this.h = 66;
    this.x = CFG.ARENA_WALL_X - 280;
    this.y = G - this.h;
    this.vx = 0;
    this.facing = -1;
    // core = 顶部驾驶舱（弱点，全额伤害）；车身命中减半（基类 damage）
    this.core = { x: this.x + 72, y: this.y + 14, r: 20, hp: 160, max: 160 };
    this.clearText = '钻地破坏王已报废';
    this.title = '钻地破坏王';
    this.state = 'idle';   // idle / charge / sink / under / erupt / rocks
    this.timer = 1.5;
    this.chargePhase = 0;  // 0 蓄力 / 1 冲锋 / 2 刹车
    this.burrowN = 0;      // 剩余连续钻地次数（二阶段突袭两次）
    this.warnX = 0;        // 破土预警点
    this.warnT = 0;
    this.sub = 0;          // 碎石抛射剩余数
    this.drillT = 0;       // 钻头旋转动画
    this.roared = false;
    this.killScore = 14000;
    this.dyingBoomInterval = 0.1;
    this.dyingDuration = 2.0;
  }

  dyingBoomPos() {
    return { x: this.x + rand(0, this.w), y: Math.min(this.y, G - 20) + rand(0, this.h), s: rand(0.9, 1.5) };
  }

  finalBoomPos() { return { x: this.x + this.w / 2, y: Math.min(this.y + this.h / 2, G - 24) }; }

  scorePos() { return { x: this.x + this.w / 2, y: this.y + 10 }; }

  // 钻入地下后无敌（弱点同步沉入地底，追踪弹打不到）
  get underground() { return this.state === 'sink' || this.state === 'under'; }

  // 碾压接触伤害（尊重无敌/防护罩，与熔岩巨兽岩浆判定同模式）
  touchPlayer(world) {
    const { player } = world;
    if (player.dead || player.inv > 0 || player.shieldT > 0) return;
    if (overlap({ x: this.x, y: this.y, w: this.w, h: this.h }, { x: player.x, y: player.y, w: player.w, h: player.h })) {
      world.killPlayer();
    }
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
      particles.text(this.x + this.w / 2 - 30, this.y - 24, '狂暴!!', '#ff6a50');
    }

    this.facing = px < this.x + this.w / 2 ? -1 : 1;
    const dist = Math.abs(px - (this.x + this.w / 2));
    const cd = this.phase2 ? 0.6 : 1;   // 二阶段冷却缩短

    switch (this.state) {
      case 'idle': {
        this.timer -= dt;
        // 缓慢逼近玩家
        this.x += this.facing * (this.phase2 ? 52 : 34) * dt;
        this.clampArena();
        if (this.timer <= 0 && !player.dead) {
          if (dist < 230) this.startCharge();
          else if (dist > 430 || Math.random() < 0.4) this.startBurrow(px);
          else if (Math.random() < 0.55) this.startRocks();
          else this.startCharge();
        }
        break;
      }
      case 'charge': {
        if (this.chargePhase === 0) {
          // 蓄力：原地刨地震动 + 扬尘
          this.timer -= dt;
          this.drillT += dt * 6;
          if (Math.random() < 0.3) particles.smoke(this.x + this.w / 2 - this.facing * 50, G - 8, 0.7);
          if (this.timer <= 0) {
            this.chargePhase = 1;
            this.vx = this.facing * (this.phase2 ? 640 : 470);
            audio.sfx('roar');
            world.shake(5);
          }
        } else if (this.chargePhase === 1) {
          // 冲锋碾压（接触即死）
          this.drillT += dt * 20;
          this.x += this.vx * dt;
          this.touchPlayer(world);
          if (Math.random() < 0.5) particles.smoke(this.x + this.w / 2 - this.facing * 60, G - 6, 0.8);
          const lo = CFG.ARENA_WALL_X - ARENA_LEFT_PAD, hi = CFG.ARENA_WALL_X - this.w - 16;
          if (this.x <= lo || this.x >= hi) {
            this.x = clamp(this.x, lo, hi);
            // 撞到竞技场边缘：冲击震屏 + 溅起三颗碎石（抛物线，不解算落点）
            particles.explosion(this.x + this.w / 2 + this.facing * 70, G - 16, 1.0);
            audio.sfx('boom');
            world.shake(12);
            for (let i = 0; i < 3; i++) {
              enemies.bullets.push({
                x: this.x + this.w / 2 + this.facing * 60, y: G - 10,
                vx: -this.facing * rand(60, 220), vy: -rand(300, 520),
                r: 7, grav: 900, kind: 'shell',
              });
            }
            this.vx = 0;
            this.chargePhase = 2;
            this.timer = 0.5;
          }
        } else {
          // 刹车硬直
          this.timer -= dt;
          if (this.timer <= 0) {
            this.state = 'idle';
            this.timer = rand(1.0, 1.5) * cd;
          }
        }
        break;
      }
      case 'sink': {
        // 钻入地下
        this.drillT += dt * 24;
        this.y += 340 * dt;
        if (Math.random() < 0.6) particles.smoke(this.x + rand(0, this.w), G - 6, 0.9);
        if (this.y >= G + 30) {
          this.state = 'under';
          this.timer = this.phase2 ? rand(0.8, 1.1) : rand(1.0, 1.5);
          this.warnX = clamp(px, CFG.ARENA_WALL_X - ARENA_LEFT_PAD + 40, CFG.ARENA_WALL_X - 40);
          this.warnT = 0;
          audio.sfx('boom');
        }
        break;
      }
      case 'under': {
        // 地下潜行：锁定预警点，持续冒碎石尘提示
        this.timer -= dt;
        this.warnT -= dt;
        if (this.warnT <= 0) {
          this.warnT = 0.09;
          particles.smoke(this.warnX + rand(-30, 30), G - 4, 0.6);
          particles.sparks(this.warnX + rand(-24, 24), G - 2, 2, '#c9a020');
        }
        if (this.timer <= 0) this.startErupt();
        break;
      }
      case 'erupt': {
        // 破土突袭：从预警点正下方顶出（顶出瞬间接触即死）
        this.y -= 760 * dt;
        this.touchPlayer(world);
        if (this.y <= G - this.h) {
          this.y = G - this.h;
          particles.explosion(this.x + this.w / 2, G - 14, 1.5);
          audio.sfx('bigExplode');
          world.shake(16);
          // 破土碎石扇（向上溅射后落地）
          for (let i = -2; i <= 2; i++) {
            enemies.bullets.push({
              x: this.x + this.w / 2 + i * 14, y: G - 20,
              vx: i * rand(70, 110), vy: -rand(420, 620),
              r: 7, grav: 950, kind: 'shell',
            });
          }
          // 二阶段：连续两次钻地突袭
          if (this.burrowN > 0) {
            this.burrowN--;
            this.state = 'sink';
          } else {
            this.state = 'idle';
            this.timer = rand(1.1, 1.6) * cd;
          }
        }
        break;
      }
      case 'rocks': {
        // 旋转钻头抛出一排抛物线碎石（落点瞄准玩家，带散布）
        this.drillT += dt * 16;
        this.timer -= dt;
        if (this.timer <= 0) {
          const cx = this.x + this.w / 2 + this.facing * 60;
          const cy = this.y + 10;
          const dx = px - cx;
          const T = rand(0.9, 1.3), g = 950;
          enemies.bullets.push({
            x: cx, y: cy,
            vx: dx / T + rand(-120, 120),
            vy: (py - cy - 0.5 * g * T * T) / T,
            r: 8, grav: g, kind: 'shell',
          });
          audio.sfx('eshoot');
          this.sub--;
          if (this.sub > 0) this.timer = 0.2;
          else { this.state = 'idle'; this.timer = rand(1.0, 1.6) * cd; }
        }
        break;
      }
    }

    // 弱点位置（驾驶舱）；钻地时沉入地底
    this.core.x = this.x + 72;
    this.core.y = this.y + 14;
    // 钻地时核心沉入地底：追踪弹会锁 core 俯冲撞地；hitTest 钻地返回 null（无敌），属设计内行为
    if (this.underground) this.core.y = G + 200;
  }

  startCharge() {
    this.state = 'charge';
    this.chargePhase = 0;
    this.timer = this.phase2 ? 0.4 : 0.6;
  }

  startBurrow() {
    this.state = 'sink';
    this.burrowN = this.phase2 ? 1 : 0;   // 二阶段：首次突袭后再钻一次
  }

  startErupt() {
    this.state = 'erupt';
    this.x = clamp(this.warnX - this.w / 2, CFG.ARENA_WALL_X - ARENA_LEFT_PAD, CFG.ARENA_WALL_X - this.w - 16);
    this.y = G + 30;
  }

  startRocks() {
    this.state = 'rocks';
    this.sub = this.phase2 ? 6 : 4;
    this.timer = 0.3;
  }

  clampArena() {
    this.x = clamp(this.x, CFG.ARENA_WALL_X - ARENA_LEFT_PAD, CFG.ARENA_WALL_X - this.w - 16);
  }

  // 命中检测：驾驶舱 'core'（全额）/ 车身 'body'（减半），钻地时无敌
  hitTest(b) {
    if (this.dead || this.underground) return null;
    const c = this.core;
    const dx = b.x - c.x, dy = b.y - c.y;
    if (dx * dx + dy * dy <= (c.r + 4) * (c.r + 4)) return 'core';
    if (b.x > this.x && b.x < this.x + this.w && b.y > this.y && b.y < this.y + this.h) return 'body';
    return null;
  }

  draw(ctx, time) {
    if (this.done) return;
    if (this.dead && Math.floor(time * 10) % 2) return;

    // 地下潜行：只画地面裂纹预警（碎石尘由粒子系统负责）
    if (this.underground) {
      const blink = Math.floor(time * 8) % 2 === 0;
      if (blink && !this.dead) {
        ctx.fillStyle = 'rgba(201,160,32,0.55)';
        for (let i = -2; i <= 2; i++) {
          ctx.fillRect(this.warnX + i * 18 - 6, G - 3, 12, 3);
        }
      }
      return;
    }

    const img = Assets.get('drill');
    if (img) {
      drawSprite(ctx, img, this.x - 30, this.y - 16, this.w + 60, this.h + 16,
        { flip: this.facing > 0, scale: this.flash > 0 ? 1.05 : 1 });
    } else {
      // ---- 代码手绘回退：巨型钻头战车 ----
      const x = this.x, y = this.y;
      const armor = this.flash > 0 ? '#d8b060' : '#a8701f';
      const dark = '#2b2b33';
      const fx = this.facing < 0 ? x : x + this.w;   // 车头（钻头侧）
      // 履带底盘
      rect(ctx, x + 8, y + this.h - 24, this.w - 16, 24, dark);
      ctx.fillStyle = '#4a4f60';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(x + 24 + i * 26, y + this.h - 12, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      // 车身装甲
      rect(ctx, x + 16, y + 16, this.w - 32, this.h - 40, armor);
      rect(ctx, x + 16, y + 16, this.w - 32, 6, '#c98f35');
      // 警示条纹
      for (let i = 0; i < 5; i++) rect(ctx, x + 24 + i * 22, y + this.h - 34, 12, 6, i % 2 ? '#c9a020' : '#26282e');
      // 巨型钻头（冲锋/抛石时高速旋转）
      const spinning = this.state === 'charge' || this.state === 'rocks' || this.state === 'sink' || this.state === 'erupt';
      const dOff = spinning ? Math.floor(this.drillT * 10) % 8 : 0;
      ctx.save();
      ctx.translate(fx, y + this.h - 34);
      if (this.facing > 0) ctx.scale(-1, 1);
      ctx.fillStyle = '#8a8f9e';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(-52, 0);
      ctx.lineTo(0, 18);
      ctx.closePath();
      ctx.fill();
      // 钻头螺旋纹
      ctx.fillStyle = '#5a5f70';
      for (let i = 0; i < 3; i++) {
        const sx = -10 - i * 14 - dOff;
        ctx.fillRect(sx, -12 + i * 4, 6, 24 - i * 8);
      }
      ctx.restore();
      // 驾驶舱（弱点）
      const cab = this.flash > 0 ? '#ffffff' : '#3c404e';
      rect(ctx, this.core.x - 18, y - 2, 36, 24, cab);
      rect(ctx, this.core.x - 18, y - 2, 36, 4, '#585e70');
      const eyeOn = Math.sin(time * 5) > -0.4;
      rect(ctx, this.core.x - 10 + (this.facing < 0 ? -6 : 6), y + 6, 12, 7, eyeOn ? '#ff3a28' : '#6a1a12');
      // 排气管
      rect(ctx, x + this.w - (this.facing < 0 ? 22 : 34), y + 4, 8, 14, dark);
    }
    // 蓄力抖动提示
    if (this.state === 'charge' && this.chargePhase === 0 && Math.floor(time * 14) % 2) {
      ctx.fillStyle = 'rgba(255,106,80,0.5)';
      ctx.fillRect(this.x, this.y - 8, this.w, 3);
    }
    // 二阶段过载火星
    if (this.phase2 && !this.dead) {
      ctx.fillStyle = 'rgba(255,150,60,0.6)';
      for (let i = 0; i < 4; i++) {
        const a = time * 3 + i * 1.57;
        ctx.fillRect(this.x + this.w / 2 + Math.cos(a) * 80, this.y + 30 + Math.sin(a) * 30, 3, 3);
      }
    }
  }
}
