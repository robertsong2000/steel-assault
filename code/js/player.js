// ===================== 玩家：跑/跳/蹲/八方向射击/死亡重生 =====================
import { CFG, WEAPONS } from './config.js';
import { clamp, physicsMove, rect } from './utils.js';
import { LEVEL } from './level.js';
import { Assets, drawSprite } from './assets.js';

export class Player {
  constructor() {
    this.lives = CFG.START_LIVES;
    this.x = 120; this.y = 100;
    this.w = CFG.PLAYER_W; this.h = CFG.PLAYER_H;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.aimX = 1; this.aimY = 0;
    this.gunAngle = 0;
    this.crouch = false;
    this.weapon = 'R';
    this.fireCd = 0;
    this.runT = 0;
    this.dead = false;
    this.deathT = 0;
    this.inv = 0;
    this.shieldT = 0;    // B 防护罩剩余秒数（期间无敌，掉坑除外）
    this.coyote = 0;     // 土狼时间：离开平台边缘后短暂可跳
    this.jumpBuf = 0;    // 跳跃缓冲：提前按跳，落地立即起跳
    this.lastSafe = { x: 120, y: 100 };
  }

  reset(lives) {
    this.lives = lives;
    this.respawn(120, CFG.GROUND_Y - CFG.PLAYER_H);
    this.inv = 0;
  }

  respawn(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.h = CFG.PLAYER_H;
    this.dead = false;
    this.deathT = 0;
    this.inv = CFG.RESPAWN_INV;
    this.shieldT = 0;
    this.weapon = 'R';       // 经典规则：死亡掉武器
    this.crouch = false;
    this.lastSafe = { x, y };
  }

  die() {
    if (this.dead || this.inv > 0 || this.shieldT > 0) return false;
    this.dead = true;
    this.deathT = 0;
    this.vy = -560;
    this.vx = -90 * this.facing;
    return true;
  }

  update(dt, input, world) {
    if (this.dead) {
      this.deathT += dt;
      this.vy += CFG.GRAV * 0.7 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return;
    }
    this.inv = Math.max(0, this.inv - dt);
    this.shieldT = Math.max(0, this.shieldT - dt);
    this.fireCd = Math.max(0, this.fireCd - dt);

    const l = input.isDown('left'), r = input.isDown('right');
    const u = input.isDown('up'), d = input.isDown('down');

    // 蹲姿切换（保持脚底不动）
    const wantCrouch = d && this.onGround && !u;
    const newH = wantCrouch ? CFG.CROUCH_H : CFG.PLAYER_H;
    if (newH !== this.h) {
      this.y += this.h - newH;
      this.h = newH;
    }
    this.crouch = wantCrouch;

    // 水平移动（流沙中减速）
    const spd = this.inQuicksand ? CFG.RUN_SPEED * 0.5 : CFG.RUN_SPEED;
    this.vx = this.crouch ? 0 : (r ? spd : l ? -spd : 0);
    if (this.vx !== 0) this.runT += dt;

    // 八方向瞄准
    let ax = l ? -1 : r ? 1 : 0;
    let ay = 0;
    if (u) ay = -1;
    else if (d && !this.onGround) ay = 1;   // 空中可朝下射击
    if (ax !== 0) this.facing = ax;
    if (ax === 0 && ay === 0) ax = this.facing;
    if (this.crouch) { ax = this.facing; ay = 0; }
    if (ax !== 0 && ay !== 0) { ax *= 0.7071; ay *= 0.7071; }
    this.aimX = ax; this.aimY = ay;
    this.gunAngle = Math.atan2(ay, ax);

    // 跳跃（土狼时间 + 跳跃缓冲；流沙中跳不高）
    if (this.onGround) this.coyote = 0.1;
    else this.coyote = Math.max(0, this.coyote - dt);
    if (input.wasPressed('jump')) this.jumpBuf = 0.12;
    else this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    if (this.jumpBuf > 0 && (this.onGround || this.coyote > 0)) {
      this.vy = -CFG.JUMP_V * (this.inQuicksand ? 0.78 : 1);
      this.jumpBuf = 0;
      this.coyote = 0;
      world.audio.sfx('jump');
    }
    // 可变跳高：松开跳跃键后上升快速衰减（点按小跳、长按大跳）
    if (!input.isDown('jump') && this.vy < 0) this.vy += CFG.GRAV * 1.6 * dt;

    // 射击
    if (input.isDown('shoot') && this.fireCd <= 0) this.fire(world);

    // 物理
    this.vy = Math.min(this.vy + CFG.GRAV * dt, CFG.MAX_FALL);
    physicsMove(this, LEVEL.solids, LEVEL.oneways, dt);

    // 镜头边界：不能退到屏幕外
    this.x = clamp(this.x, world.camX + 4, world.camX + CFG.W - this.w - 4);

    // 落坑
    if (this.y > CFG.H + 60) {
      world.onPitDeath();
      return;
    }
    if (this.onGround && !this.inQuicksand) this.lastSafe = { x: this.x, y: this.y };
  }

