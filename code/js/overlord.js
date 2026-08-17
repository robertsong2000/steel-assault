// ===================== Boss 8：天穹主脑（浮游炮齐射 / 环形弹幕 / 召唤杂兵 / 核心下压） =====================
import { CFG } from './config.js';
import { rand, clamp } from './utils.js';
import { rect } from './utils.js';
import { Assets, drawSprite } from './assets.js';
import { ebSpeed } from './enemies.js';
import { BaseBoss, ARENA_LEFT_PAD } from './bossbase.js';

const G = CFG.GROUND_Y;

export class OverlordBoss extends BaseBoss {
  constructor() {
    super();
    this.w = 120;
    this.h = 120;
    this.x = CFG.ARENA_WALL_X - 380;
    this.y = 120;
    this.tx = this.x;
    this.ty = 140;
    this.facing = -1;
    // core = 悬浮巨型主脑（全额伤害）；环绕浮游炮命中减半（基类 damage 对非 core 部位减半）
    this.core = { x: this.x + 60, y: this.y + 60, r: 34, hp: 220, max: 220 };
    // 环绕浮游炮（cannons 数组供追踪弹锁定；浮游炮本身不可摧毁，命中传导减半伤害到核心）
    this.cannons = [];
    for (let i = 0; i < 4; i++) {
      this.cannons.push({ x: 0, y: 0, w: 26, h: 26, alive: true, ang: (i * Math.PI) / 2 });
    }
    this.orbitR = 104;     // 浮游炮环绕半径
    this.spin = 0.9;       // 环绕角速度（二阶段加快）
    this.clearText = '天穹主脑已湮灭 —— 钢铁战役，终章落幕';
    this.title = '天穹主脑';
    this.state = 'idle';   // idle / volley / ring / summon / slam
    this.timer = 1.6;
    this.sub = 0;          // 齐射/召唤计数
    this.ringOff = 0;      // 环形弹幕角度偏移（每轮错开）
    this.slamPhase = 0;    // 0 就位 / 1 预警 / 2 下压 / 3 回升
    this.vy = 0;
    this.spiralA = 0;      // 二阶段螺旋弹幕角度
    this.spiralT = 0;
    this.bobT = 0;
    this.roared = false;
    this.killScore = 20000;
    this.dyingBoomInterval = 0.08;
    this.dyingDuration = 2.6;
    this.dyingShake = 8;
  }

  dyingBoomPos() {
    if (Math.random() < 0.3) {
      // 浮游炮也接连殉爆
      const cn = this.cannons[Math.floor(Math.random() * this.cannons.length)];
      return { x: cn.x + rand(0, cn.w), y: cn.y + rand(0, cn.h), s: rand(0.7, 1.2) };
    }
    return { x: this.core.x + rand(-60, 60), y: this.core.y + rand(-60, 60), s: rand(0.9, 1.7) };
  }

  finalBoomPos() { return { x: this.core.x, y: this.core.y }; }

  scorePos() { return { x: this.core.x, y: this.core.y - 20 }; }

  arenaLo() { return CFG.ARENA_WALL_X - ARENA_LEFT_PAD; }
  arenaHi() { return CFG.ARENA_WALL_X - this.w - 20; }

