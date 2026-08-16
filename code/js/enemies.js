// ===================== 敌人 & 敌方子弹 & 武器道具 =====================
import { CFG, WEAPON_COLOR } from './config.js';
import { rand, chance, clamp, overlap, physicsMove, rect } from './utils.js';
import { LEVEL, groundTopAt } from './level.js';
import { Assets, drawSprite } from './assets.js';

// 直射敌弹速度统一收口：基础速度 × 关卡弹速倍率 × 难度倍率（所有直射弹都必须经过这里；
// 弹道解算弹 vx=dx/T（雪球/齐射/火球/投弹）乘倍率会破坏落点解算，不在此列）
export const ebSpeed = (base) => base * (LEVEL.ebulletMul || 1) * (CFG.DIFF_MUL || 1);

// 击杀掉落分数（damage() 查表；roller 走引爆特例不在此列）
export const ENEMY_SCORE = {
  runner: 100, sniper: 200, turret: 300, drone: 150,
  grenadier: 250, shielder: 300, flyer: 150, jumper: 100,
  para: 200, worm: 300, patrol: 220,
};

export class EnemyManager {
  constructor() {
    this.list = [];
    this.bullets = [];
    this.powerups = [];
  }

  clear() {
    this.list.length = 0;
    this.bullets.length = 0;
    this.powerups.length = 0;
  }

  // ---- 生成 ----
  spawnRunners(n, dir, camX) {
    for (let i = 0; i < n; i++) {
      let x = dir < 0 ? camX + CFG.W + 40 + i * 56 : camX - 40 - i * 56;
      x = Math.min(x, CFG.ARENA_WALL_X - 30); // 防止刷进 Boss 墙里
      const top = groundTopAt(x, { safe: true }) ?? CFG.GROUND_Y;
      this.list.push({
        type: 'runner', x, y: top - 42, w: 24, h: 42,
        vx: 0, vy: 0, dir, hp: 1, runT: rand(0, 1), onGround: false,
      });
    }
  }

  spawnTurret(x, y) {
    this.list.push({ type: 'turret', x: x - 18, y: y - 34, w: 36, h: 34, hp: 3, timer: rand(0.6, 1.6), flash: 0, aim: Math.PI });
  }

  spawnSniper(x, y) {
    this.list.push({ type: 'sniper', x: x - 13, y: y - 40, w: 26, h: 40, hp: 2, state: 'hide', timer: rand(0.5, 1.2), aim: Math.PI });
  }

  spawnDrone(carry, camX) {
    this.list.push({
      type: 'drone', x: camX + CFG.W + 60, y: 140, w: 36, h: 24,
      vx: -150, t: 0, baseY: rand(110, 170), hp: 1, carry,
    });
  }

  // 雪球兵：原地抛抛物线雪球
  spawnGrenadier(x, y) {
    this.list.push({
      type: 'grenadier', x: x - 13, y: y - 42, w: 26, h: 42,
      hp: 2, timer: rand(1.0, 2.0), facing: -1, runT: rand(0, 1),
    });
  }

  // 盾牌兵：正面防弹，缓慢逼近
  spawnShielder(x, y) {
    this.list.push({
      type: 'shielder', x: x - 14, y: y - 44, w: 28, h: 44,
      vx: 0, vy: 0, hp: 4, facing: -1, runT: 0, onGround: false,
    });
  }

  // 寒冰无人机：正弦飞行，靠近后俯冲
  spawnFlyers(n, camX) {
    for (let i = 0; i < n; i++) {
      this.list.push({
        type: 'flyer', x: camX + CFG.W + 50 + i * 70, y: rand(120, 180), w: 30, h: 22,
        vx: -130, t: rand(0, 2), baseY: rand(110, 170), hp: 1, diving: false,
      });
    }
  }

  // 蛙跳兵：连续高跳逼近
  spawnJumpers(n, dir, camX) {
    for (let i = 0; i < n; i++) {
      let x = dir < 0 ? camX + CFG.W + 40 + i * 64 : camX - 40 - i * 64;
      x = Math.min(x, CFG.ARENA_WALL_X - 30);
      const top = groundTopAt(x, { safe: true }) ?? CFG.GROUND_Y;
      this.list.push({
        type: 'jumper', x, y: top - 42, w: 24, h: 42,
        vx: 0, vy: 0, dir, hp: 1, runT: rand(0, 1), jumpT: rand(0.3, 0.9), onGround: false,
      });
    }
  }

  // 自爆滚雷：高速滚向玩家，靠近后引爆
  spawnRollers(n, dir, camX) {
    for (let i = 0; i < n; i++) {
      let x = dir < 0 ? camX + CFG.W + 40 + i * 48 : camX - 40 - i * 48;
      x = Math.min(x, CFG.ARENA_WALL_X - 30);
      const top = groundTopAt(x, { safe: true }) ?? CFG.GROUND_Y;
      this.list.push({
        type: 'roller', x, y: top - 22, w: 22, h: 22,
        vx: 0, vy: 0, hp: 1, fuse: -1, rollT: 0, onGround: false,
      });
    }
  }

