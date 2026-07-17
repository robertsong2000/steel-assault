// ===================== 粒子特效：爆炸/火花/枪口焰/浮动文字 =====================
import { rand, chance } from './utils.js';

export class Particles {
  constructor() {
    this.list = [];
    this.texts = [];
  }

  clear() {
    this.list.length = 0;
    this.texts.length = 0;
  }

  spawn(x, y, o = {}) {
    this.list.push({
      x, y,
      vx: o.vx || 0, vy: o.vy || 0,
      life: o.life || 0.4, max: o.life || 0.4,
      size: o.size || 4, color: o.color || '#ffcc55',
      grav: o.grav !== undefined ? o.grav : 600,
      type: o.type || 'dot',
    });
  }

  muzzle(x, y, ang) {
    for (let i = 0; i < 4; i++) {
      const a = ang + rand(-0.35, 0.35);
      const sp = rand(200, 420);
      this.spawn(x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.05, 0.12), size: rand(3, 6),
        color: chance(0.5) ? '#fff2a0' : '#ffb830', grav: 0,
      });
    }
    this.spawn(x, y, { life: 0.06, size: 14, color: '#ffe9a0', type: 'flash', grav: 0 });
  }

  sparks(x, y, n = 6, color = '#ffd080') {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(60, 260);
      this.spawn(x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: rand(0.15, 0.35), size: rand(2, 4), color,
      });
    }
  }

  explosion(x, y, scale = 1) {
    const n = Math.floor(20 * scale);
    const colors = ['#fff2a0', '#ffb830', '#ff6a2a', '#e83a1c', '#666'];
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, 300) * scale;
      this.spawn(x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
        life: rand(0.25, 0.6), size: rand(3, 8) * scale,
        color: colors[Math.floor(rand(0, colors.length))],
      });
    }
    this.spawn(x, y, { life: 0.12, size: 34 * scale, color: '#fff6c8', type: 'flash', grav: 0 });
    this.spawn(x, y, { life: 0.3, size: 10 * scale, color: '#ffb830', type: 'ring', grav: 0 });
  }

  bigExplosion(x, y) {
    this.explosion(x, y, 2.2);
    this.explosion(x + rand(-40, 40), y + rand(-40, 40), 1.5);
    this.spawn(x, y, { life: 0.5, size: 20, color: '#fff', type: 'ring', grav: 0 });
  }

  text(x, y, str, color = '#ffe95a') {
    this.texts.push({ x, y, str, color, life: 0.9, max: 0.9 });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'ring') p.size += 320 * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 46 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.list) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      if (p.type === 'flash') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a + 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * a + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.restore();
    ctx.save();
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life / t.max);
      ctx.fillStyle = t.color;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.restore();
  }
}