  update(dt, world) {
    if (this.done) return;
    const { player, enemies, particles, audio } = world;
    const px = player.x + CFG.PLAYER_W / 2;
    const py = player.y + player.h / 2;
    this.flash = Math.max(0, this.flash - dt);
    this.bobT += dt;

    if (this.dead) {
      // 连锁爆炸演出（浮游炮环绕失控加速）
      this.spin += dt * 4;
      this.updateCannons(dt);
      this.updateDying(dt, world);
      return;
    }

    // 二阶段怒吼
    if (this.phase2 && !this.roared) {
      this.roared = true;
      audio.sfx('roar');
      world.shake(12);
      particles.text(this.core.x - 30, this.core.y - 80, '狂暴!!', '#ff6a50');
    }

    this.facing = px < this.core.x ? -1 : 1;
    const cd = this.phase2 ? 0.6 : 1;   // 二阶段冷却缩短

    // 悬浮游移（下压时由状态机接管运动）
    if (this.state !== 'slam') {
      const sp = this.phase2 ? 150 : 110;
      const dx = this.tx - this.x, dy = this.ty - this.y;
      this.x += clamp(dx, -sp * dt, sp * dt);
      this.y += clamp(dy, -sp * dt, sp * dt);
      this.x = clamp(this.x, this.arenaLo(), this.arenaHi());
      this.y = clamp(this.y, 80, 260);
    }

    // 浮游炮环绕（二阶段转速加快）
    this.updateCannons(dt);

    // 二阶段常驻螺旋弹幕（密度低于环形弹幕，逼走位）
    if (this.phase2 && !player.dead && this.state !== 'slam') {
      this.spiralT -= dt;
      if (this.spiralT <= 0) {
        this.spiralT = 0.16;
        this.spiralA += 0.55;
        const spd = ebSpeed(220);
        for (const off of [0, Math.PI]) {
          const a = this.spiralA + off;
          enemies.bullets.push({ x: this.core.x, y: this.core.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 4 });
        }
      }
    }

    switch (this.state) {
      case 'idle': {
        this.timer -= dt;
        // 在竞技场中上游弋
        if (Math.random() < 0.01) {
          this.tx = rand(this.arenaLo(), this.arenaHi());
          this.ty = rand(90, 230);
        }
        if (this.timer <= 0 && !player.dead) {
          const roll = Math.random();
          if (roll < 0.3) this.startVolley();
          else if (roll < 0.58) this.startRing();
          else if (roll < 0.8) this.startSummon();
          else this.startSlam();
        }
        break;
      }
      case 'volley': {
        // 浮游炮齐射：每台一门瞄准弹（二阶段两轮）
        this.timer -= dt;
        if (this.timer <= 0 && !player.dead) {
          for (const cn of this.cannons) {
            enemies.fireAimed(cn.x + 13, cn.y + 13, px, py, ebSpeed(this.phase2 ? 330 : 300));
          }
          audio.sfx('eshoot');
          this.sub--;
          if (this.sub > 0) this.timer = 0.5;
          else {
            this.state = 'idle';
            this.timer = rand(1.0, 1.5) * cd;
          }
        }
        break;
      }
      case 'ring': {
        // 环形弹幕：全向扇形，每轮角度错开
        this.timer -= dt;
        if (this.timer <= 0 && !player.dead) {
          const n = this.phase2 ? 16 : 12;
          const spd = ebSpeed(this.phase2 ? 250 : 230);
          for (let i = 0; i < n; i++) {
            const a = this.ringOff + (i * Math.PI * 2) / n;
            enemies.bullets.push({ x: this.core.x, y: this.core.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 5 });
          }
          this.ringOff += 0.35;
          audio.sfx('spread');
          this.flash = 0.12;
          this.sub--;
          if (this.sub > 0) this.timer = this.phase2 ? 0.55 : 0.7;
          else {
            this.state = 'idle';
            this.timer = rand(1.1, 1.6) * cd;
          }
        }
        break;
      }
      case 'summon': {
        // 召唤杂兵（空降兵/蛙跳兵，场上限 5 个）
        this.timer -= dt;
        if (this.timer <= 0) {
          const adds = enemies.list.filter((e) => e.type === 'para' || e.type === 'jumper').length;
          if (adds < 5) {
            // 落点基准 clamp 到 Boss 墙内侧（spawnParas 上限 camX+W-60 = ARENA_WALL_X-60），防伞兵落墙后打不到
            if (Math.random() < 0.5) enemies.spawnParas(2, Math.min(world.camX, CFG.ARENA_WALL_X - CFG.W));
            else enemies.spawnJumpers(2, -1, world.camX);
            particles.smoke(this.core.x, this.core.y + 40, 1.2);
            audio.sfx('launch');
          }
          this.sub--;
          if (this.sub > 0) this.timer = 0.6;
          else {
            this.state = 'idle';
            this.timer = rand(1.2, 1.8) * cd;
          }
        }
        break;
      }
      case 'slam': {
        if (this.slamPhase === 0) {
          // 就位：升到玩家头顶
          this.tx = px - this.w / 2;
          this.ty = 100;
          const sp = 260;
          this.x += clamp(this.tx - this.x, -sp * dt, sp * dt);
          this.y += clamp(this.ty - this.y, -sp * dt, sp * dt);
          this.x = clamp(this.x, this.arenaLo(), this.arenaHi());
          if (Math.abs(this.tx - this.x) < 20 && Math.abs(this.ty - this.y) < 20) {
            this.slamPhase = 1;
            this.timer = 0.55;
            audio.sfx('laser');
          }
        } else if (this.slamPhase === 1) {
          // 预警：地面投影 + 微震（跑位窗口）
          this.timer -= dt;
          if (Math.random() < 0.4) particles.sparks(this.core.x + rand(-40, 40), this.core.y + 50, 2, '#ff8a5a');
          if (this.timer <= 0) {
            this.slamPhase = 2;
            this.vy = this.phase2 ? 1050 : 880;
            audio.sfx('roar');
          }
        } else if (this.slamPhase === 2) {
          // 核心冲锋下压（接触即死）
          this.y += this.vy * dt;
          if (!player.dead && player.inv <= 0 && player.shieldT <= 0) {
            const dx = px - this.core.x, dy = py - this.core.y;
            if (dx * dx + dy * dy < (this.core.r + 20) * (this.core.r + 20)) world.killPlayer();
          }
          if (this.y >= G - this.h) {
            this.y = G - this.h;
            // 落地冲击：双向贴地冲击波（跳起躲避）
            const wv = ebSpeed(this.phase2 ? 360 : 300);
            enemies.bullets.push({ x: this.x + 8, y: G - 6, vx: -wv, vy: 0, r: 12, kind: 'wave', life: 2.2 });
            enemies.bullets.push({ x: this.x + this.w - 8, y: G - 6, vx: wv, vy: 0, r: 12, kind: 'wave', life: 2.2 });
            particles.explosion(this.core.x, G - 12, 1.4);
            audio.sfx('boom');
            world.shake(16);
            this.slamPhase = 3;
          }
        } else {
          // 回升到巡航高度
          this.y = Math.max(140, this.y - 200 * dt);
          if (this.y <= 140) {
            this.state = 'idle';
            this.timer = rand(1.0, 1.5) * cd;
          }
        }
        break;
      }
    }

    // 核心位置（含悬浮起伏）
    this.core.x = this.x + this.w / 2;
    this.core.y = this.y + this.h / 2 + Math.sin(this.bobT * 2) * 5;
  }

