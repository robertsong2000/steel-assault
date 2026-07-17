// ===================== 敌人 & 敌方子弹 & 武器道具 =====================
import { CFG } from './config.js';
import { rand, chance, clamp, overlap, physicsMove, rect } from './utils.js';
import { LEVEL, groundTopAt } from './level.js';
import { Assets, drawSprite } from './assets.js';

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
      const top = groundTopAt(x) ?? CFG.GROUND_Y;
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

  spawnPowerup(x, y, kind) {
    this.powerups.push({ x: x - 14, y, w: 28, h: 28, vx: 0, vy: -260, kind, landed: false, life: 12, onGround: false });
  }

  // ---- 子弹 ----
  fireAimed(x, y, tx, ty, speed = CFG.EBULLET_SPEED, spreadAng = 0) {
    let a = Math.atan2(ty - y, tx - x) + spreadAng;
    this.bullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 4 });
  }

  fireFan(x, y, tx, ty, count, fanAngle, speed = CFG.EBULLET_SPEED + 20) {
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
      world.audio.sfx('bossHit');
      return false;
    }
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    world.particles.explosion(cx, cy, 1);
    world.audio.sfx('explode');
    const scoreMap = { runner: 100, sniper: 200, turret: 300, drone: 150 };
    const sc = scoreMap[e.type] || 100;
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
                this.fireAimed(e.x + 13, e.y + 10, px, py, CFG.EBULLET_SPEED + 30);
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
      }
    }
    this.list = this.list.filter((e) => !e.remove);

    // 敌方子弹
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < camX - 60 || b.x > camX + CFG.W + 60 || b.y < -60 || b.y > CFG.H + 60) b.remove = true;
      else {
        for (const s of LEVEL.solids) {
          if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h) {
            world.particles.sparks(b.x, b.y, 4, '#ffca7a');
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
    }
    // 敌方子弹
    for (const b of this.bullets) {
      rect(ctx, b.x - 4, b.y - 4, 8, 8, '#ff5a3c');
      rect(ctx, b.x - 2, b.y - 2, 4, 4, '#ffd0a0');
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

function drawPowerup(ctx, p, time) {
  if (p.life < 3 && Math.floor(time * 8) % 2) return; // 快消失时闪烁
  const glow = Math.sin(time * 6) * 0.5 + 0.5;
  rect(ctx, p.x, p.y, 28, 28, p.kind === 'S' ? '#a3272e' : '#2757a3');
  rect(ctx, p.x + 3, p.y + 3, 22, 22, p.kind === 'S' ? '#e0434b' : '#3f7ee0');
  ctx.fillStyle = `rgba(255,255,255,${0.4 + glow * 0.6})`;
  ctx.font = '900 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.kind, p.x + 14, p.y + 15);
}