  // 空降兵：降落伞落下，落地后站射
  spawnParas(n, camX) {
    for (let i = 0; i < n; i++) {
      const x = clamp(camX + 200 + i * 180 + rand(-40, 40), camX + 60, camX + CFG.W - 60);
      this.list.push({
        type: 'para', x, y: -50 - i * 60, w: 24, h: 42,
        vx: 0, vy: 0, hp: 2, state: 'fall', swayT: rand(0, 2), timer: rand(0.8, 1.6), aim: Math.PI, facing: -1, runT: 0,
      });
    }
  }

  // 巡逻机器人：沿驻点来回踱步，发现玩家后停步射击
  spawnPatrols(n, camX) {
    for (let i = 0; i < n; i++) {
      let x = camX + CFG.W + 40 + i * 72;
      x = Math.min(x, CFG.ARENA_WALL_X - 30);
      const top = groundTopAt(x, { safe: true }) ?? CFG.GROUND_Y;
      this.list.push({
        type: 'patrol', x, y: top - 40, w: 26, h: 40,
        vx: 0, vy: 0, dir: -1, facing: -1, hp: 3,
        state: 'patrol', homeX: x, patrolRange: 140, detectRange: 420,
        timer: 0.5, runT: rand(0, 1), onGround: false,
      });
    }
  }

  // 沙虫：埋伏沙下，玩家靠近破土突袭
  spawnSandworm(x, y) {
    this.list.push({
      type: 'worm', x: x - 16, y: y - 48, w: 32, h: 48,
      vx: 0, vy: 0, hp: 3, state: 'hide', timer: rand(0.4, 1.2), facing: -1, onGround: false,
    });
  }

  // 滚雷引爆（自爆 / 被打爆）
  detonate(e, world) {
    const cx = e.x + 11, cy = e.y + 11;
    world.particles.explosion(cx, cy, 1.2);
    world.audio.sfx('boom');
    world.shake(6);
    const p = world.player;
    if (!p.dead) {
      const dx = p.x + p.w / 2 - cx, dy = p.y + p.h / 2 - cy;
      if (dx * dx + dy * dy < 85 * 85) world.killPlayer();
    }
    e.remove = true;
  }

  spawnPowerup(x, y, kind) {
    this.powerups.push({ x: x - 14, y, w: 28, h: 28, vx: 0, vy: -260, kind, landed: false, life: 12, onGround: false });
  }