  // 浮游炮环绕位置（核心周围，cannons 坐标供命中检测/追踪弹使用）
  updateCannons(dt) {
    const rate = this.phase2 || this.dead ? this.spin * 1.6 : this.spin;
    for (const cn of this.cannons) {
      cn.ang += rate * dt;
      cn.x = this.core.x + Math.cos(cn.ang) * this.orbitR - cn.w / 2;
      cn.y = this.core.y + Math.sin(cn.ang) * this.orbitR * 0.62 - cn.h / 2;
    }
  }

  startVolley() {
    this.state = 'volley';
    this.sub = this.phase2 ? 2 : 1;   // 齐射轮数
    this.timer = 0.35;
  }

  startRing() {
    this.state = 'ring';
    this.sub = this.phase2 ? 3 : 2;   // 环形弹幕轮数
    this.timer = 0.4;
  }

  startSummon() {
    this.state = 'summon';
    this.sub = 1;
    this.timer = 0.3;
  }

  startSlam() {
    this.state = 'slam';
    this.slamPhase = 0;
    this.timer = 0;
  }

  // 命中检测：主脑 'core'（全额）/ 浮游炮（减半，基类 damage 处理）
  hitTest(b) {
    if (this.dead) return null;
    const c = this.core;
    const dx = b.x - c.x, dy = b.y - c.y;
    if (dx * dx + dy * dy <= (c.r + 4) * (c.r + 4)) return 'core';
    for (const cn of this.cannons) {
      if (cn.alive && b.x > cn.x && b.x < cn.x + cn.w && b.y > cn.y && b.y < cn.y + cn.h) return cn;
    }
    return null;
  }

