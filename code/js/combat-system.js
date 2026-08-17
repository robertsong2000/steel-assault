// ===================== CombatSystem =====================
// 子弹、Boss/敌人命中、玩家受伤和道具拾取的运行时系统。
// Game 只负责状态机调度；EnemyManager 只负责实体生命周期。
import { CFG, SCORE, WEAPON_LABEL } from './config.js';
import { overlap, circleRect } from './utils.js';
import { LEVEL, laserActive } from './level.js';
import { isContactEnemy, playerProtected, projectileHits } from './combat.js';

export class CombatSystem {
  constructor(game) { this.game = game; }

  steerHoming(b, dt) {
    const g = this.game;
    let tx = null, ty = null, best = Infinity;
    for (const e of g.enemies.list) {
      if (e.remove) continue;
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      const d2 = (cx - b.x) ** 2 + (cy - b.y) ** 2;
      if (d2 < best) { best = d2; tx = cx; ty = cy; }
    }
    if (tx === null && g.boss && !g.boss.done && !g.boss.dead) {
      tx = g.boss.core.x; ty = g.boss.core.y;
    }
    if (tx === null) return;
    const cur = Math.atan2(b.vy, b.vx);
    let diff = Math.atan2(ty - b.y, tx - b.x) - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const sp = Math.hypot(b.vx, b.vy);
    const na = cur + Math.max(-b.homing * dt, Math.min(diff, b.homing * dt));
    b.vx = Math.cos(na) * sp;
    b.vy = Math.sin(na) * sp;
  }

  explodeBullet(b) {
    const g = this.game, r = b.aoe;
    g.particles.explosion(b.x, b.y, r / 70);
    g.audio.sfx('boom');
    g.shake(7);
    if (g.accessibility.flashes) g.hitStop = Math.max(g.hitStop, 0.05);
    const r2 = r * r;
    for (const e of g.enemies.list) {
      if (e.remove) continue;
      const dx = e.x + e.w / 2 - b.x, dy = e.y + e.h / 2 - b.y;
      if (dx * dx + dy * dy <= r2) {
        g.recordHit(b);
        if (g.enemies.damage(e, b.dmg + 1, g.world)) g.recordKill(e, b.type);
      }
    }
    if (g.boss && !g.boss.done) {
      const c = g.boss.core;
      if (!g.boss.dead) {
        const dx = c.x - b.x, dy = c.y - b.y;
        if (dx * dx + dy * dy <= (r + c.r) ** 2) { g.recordHit(b); g.boss.damage('core', b.dmg, g.world); }
      }
      for (const cn of g.boss.cannons) {
        if (cn.alive && circleRect(b.x, b.y, r, cn)) { g.recordHit(b); g.boss.damage(cn, b.dmg, g.world); }
      }
    }
  }

  updateBullets(dt) {
    const g = this.game;
    if (g.bullets.length > 240) g.bullets.splice(0, g.bullets.length - 240);
    for (const b of g.bullets) {
      if (b.homing) this.steerHoming(b, dt);
      if (b.grav) b.vy += b.grav * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) { if (b.aoe) this.explodeBullet(b); b.remove = true; continue; }
      if (b.flame) { b.r = 7 + (1 - b.life / b.maxLife) * 13; b.vy -= 260 * dt; }
      b.trailT -= dt;
      if (b.trailT <= 0) {
        if (b.type === 'H') { g.particles.smoke(b.x, b.y, 0.65); b.trailT = 0.035; }
        else if (b.type === 'G') { g.particles.sparks(b.x, b.y, 1, '#ffd76a'); b.trailT = 0.07; }
        else if (b.type === 'F') { g.particles.sparks(b.x, b.y, 1, '#ff9a50'); b.trailT = 0.09; }
        else b.trailT = 1;
      }
      if (b.x < g.camX - 40 || b.x > g.camX + CFG.W + 40 || b.y < -40 || b.y > CFG.H + 40) b.remove = true;
    }
    for (const b of g.bullets) {
      if (b.remove) continue;
      for (const e of g.enemies.list) {
        if (e.remove || (b.hitSet && b.hitSet.has(e))) continue;
        if (!projectileHits(b, e)) continue;
        if (b.aoe) { this.explodeBullet(b); b.remove = true; break; }
        if (e.type === 'shielder' && !b.flame && Math.sign(b.vx || e.facing) === -e.facing) {
          g.particles.sparks(b.x, b.y, 4, '#c8ccdc'); g.audio.sfx('bossHit'); b.remove = true; break;
        }
        g.recordHit(b);
        if (g.enemies.damage(e, b.dmg, g.world)) g.recordKill(e, b.type);
        g.particles.sparks(b.x, b.y, 5, b.flame ? '#ff9a50' : '#ffe0a0');
        if (b.pierce) b.hitSet.add(e); else { b.remove = true; break; }
      }
    }
    if (g.boss && !g.boss.done) {
      for (const b of g.bullets) {
        if (b.remove) continue;
        const part = g.boss.hitTest(b);
        if (!part) continue;
        const key = part === 'core' ? 'core' : part;
        if (b.hitSet && b.hitSet.has(key)) continue;
        if (b.aoe) { this.explodeBullet(b); b.remove = true; continue; }
        g.recordHit(b); g.boss.damage(part, b.dmg, g.world);
        g.particles.sparks(b.x, b.y, 5, b.flame ? '#ff9a50' : '#ffd0a0');
        if (b.pierce) b.hitSet.add(key); else b.remove = true;
      }
    }
    for (const b of g.bullets) {
      if (b.remove || b.flame) continue;
      for (const s of LEVEL.solids) {
        if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h) {
          if (b.aoe) this.explodeBullet(b); else g.particles.sparks(b.x, b.y, 4, b.type === 'L' ? '#9ae8ff' : '#c8c8d8');
          b.remove = true; break;
        }
      }
    }
    g.bullets = g.bullets.filter((b) => !b.remove);
    g.world.bullets = g.bullets;
  }

  checkCollisions() {
    const g = this.game, p = g.player;
    if (p.dead) return;
    const pr = { x: p.x, y: p.y, w: p.w, h: p.h };
    if (!playerProtected(p)) {
      for (const b of g.enemies.bullets) if (projectileHits(b, pr)) { g.killPlayer(); return; }
      for (const e of g.enemies.list) if (isContactEnemy(e) && overlap(e, pr)) { g.killPlayer(); return; }
    }
    if (LEVEL.lasers && !playerProtected(p)) {
      for (const laser of LEVEL.lasers) {
        if (laserActive(laser, g.time) && overlap({ x: laser.x - 3, y: CFG.GROUND_Y - laser.h, w: 6, h: laser.h }, pr)) { g.killPlayer(); return; }
      }
    }
    for (const pw of g.enemies.powerups) {
      if (!overlap(pw, pr)) continue;
      pw.remove = true;
      if (pw.kind === 'B') p.shieldT = 10;
      else if (!g.challenge?.weapon) p.weapon = pw.kind;
      const row = g.stats.weapons[pw.kind] ??= { shots: 0, hits: 0, kills: 0, pickups: 0, time: 0 };
      row.pickups++;
      g.audio.sfx('powerup'); g.addScore(SCORE.powerup, pw.x, pw.y);
      g.particles.text(pw.x + 14, pw.y - 24, WEAPON_LABEL[pw.kind] || '新武器!', '#6aff8a');
    }
    g.enemies.powerups = g.enemies.powerups.filter((pw) => !pw.remove);
  }
}