  // ---- 子弹 ----
  fireAimed(x, y, tx, ty, speed = ebSpeed(CFG.EBULLET_SPEED), spreadAng = 0) {
    let a = Math.atan2(ty - y, tx - x) + spreadAng;
    this.bullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 4 });
  }

  fireFan(x, y, tx, ty, count, fanAngle, speed = ebSpeed(CFG.EBULLET_SPEED) + 20) {
    const base = Math.atan2(ty - y, tx - x);
    for (let i = 0; i < count; i++) {
      const a = base + (count === 1 ? 0 : -fanAngle / 2 + (fanAngle / (count - 1)) * i);
      this.bullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 4 });
    }
  }

  // ---- 受击 ----
  damage(e, dmg, world) {
    e.hp -= dmg;
    if (e.hp > 0) {
      e.hitFlash = 0.08;   // 受击白闪
      world.audio.sfx('bossHit');
      return false;
    }
    if (e.type === 'roller') {
      // 滚雷被打爆：同样引爆（距离远则安全）
      world.addScore(150, e.x + 11, e.y);
      this.detonate(e, world);
      return true;
    }
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    world.particles.explosion(cx, cy, 1);
    world.audio.sfx('explode');
    const sc = ENEMY_SCORE[e.type] || 100;
    world.addScore(sc, cx, cy);
    if (e.type === 'drone' && e.carry) this.spawnPowerup(cx, cy, e.carry);
    e.remove = true;
    return true;
  }

  // ---- 更新 ----
  update(dt, world) {
    const { player, camX } = world;
    const px = player.x + CFG.PLAYER_W / 2, py = player.y + player.h / 2;

    for (const e of this.list) {
      if (e.hitFlash) e.hitFlash = Math.max(0, e.hitFlash - dt);
      switch (e.type) {
        case 'runner': {
          e.vx = e.dir * 170;
          e.vy = Math.min(e.vy + CFG.GRAV * dt, CFG.MAX_FALL);
          physicsMove(e, LEVEL.solids, LEVEL.oneways, dt);
          e.runT += dt;
          // 偶尔跳跃（追兵感）
          if (e.onGround && Math.abs(e.x - px) < 400 && chance(0.012)) e.vy = -680;
          if (e.x < camX - 140 || e.x > camX + CFG.W + 200 || e.y > CFG.H + 100) e.remove = true;
          break;
        }
        case 'turret': {
          const dist = Math.abs(e.x - px);
          if (dist < 560 && !player.dead) {
            const cx = e.x + 18, cy = e.y + 12;
            e.aim = Math.atan2(py - cy, px - cx);
            e.timer -= dt;
            if (e.timer < 0.32) e.flash = 1; else e.flash = 0;
            if (e.timer <= 0) {
              this.fireAimed(cx + Math.cos(e.aim) * 24, cy + Math.sin(e.aim) * 24, px, py);
              world.audio.sfx('eshoot');
              e.timer = rand(1.5, 2.0);
            }
          }
          break;
        }
        case 'sniper': {
          const dist = Math.abs(e.x - px);
          if (dist < 660 && !player.dead) {
            e.timer -= dt;
            if (e.state === 'hide' && e.timer <= 0) { e.state = 'aim'; e.timer = 0.5; }
            else if (e.state === 'aim') {
              e.aim = Math.atan2(py - (e.y + 10), px - (e.x + 13));
              if (e.timer <= 0) {
                this.fireAimed(e.x + 13, e.y + 10, px, py, ebSpeed(CFG.EBULLET_SPEED + 30));
                world.audio.sfx('eshoot');
                e.state = 'hide';
                e.timer = rand(1.0, 1.8);
              }
            }
          }
          break;
        }
        case 'drone': {
          e.t += dt;
          e.x += e.vx * dt;
          e.y = e.baseY + Math.sin(e.t * 2.6) * 26;
          if (e.x < camX - 140) e.remove = true;
          break;
        }
        case 'grenadier': {
          const cx = e.x + 13, cy = e.y + 10;
          const dx = px - cx;
          e.facing = dx < 0 ? -1 : 1;
          e.runT += dt;
          if (Math.abs(dx) < 560 && !player.dead) {
            e.timer -= dt;
            if (e.timer <= 0) {
              // 抛物线雪球：按飞行时间解算初速度
              const T = rand(1.0, 1.3), g = 900;
              const vy = (py - cy - 0.5 * g * T * T) / T;
              this.bullets.push({
                x: cx, y: cy, vx: dx / T, vy, r: 6, grav: g, kind: 'snow',
              });
              world.audio.sfx('eshoot');
              e.timer = rand(2.4, 3.2);
            }
          }
          break;
        }
        case 'shielder': {
          const dx = px - (e.x + 14);
          e.facing = dx < 0 ? -1 : 1;
          e.vx = Math.abs(dx) > 30 ? e.facing * 55 : 0;
          e.vy = Math.min(e.vy + CFG.GRAV * dt, CFG.MAX_FALL);
          physicsMove(e, LEVEL.solids, LEVEL.oneways, dt);
          if (Math.abs(e.vx) > 1) e.runT += dt;
          if (e.x < camX - 140 || e.y > CFG.H + 100) e.remove = true;
          break;
        }
        case 'flyer': {
          e.t += dt;
          const dx = px - (e.x + 15), dy = py - (e.y + 11);
          if (!e.diving) {
            e.x += e.vx * dt;
            e.y = e.baseY + Math.sin(e.t * 2.2) * 30;
            // 进入射程：俯冲锁定
            if (Math.abs(dx) < 300 && !player.dead) {
              e.diving = true;
              const d = Math.hypot(dx, dy) || 1;
              e.vx = (dx / d) * 300;
              e.vy = (dy / d) * 300;
              world.audio.sfx('eshoot');
            }
          } else {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
          }
          if (e.x < camX - 140 || e.y > CFG.H + 100) e.remove = true;
          break;
        }
        case 'jumper': {
          e.jumpT -= dt;
          if (e.onGround) {
            e.vx = 0;
            if (e.jumpT <= 0) {
              // 朝玩家方向高跳
              e.dir = px < e.x ? -1 : 1;
              e.vy = -720;
              e.vx = e.dir * 150;
              e.jumpT = rand(0.4, 0.8);
            }
          }
          e.vy = Math.min(e.vy + CFG.GRAV * dt, CFG.MAX_FALL);
          physicsMove(e, LEVEL.solids, LEVEL.oneways, dt);
          e.runT += dt;
          if (e.x < camX - 140 || e.y > CFG.H + 100) e.remove = true;
          break;
        }
        case 'roller': {
          if (e.fuse >= 0) {
            // 引爆倒计时
            e.fuse -= dt;
            e.vx = 0;
            if (e.fuse <= 0) this.detonate(e, world);
            break;
          }
          const dx = px - (e.x + 11);
          e.vx = Math.sign(dx) * 210;
          e.vy = Math.min(e.vy + CFG.GRAV * dt, CFG.MAX_FALL);
          physicsMove(e, LEVEL.solids, LEVEL.oneways, dt);
          e.rollT += dt;
          const dy = py - (e.y + 11);
          if (!player.dead && dx * dx + dy * dy < 70 * 70) e.fuse = 0.5;
          if (e.x < camX - 140 || e.y > CFG.H + 100) e.remove = true;
          break;
        }
        case 'worm': {
          const dx = px - (e.x + 16);
          if (e.state === 'hide') {
            e.timer -= dt;
            // 玩家靠近：破土突袭
            if (Math.abs(dx) < 240 && !player.dead) {
              e.state = 'burst';
              e.facing = dx < 0 ? -1 : 1;
              e.vy = -680;
              e.vx = e.facing * 150;
              world.audio.sfx('explode');
              world.particles.sparks(e.x + 16, e.y + e.h, 10, '#d8b878');
            }
          } else if (e.state === 'burst') {
            e.vy = Math.min(e.vy + CFG.GRAV * dt, CFG.MAX_FALL);
            physicsMove(e, LEVEL.solids, LEVEL.oneways, dt);
            if (e.onGround) { e.state = 'burrow'; e.timer = 0.55; }
          } else if (e.state === 'burrow') {
            // 钻回沙下
            e.timer -= dt;
            e.y += 70 * dt;
            if (e.timer <= 0) {
              const top = groundTopAt(e.x + 16) ?? CFG.GROUND_Y;
              e.y = top - 48;
              e.vy = 0;
              e.state = 'hide';
              e.timer = rand(0.8, 1.6);
            }
          }
          break;
        }
        case 'patrol': {
          const cx = e.x + e.w / 2;
          const dx = px - cx;
          const dist = Math.abs(dx);
          e.runT += dt;
          e.vy = Math.min(e.vy + CFG.GRAV * dt, CFG.MAX_FALL);
          if (!player.dead && dist < e.detectRange) {
            e.state = 'alert';
            e.facing = dx < 0 ? -1 : 1;
            e.dir = e.facing;
            e.vx = 0;
            e.timer -= dt;
            if (e.timer <= 0) {
              this.fireAimed(cx + e.facing * 16, e.y + 14, px, py);
              world.audio.sfx('eshoot');
              e.timer = 1.4;
            }
          } else {
            e.state = 'patrol';
            if (e.x <= e.homeX - e.patrolRange) e.dir = 1;
            if (e.x >= e.homeX + e.patrolRange) e.dir = -1;
            e.facing = e.dir;
            e.vx = e.dir * 90;
            e.timer = 0.35;
          }
          physicsMove(e, LEVEL.solids, LEVEL.oneways, dt);
          if (e.x < camX - 200 || e.y > CFG.H + 100) e.remove = true;
          break;
        }
        case 'para': {
          if (e.state === 'fall') {
            // 降落伞：缓降 + 摇摆
            e.swayT += dt;
            e.vy = 62;
            e.x += Math.sin(e.swayT * 2.2) * 40 * dt;
            e.y += e.vy * dt;
            const top = groundTopAt(e.x + 12);
            if (top !== null && e.y + e.h >= top) {
              e.y = top - e.h;
              e.state = 'fight';
              world.particles.sparks(e.x + 12, e.y + e.h, 4, '#c8c8d8');
            }
            if (e.y > CFG.H + 60) e.remove = true;
          } else {
            // 落地站射
            const dx = px - (e.x + 12);
            e.facing = dx < 0 ? -1 : 1;
            e.runT += dt;
            if (Math.abs(dx) < 620 && !player.dead) {
              e.timer -= dt;
              e.aim = Math.atan2(py - (e.y + 10), px - (e.x + 12));
              if (e.timer <= 0) {
                this.fireAimed(e.x + 12 + Math.cos(e.aim) * 20, e.y + 10 + Math.sin(e.aim) * 20, px, py);
                world.audio.sfx('eshoot');
                e.timer = rand(2.0, 2.6);
              }
            }
          }
          break;
        }
      }
    }
    this.list = this.list.filter((e) => !e.remove);

    // 敌方子弹（性能护栏：上限 120，超出丢最老）
    if (this.bullets.length > 120) this.bullets.splice(0, this.bullets.length - 120);
    for (const b of this.bullets) {
      if (b.grav) b.vy += b.grav * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life !== undefined) {
        b.life -= dt;
        if (b.life <= 0) { b.remove = true; continue; }
      }
      if (b.x < camX - 60 || b.x > camX + CFG.W + 60 || b.y < -60 || b.y > CFG.H + 60) b.remove = true;
      else if (b.kind !== 'wave') {
        for (const s of LEVEL.solids) {
          if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h) {
            if (b.kind === 'snow' || b.kind === 'ice') world.particles.sparks(b.x, b.y, 6, '#dff0ff');
            else world.particles.sparks(b.x, b.y, 4, '#ffca7a');
            b.remove = true;
            break;
          }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.remove);

    // 道具
    for (const p of this.powerups) {
      p.life -= dt;
      if (p.life <= 0) { p.remove = true; continue; }
      if (!p.landed) {
        p.vy = Math.min(p.vy + CFG.GRAV * dt, CFG.MAX_FALL);
        physicsMove(p, LEVEL.solids, LEVEL.oneways, dt);
        if (p.onGround) { p.landed = true; p.baseY = p.y; }
      } else {
        p.y = p.baseY + Math.sin(world.time * 4 + p.x) * 4;
      }
    }
    this.powerups = this.powerups.filter((p) => !p.remove);
  }

  runnerCount() {
    return this.list.filter((e) => e.type === 'runner').length;
  }

  // ---- 绘制（世界坐标，调用方已做镜头平移） ----
  draw(ctx, time) {
    for (const p of this.powerups) drawPowerup(ctx, p, time);
    for (const e of this.list) {
      if (e.type === 'runner') drawRunner(ctx, e);
      else if (e.type === 'turret') drawTurret(ctx, e);
      else if (e.type === 'sniper') drawSniper(ctx, e);
      else if (e.type === 'drone') drawDrone(ctx, e, time);
      else if (e.type === 'grenadier') drawGrenadier(ctx, e);
      else if (e.type === 'shielder') drawShielder(ctx, e);
      else if (e.type === 'flyer') drawFlyer(ctx, e, time);
      else if (e.type === 'jumper') drawJumper(ctx, e);
      else if (e.type === 'roller') drawRoller(ctx, e, time);
      else if (e.type === 'para') drawPara(ctx, e, time);
      else if (e.type === 'worm') drawWorm(ctx, e, time);
      else if (e.type === 'patrol') drawPatrol(ctx, e);
      // 受击白闪
      if (e.hitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = (e.hitFlash / 0.08) * 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(e.x - 2, e.y - 2, e.w + 4, e.h + 4);
        ctx.restore();
      }
    }
    // 敌方子弹
    for (const b of this.bullets) {
      if (b.kind === 'snow') {
        // 雪球
        ctx.fillStyle = '#f4faff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#bcd8ee';
        ctx.beginPath();
        ctx.arc(b.x + 2, b.y + 2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'ice') {
        // 冰岩
        ctx.fillStyle = '#9cc8e8';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e8f4ff';
        ctx.beginPath();
        ctx.arc(b.x - 2, b.y - 3, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'fire') {
        // 火球：橙红摇曳
        const fl = Math.sin(b.x * 0.3 + b.y * 0.2) * 2;
        ctx.fillStyle = '#e8552a';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 8 + fl * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffb830';
        ctx.beginPath();
        ctx.arc(b.x - 2, b.y - 2, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'missile') {
        // 导弹：弹体 + 尾焰
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        rect(ctx, -8, -3, 14, 6, '#8a8f9e');
        rect(ctx, 4, -3, 4, 6, '#c23a2e');
        rect(ctx, -12, -2, 5, 4, '#ffb830');
        ctx.restore();
      } else if (b.kind === 'wave') {
        // 冰晶冲击波（贴地行进，跳起躲避）
        const img = Assets.get('icewave');
        const pulse = 1 + Math.sin(time * 12 + b.x * 0.05) * 0.08;
        if (img) {
          ctx.save();
          ctx.translate(b.x, b.y);
          if (b.vx < 0) ctx.scale(-1, 1);
          ctx.scale(pulse, pulse);
          // 底部能量辉光
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(140,210,255,0.3)';
          ctx.fillRect(-20, -8, 40, 8);
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(img, -32, -56, 64, 56);
          ctx.restore();
        } else {
          // 回退：锯齿冰刺（三角峰 + 高光）
          ctx.save();
          if (b.vx < 0) { ctx.translate(b.x * 2, 0); ctx.scale(-1, 1); }
          const spikes = [[-16, 18], [-8, 30], [0, 40], [8, 26], [15, 16]];
          for (const [sx, sh] of spikes) {
            ctx.fillStyle = '#7fb8dd';
            ctx.beginPath();
            ctx.moveTo(b.x + sx - 6, b.y);
            ctx.lineTo(b.x + sx + 6, b.y);
            ctx.lineTo(b.x + sx, b.y - sh * pulse);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#dff0ff';
            ctx.beginPath();
            ctx.moveTo(b.x + sx - 2, b.y - sh * 0.4);
            ctx.lineTo(b.x + sx + 2, b.y - sh * 0.4);
            ctx.lineTo(b.x + sx, b.y - sh * pulse);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = 'rgba(140,210,255,0.35)';
          ctx.fillRect(b.x - 20, b.y - 6, 40, 6);
          ctx.restore();
        }
      } else {
        rect(ctx, b.x - 4, b.y - 4, 8, 8, '#ff5a3c');
        rect(ctx, b.x - 2, b.y - 2, 4, 4, '#ffd0a0');
      }
    }
  }
}

function drawRunner(ctx, e) {
  const frames = [Assets.get('runner_0'), Assets.get('runner_1'), Assets.get('runner_2'), Assets.get('runner_3')];
  if (frames.every(Boolean)) {
    const f = frames[Math.floor(e.runT * 12) % 4];
    drawSprite(ctx, f, e.x - 8, e.y - 4, e.w + 16, e.h + 4, { flip: e.dir > 0 });
    return;
  }
  const flip = e.dir < 0 ? 1 : -1;
  const cx = e.x + 12;
  const legA = Math.sin(e.runT * 16) * 7;
  // 腿
  rect(ctx, cx - 4 + legA * flip, e.y + 26, 6, 16, '#7a1f1f');
  rect(ctx, cx - 4 - legA * flip, e.y + 26, 6, 16, '#932626');
  // 身体
  rect(ctx, cx - 8, e.y + 10, 16, 18, '#c23a2e');
  rect(ctx, cx - 8, e.y + 10, 16, 5, '#8c2a20');
  // 头
  rect(ctx, cx - 6, e.y - 2, 12, 12, '#f0c090');
  rect(ctx, cx - 7, e.y - 4, 14, 6, '#5a1a14');
  // 枪
  rect(ctx, cx + flip * 6 - (flip < 0 ? 18 : 0), e.y + 16, 18, 4, '#2b2b33');
}

function drawTurret(ctx, e) {
  const cx = e.x + 18, cy = e.y + 12;
  const img = Assets.get('turret');
  if (!img) {
    rect(ctx, e.x + 2, e.y + 26, 32, 8, '#3c3e4a');
    rect(ctx, e.x + 6, e.y + 8, 24, 20, '#5b5e70');
    rect(ctx, e.x + 6, e.y + 8, 24, 5, '#7d8098');
  } else {
    drawSprite(ctx, img, e.x - 6, e.y - 6, e.w + 12, e.h + 6);
  }
  // 炮管（代码绘制，可瞄准）
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(e.aim);
  rect(ctx, 0, -4, 26, 8, e.flash ? '#ffd76a' : '#33353f');
  ctx.restore();
  rect(ctx, cx - 3, cy - 3, 6, 6, '#22232c');
}

function drawSniper(ctx, e) {
  const img = Assets.get('sniper');
  if (img) {
    if (e.state === 'hide') {
      // 躲藏：只画下半部分（沙袋）
      const sh = img.height * 0.52;
      ctx.drawImage(img, 0, img.height - sh, img.width, sh, e.x - 8, e.y + 18, e.w + 16, (e.h - 18) * 0.9);
    } else {
      drawSprite(ctx, img, e.x - 8, e.y - 8, e.w + 16, e.h + 8);
      ctx.save();
      ctx.translate(e.x + 13, e.y + 10);
      ctx.rotate(e.aim);
      rect(ctx, 0, -2, 24, 4, '#26262e');
      ctx.restore();
    }
    return;
  }
  // 沙袋掩体（常显）
  rect(ctx, e.x - 8, e.y + 22, 42, 18, '#8a734d');
  rect(ctx, e.x - 4, e.y + 16, 34, 8, '#a08657');
  if (e.state === 'hide') {
    // 只露头
    rect(ctx, e.x + 7, e.y + 12, 12, 10, '#f0c090');
    rect(ctx, e.x + 6, e.y + 10, 14, 5, '#274a72');
  } else {
    rect(ctx, e.x + 5, e.y + 2, 16, 22, '#2f5d8f');
    rect(ctx, e.x + 7, e.y - 6, 12, 12, '#f0c090');
    rect(ctx, e.x + 6, e.y - 8, 14, 6, '#274a72');
    ctx.save();
    ctx.translate(e.x + 13, e.y + 10);
    ctx.rotate(e.aim);
    rect(ctx, 0, -2, 24, 4, '#26262e');
    ctx.restore();
  }
}

function drawDrone(ctx, e, time) {
  const img = Assets.get('drone');
  if (img) {
    drawSprite(ctx, img, e.x - 8, e.y - 10, e.w + 16, e.h + 14);
    // 货舱指示灯
    rect(ctx, e.x + 15, e.y + 20, 6, 4, Math.sin(time * 8) > 0 ? '#ff4a3c' : '#7a1f18');
    return;
  }
  const cx = e.x + 18;
  rect(ctx, e.x + 4, e.y + 6, 28, 14, '#6a6f80');
  rect(ctx, e.x + 4, e.y + 6, 28, 4, '#8f95ab');
  rect(ctx, cx - 4, e.y, 8, 8, '#4a4e5e');
  // 螺旋桨
  const pw = 16 + Math.sin(time * 40) * 6;
  rect(ctx, cx - pw / 2, e.y - 3, pw, 3, '#c8ccdc');
  // 货舱指示灯
  rect(ctx, cx - 3, e.y + 20, 6, 4, Math.sin(time * 8) > 0 ? '#ff4a3c' : '#7a1f18');
}

// 雪球兵：冰蓝配色的投掷手
function drawGrenadier(ctx, e) {
  const frames = [Assets.get('grenadier_0'), Assets.get('grenadier_1'), Assets.get('grenadier_2'), Assets.get('grenadier_3')];
  if (frames.every(Boolean)) {
    const f = frames[Math.floor(e.runT * 8) % 4];
    drawSprite(ctx, f, e.x - 8, e.y - 4, e.w + 16, e.h + 4, { flip: e.facing > 0 });
    return;
  }
  const cx = e.x + 13;
  rect(ctx, cx - 8, e.y + 10, 16, 18, '#4a7ec2');
  rect(ctx, cx - 8, e.y + 10, 16, 5, '#35619c');
  rect(ctx, cx - 6, e.y - 2, 12, 12, '#f0c090');
  rect(ctx, cx - 7, e.y - 4, 14, 6, '#2c4a72');
  rect(ctx, cx - 4 + (e.facing > 0 ? 4 : -6), e.y + 26, 6, 16, '#2c4a72');
  rect(ctx, cx - 2 + (e.facing > 0 ? -6 : 4), e.y + 26, 6, 16, '#35619c');
}

// 盾牌兵：狙击手精灵 + 正面金属盾
function drawShielder(ctx, e) {
  const img = Assets.get('sniper');
  if (img) drawSprite(ctx, img, e.x - 8, e.y - 8, e.w + 16, e.h + 8, { flip: e.facing > 0 });
  else {
    rect(ctx, e.x + 5, e.y + 2, 16, 22, '#5a5e6e');
    rect(ctx, e.x + 7, e.y - 6, 12, 12, '#f0c090');
    rect(ctx, e.x + 6, e.y - 8, 14, 6, '#3c3e4a');
    rect(ctx, e.x + 5, e.y + 24, 7, 20, '#3c3e4a');
    rect(ctx, e.x + 15, e.y + 24, 7, 20, '#4a4e5e');
  }
  // 盾牌（朝向侧）
  const sx = e.facing > 0 ? e.x + e.w - 2 : e.x - 10;
  rect(ctx, sx, e.y + 2, 12, 38, '#8f95ab');
  rect(ctx, sx + 2, e.y + 4, 8, 34, '#6a6f80');
  rect(ctx, sx + 4, e.y + 18, 4, 6, '#c8ccdc');
}

// 寒冰无人机：青色换色 + 冰晶翼
function drawFlyer(ctx, e, time) {
  const img = Assets.get('flyer');
  if (img) {
    drawSprite(ctx, img, e.x - 8, e.y - 10, e.w + 16, e.h + 14);
  } else {
    const cx = e.x + 15;
    rect(ctx, e.x + 3, e.y + 5, 24, 12, '#4a9ec2');
    rect(ctx, e.x + 3, e.y + 5, 24, 4, '#7cc8e8');
    const pw = 14 + Math.sin(time * 40) * 6;
    rect(ctx, cx - pw / 2, e.y - 2, pw, 3, '#dff0ff');
  }
  // 冰晶核心灯
  rect(ctx, e.x + 12, e.y + 18, 6, 4, Math.sin(time * 8) > 0 ? '#9ae8ff' : '#3a7a9c');
}

// 蛙跳兵：紫色跑男换色
function drawJumper(ctx, e) {
  const frames = [Assets.get('jumper_0'), Assets.get('jumper_1'), Assets.get('jumper_2'), Assets.get('jumper_3')];
  if (frames.every(Boolean)) {
    const f = frames[Math.floor(e.runT * 12) % 4];
    drawSprite(ctx, f, e.x - 8, e.y - 4, e.w + 16, e.h + 4, { flip: e.dir > 0 });
    return;
  }
  const cx = e.x + 12;
  const legA = Math.sin(e.runT * 16) * 7;
  rect(ctx, cx - 4 + legA, e.y + 26, 6, 16, '#4a2a6e');
  rect(ctx, cx - 4 - legA, e.y + 26, 6, 16, '#5d3888');
  rect(ctx, cx - 8, e.y + 10, 16, 18, '#7a4ec2');
  rect(ctx, cx - 6, e.y - 2, 12, 12, '#f0c090');
  rect(ctx, cx - 7, e.y - 4, 14, 6, '#3a2056');
}

// 巡逻机器人：钢壳 + 琥珀目镜（无素材时手绘回退）
function drawPatrol(ctx, e) {
  const cx = e.x + 13;
  const flip = e.facing < 0 ? -1 : 1;
  const legA = e.state === 'patrol' ? Math.sin(e.runT * 10) * 5 : 0;
  rect(ctx, cx - 5 + legA, e.y + 26, 7, 14, '#3a3e4a');
  rect(ctx, cx - 5 - legA, e.y + 26, 7, 14, '#4a4e5c');
  rect(ctx, cx - 10, e.y + 8, 20, 20, '#6a7080');
  rect(ctx, cx - 10, e.y + 8, 20, 5, '#8a90a4');
  rect(ctx, cx - 8, e.y - 4, 16, 14, '#4a5060');
  rect(ctx, cx - 6, e.y - 1, 12, 6, e.state === 'alert' ? '#ffb830' : '#7ec8e8');
  rect(ctx, cx - 1, e.y - 10, 3, 7, '#c8ccdc');
  rect(ctx, cx + flip * 8 - (flip < 0 ? 16 : 0), e.y + 14, 16, 4, '#2b2b33');
}

// 自爆滚雷：刺球 + 引信闪烁
function drawRoller(ctx, e, time) {
  const img = Assets.get('roller');
  const flashing = e.fuse >= 0;
  if (flashing && Math.floor(time * 14) % 2) {
    // 引爆前白热闪烁
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(e.x + 11, e.y + 11, 13, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (img) {
    // 滚动旋转
    ctx.save();
    ctx.translate(e.x + 11, e.y + 11);
    ctx.rotate(e.rollT * 9);
    ctx.drawImage(img, -14, -14, 28, 28);
    ctx.restore();
    return;
  }
  const cx = e.x + 11, cy = e.y + 11;
  ctx.fillStyle = '#3c404e';
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();
  // 刺
  ctx.strokeStyle = '#6a7085';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = e.rollT * 9 + i * Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8);
    ctx.lineTo(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13);
    ctx.stroke();
  }
  // 红眼
  rect(ctx, cx - 2, cy - 2, 4, 4, Math.sin(time * 6) > 0 ? '#ff4a3c' : '#8c1f18');
}

// 空降兵：卡其跑男换色 + 降落伞
function drawPara(ctx, e, time) {
  const frames = [Assets.get('para_0'), Assets.get('para_1'), Assets.get('para_2'), Assets.get('para_3')];
  if (e.state === 'fall') {
    // 降落伞
    const sway = Math.sin(e.swayT * 2.2) * 6;
    ctx.fillStyle = '#c96a2a';
    ctx.beginPath();
    ctx.arc(e.x + 12 + sway, e.y - 26, 26, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#e88a3a';
    ctx.beginPath();
    ctx.arc(e.x + 12 + sway, e.y - 26, 26, Math.PI * 1.15, Math.PI * 1.85);
    ctx.fill();
    ctx.strokeStyle = '#8a4a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(e.x + 12 + sway - 24, e.y - 24);
    ctx.lineTo(e.x + 12, e.y);
    ctx.moveTo(e.x + 12 + sway + 24, e.y - 24);
    ctx.lineTo(e.x + 12, e.y);
    ctx.stroke();
  }
  if (frames.every(Boolean)) {
    const f = frames[Math.floor(e.runT * 10) % 4];
    drawSprite(ctx, f, e.x - 8, e.y - 4, e.w + 16, e.h + 4, { flip: e.facing > 0 });
  } else {
    const cx = e.x + 12;
    rect(ctx, cx - 8, e.y + 10, 16, 18, '#8a7a3a');
    rect(ctx, cx - 6, e.y - 2, 12, 12, '#f0c090');
    rect(ctx, cx - 7, e.y - 4, 14, 6, '#5c5024');
    rect(ctx, cx - 4, e.y + 26, 6, 16, '#5c5024');
    rect(ctx, cx + 2, e.y + 26, 6, 16, '#6e6130');
  }
  if (e.state === 'fight') {
    ctx.save();
    ctx.translate(e.x + 12, e.y + 10);
    ctx.rotate(e.aim);
    rect(ctx, 0, -2, 22, 4, '#26262e');
    ctx.restore();
  }
}

// 沙虫：埋伏时只露沙丘，突袭时整条钻出
function drawWorm(ctx, e, time) {
  if (e.state === 'hide') {
    // 沙丘 + 偶尔喷沙（预警）
    ctx.fillStyle = '#c9a860';
    ctx.beginPath();
    ctx.ellipse(e.x + 16, e.y + e.h, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (Math.sin(time * 3 + e.x) > 0.7) {
      ctx.fillStyle = 'rgba(216,184,120,0.7)';
      ctx.fillRect(e.x + 13, e.y + e.h - 14, 3, 8);
      ctx.fillRect(e.x + 18, e.y + e.h - 10, 2, 5);
    }
    return;
  }
  const img = Assets.get('sandworm');
  if (img) {
    drawSprite(ctx, img, e.x - 14, e.y - 10, e.w + 28, e.h + 10, { flip: e.facing > 0 });
    return;
  }
  // 回退：棕黄环节虫体
  const x = e.x, y = e.y;
  for (let i = 0; i < 4; i++) {
    rect(ctx, x + 4 + (i % 2) * 3, y + 12 + i * 9, 24, 8, i % 2 ? '#a8793c' : '#c09448');
  }
  ctx.fillStyle = '#d8b878';
  ctx.beginPath();
  ctx.arc(x + 16, y + 10, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5c3010';
  ctx.beginPath();
  ctx.arc(x + 16, y + 10, 7, 0, Math.PI * 2);
  ctx.fill();
  rect(ctx, x + (e.facing > 0 ? 22 : 6), y + 2, 4, 4, '#ffe95a');
}

function drawPowerup(ctx, p, time) {
  if (p.life < 3 && Math.floor(time * 8) % 2) return; // 快消失时闪烁
  const glow = Math.sin(time * 6) * 0.5 + 0.5;
  const img = Assets.get(`emblem_${p.kind}`);
  if (img) {
    // 徽章图标 + 脉动光环
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,232,122,${0.12 + glow * 0.18})`;
    ctx.beginPath();
    ctx.arc(p.x + 14, p.y + 14, 18 + glow * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const s = 34 + glow * 2;
    ctx.drawImage(img, p.x + 14 - s / 2, p.y + 14 - s / 2, s, s);
    return;
  }
  // 回退：字母盒
  const [edge, body] = WEAPON_COLOR[p.kind] || ['#555', '#999'];
  rect(ctx, p.x, p.y, 28, 28, edge);
  rect(ctx, p.x + 3, p.y + 3, 22, 22, body);
  ctx.fillStyle = `rgba(255,255,255,${0.4 + glow * 0.6})`;
  ctx.font = '900 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.kind, p.x + 14, p.y + 15);
}