  fire(world) {
    const w = WEAPONS[this.weapon];
    this.fireCd = w.cd;
    if (world.stats) world.stats.shots += this.weapon === 'S' ? w.fan : 1;
    const sx = this.x + this.w / 2;
    const sy = this.y + (this.crouch ? 8 : 16);
    const mx = sx + this.aimX * 24;
    const my = sy + this.aimY * 24;
    const base = Math.atan2(this.aimY, this.aimX);
    // 按武器类型组装子弹字段
    const mk = (ang) => {
      const b = {
        x: mx, y: my,
        vx: Math.cos(ang) * w.speed,
        vy: Math.sin(ang) * w.speed,
        r: w.flame ? 7 : 4,
        type: this.weapon,
        dmg: w.dmg || 1,
        life: w.life || 3,
        maxLife: w.life || 3,
        trailT: 0,
      };
      if (w.pierce) { b.pierce = true; b.hitSet = new Set(); }
      if (w.aoe) b.aoe = w.aoe;
      if (w.homing) b.homing = w.homing;
      if (w.grav) {
        b.grav = w.grav;
        if (this.aimY >= 0) b.vy -= w.speed * 0.42; // 平射/下射时上挑成抛物线
      }
      if (w.flame) b.flame = true;
      return b;
    };
    const SFX = { M: 'shoot', S: 'spread', L: 'laser', G: 'launch', H: 'launch', F: 'flame' };
    if (this.weapon === 'S') {
      const n = w.fan;
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * (w.spread / (n - 1)) * 2;
        world.bullets.push(mk(a));
      }
    } else if (this.weapon === 'F') {
      // 火焰：随机散射的短射程粒子弹
      world.bullets.push(mk(base + (Math.random() - 0.5) * 0.22));
    } else {
      const jitter = w.jitter ? (Math.random() - 0.5) * w.jitter * 2 : 0;
      world.bullets.push(mk(base + jitter));
    }
    world.audio.sfx(SFX[this.weapon] || 'shoot');
    world.particles.muzzle(mx, my, base);
  }

  // ---- 绘制 ----
  draw(ctx, time) {
    if (this.inv > 0 && !this.dead && Math.floor(time * 14) % 2) return; // 无敌闪烁
    ctx.save();
    const cx = this.x + this.w / 2;
    // 脚下落影（增加落地感，雪地上尤其清晰）
    if (!this.dead && this.onGround) {
      ctx.fillStyle = 'rgba(10,20,40,0.28)';
      ctx.beginPath();
      ctx.ellipse(cx, this.y + this.h + 3, this.w * 0.72, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // B 防护罩：蓝色能量泡
    if (this.shieldT > 0 && !this.dead) {
      const pulse = Math.sin(time * 6) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(122,208,255,${0.5 + pulse * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, this.y + this.h / 2, this.w * 0.9 + pulse * 3, this.h * 0.62 + pulse * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(122,208,255,${0.08 + pulse * 0.06})`;
      ctx.fill();
    }
    if (this.dead) {
      ctx.translate(cx, this.y + this.h / 2);
      ctx.rotate(this.deathT * 9 * this.facing);
      ctx.translate(-cx, -(this.y + this.h / 2));
    }
    const x = this.x, y = this.y;
    const camo = { snow: 'player_snow', base: 'player_base', desert: 'player_desert' }[LEVEL.theme] || 'player';
    const frames = [0, 1, 2, 3].map((i) => Assets.get(`${camo}_${i}`));
    const snow = LEVEL.theme === 'snow';
    if (frames.every(Boolean)) {
      // 精灵图模式：身体用图，枪仍代码绘制以支持八方向瞄准
      let f;
      if (this.crouch) f = frames[3];
      else if (!this.onGround) f = frames[2];
      else if (Math.abs(this.vx) > 1) f = frames[Math.floor(this.runT * 10) % 2];
      else f = frames[0];
      drawSprite(ctx, f, x - 9, y - 4, this.w + 18, this.h + 4, { flip: this.facing < 0 });
      this.drawGun(ctx, cx, y + (this.crouch ? 8 : 16));
      ctx.restore();
      return;
    }
    // ---- 代码手绘回退 ----
    const skin = '#f0c090';
    const theme = LEVEL.theme;
    const pants = snow ? '#8a4a16' : theme === 'base' ? '#262c3a' : theme === 'desert' ? '#8a6a3a' : '#2f6e3e';
    const pantsDk = snow ? '#5f320d' : theme === 'base' ? '#1a1e28' : theme === 'desert' ? '#5f4a26' : '#265732';
    const vest = snow ? '#f4902c' : theme === 'base' ? '#454e66' : theme === 'desert' ? '#b08a4a' : '#3f8f4f';
    const helmet = snow ? '#c96a10' : theme === 'base' ? '#2a2f3d' : theme === 'desert' ? '#7a5c30' : '#2c5a34';
    const dark = '#1c1c22';

    if (this.crouch) {
      // 蹲姿
      rect(ctx, x + 2, y + this.h - 10, 22, 10, pants);
      rect(ctx, x + 3, y + 4, 20, 16, vest);
      rect(ctx, x + 6, y - 6, 14, 12, skin);
      rect(ctx, x + 5, y - 8, 16, 7, helmet); // 头盔
      this.drawGun(ctx, cx, y + 8);
    } else if (!this.onGround) {
      // 空中收腿
      rect(ctx, x + 4, y + 30, 8, 14, pants);
      rect(ctx, x + 14, y + 32, 8, 12, pantsDk);
      rect(ctx, x + 3, y + 10, 20, 22, vest);
      rect(ctx, x + 6, y - 2, 14, 12, skin);
      rect(ctx, x + 5, y - 4, 16, 7, helmet);
      this.drawGun(ctx, cx, y + 16);
    } else {
      // 站立/跑动
      const moving = Math.abs(this.vx) > 1;
      const legA = moving ? Math.sin(this.runT * 16) * 8 : 0;
      rect(ctx, x + 5 + legA, y + 30, 7, 16, pants);
      rect(ctx, x + 14 - legA, y + 30, 7, 16, pantsDk);
      rect(ctx, x + 5 + legA, y + 44, 8, 4, dark);  // 靴
      rect(ctx, x + 14 - legA, y + 44, 8, 4, dark);
      rect(ctx, x + 3, y + 10, 20, 22, vest);
      rect(ctx, x + 3, y + 10, 20, 5, snow ? '#d8722c' : theme === 'base' ? '#5a6478' : theme === 'desert' ? '#c9a060' : '#357a42');  // 肩甲
      rect(ctx, x + 6, y - 2, 14, 12, skin);
      rect(ctx, x + 5, y - 4, 16, 7, helmet);   // 头盔
      rect(ctx, x + (this.facing > 0 ? 16 : 5), y + 3, 4, 3, '#1c1c22'); // 眼
      this.drawGun(ctx, cx, y + 16);
    }
    ctx.restore();
  }

  drawGun(ctx, sx, sy) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.gunAngle);
    rect(ctx, 0, -3, 26, 6, '#2b2b33');
    rect(ctx, 18, -2, 10, 4, '#55565e');
    rect(ctx, -4, -4, 8, 8, LEVEL.theme === 'snow' ? '#f4902c' : LEVEL.theme === 'base' ? '#454e66' : LEVEL.theme === 'desert' ? '#b08a4a' : '#3f8f4f'); // 手臂
    ctx.restore();
  }
}