  draw(ctx, time) {
    if (this.done) return;
    if (this.dead && Math.floor(time * 10) % 2) return;

    const c = this.core;
    const flash = this.flash > 0;

    // 下压预警：地面投影
    if (this.state === 'slam' && this.slamPhase >= 1 && !this.dead) {
      const blink = this.slamPhase === 1 ? Math.floor(time * 10) % 2 === 0 : true;
      if (blink) {
        ctx.fillStyle = 'rgba(255,80,50,0.4)';
        ctx.beginPath();
        ctx.ellipse(c.x, G + 4, 70, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 浮游炮环绕轨迹（淡）
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#8fd0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, this.orbitR, this.orbitR * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 浮游炮
    for (const cn of this.cannons) {
      const pimg = Assets.get('overlord_pod');
      if (pimg) {
        drawSprite(ctx, pimg, cn.x - 4, cn.y - 4, cn.w + 8, cn.h + 8);
      } else {
        // ---- 代码手绘回退：浮游炮 ----
        rect(ctx, cn.x, cn.y + 6, cn.w, cn.h - 12, flash ? '#c8d2e8' : '#5a6480');
        rect(ctx, cn.x + 4, cn.y + 2, cn.w - 8, 6, '#3c4356');
        rect(ctx, cn.x + 4, cn.y + cn.h - 8, cn.w - 8, 6, '#3c4356');
        const eyeOn = Math.sin(time * 6 + cn.ang) > -0.5;
        rect(ctx, cn.x + cn.w / 2 - 4, cn.y + cn.h / 2 - 3, 8, 6, eyeOn ? '#ff3a28' : '#6a1a12');
        // 推进焰
        ctx.fillStyle = 'rgba(120,200,255,0.7)';
        ctx.fillRect(cn.x + cn.w / 2 - 3, cn.y + cn.h - 2, 6, 4 + Math.sin(time * 20 + cn.ang) * 2);
      }
    }

    // 主脑核心
    const img = Assets.get('overlord');
    if (img) {
      drawSprite(ctx, img, c.x - 76, c.y - 76, 152, 152, { scale: flash ? 1.05 : 1 });
    } else {
      // ---- 代码手绘回退：悬浮巨型核心 ----
      // 外壳
      const shell = flash ? '#e8ecf6' : '#6a7490';
      ctx.fillStyle = shell;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a5268';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 48, 0, Math.PI * 2);
      ctx.fill();
      // 装甲板接缝
      ctx.strokeStyle = '#333a4c';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + 0.3;
        ctx.beginPath();
        ctx.moveTo(c.x + Math.cos(a) * 34, c.y + Math.sin(a) * 34);
        ctx.lineTo(c.x + Math.cos(a) * 48, c.y + Math.sin(a) * 48);
        ctx.stroke();
      }
      // 主脑之眼（核心弱点，脉动）
      const pulse = Math.sin(time * (this.phase2 ? 8 : 5)) * 0.5 + 0.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,90,42,${0.25 + pulse * 0.25})`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 12 + pulse * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = flash ? '#ffffff' : '#ff7a3c';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c22e1c';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // 瞳孔（追踪玩家方向）
      const pa = Math.atan2(1, this.facing);
      ctx.fillStyle = '#2a0a06';
      ctx.beginPath();
      ctx.arc(c.x + Math.cos(pa) * 8, c.y + Math.sin(pa) * 4, 8, 0, Math.PI * 2);
      ctx.fill();
      // 底部推进光晕
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(120,200,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + 62, 26, 8 + Math.sin(time * 12) * 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // 二阶段能量乱流
    if (this.phase2 && !this.dead) {
      ctx.fillStyle = 'rgba(160,120,255,0.6)';
      for (let i = 0; i < 6; i++) {
        const a = time * 2.5 + i * 1.05;
        ctx.fillRect(c.x + Math.cos(a) * 74, c.y + Math.sin(a) * 60, 3, 3);
      }
    }
  }
}
