// ===================== 粒子特效：爆炸/火花/烟雾/碎石/灼痕/枪口焰/浮动文字 =====================
import { rand, chance } from './utils.js';
import { Assets } from './assets.js';

const MAX_PARTICLES = 320;
const MAX_TEXTS = 24;

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
    // 性能护栏：超出上限丢弃最老粒子
    if (this.list.length >= MAX_PARTICLES) this.list.shift();
    this.list.push({
      x, y,
      vx: o.vx || 0, vy: o.vy || 0,
      life: o.life || 0.4, max: o.life || 0.4,
      size: o.size || 4, color: o.color || '#ffcc55',
      grav: o.grav !== undefined ? o.grav : 600,
      type: o.type || 'dot',
      grow: o.grow || 0,          // 尺寸增速 px/s（烟雾/冲击环用）
      rot: o.rot || 0, vr: o.vr || 0, // 碎石旋转
      frames: o.frames || null, fps: o.fps || 12, // 序列帧动画
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

  // 导弹尾烟 / 通用烟团（普通混合，灰白上升扩散）
  smoke(x, y, scale = 1, color = null) {
    this.spawn(x, y, {
      vx: rand(-24, 24), vy: rand(-46, -10),
      life: rand(0.35, 0.7), size: rand(5, 9) * scale,
      color: color || (chance(0.5) ? '#9a9aa8' : '#c0c0cc'),
      type: 'smoke', grav: -90, grow: 30 * scale,
    });
  }

  // 爆炸：序列帧火球 + 火星 + 碎石 + 烟雾 + 闪光 + 冲击环 + 地面灼痕
  explosion(x, y, scale = 1) {
    // AI 生成的爆炸序列帧（缺失时纯粒子回退）
    const frames = [0, 1, 2, 3].map((i) => Assets.get(`explode_${i}`)).filter(Boolean);
    if (frames.length === 4) {
      this.spawn(x, y, {
        life: 0.42, size: 130 * scale, type: 'anim',
        frames, fps: 10, grav: 0,
      });
    }
    // 火星
    const n = Math.floor(16 * scale);
    const colors = ['#fff2a0', '#ffb830', '#ff6a2a', '#e83a1c'];
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, 300) * scale;
      this.spawn(x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
        life: rand(0.25, 0.6), size: rand(3, 7) * scale,
        color: colors[Math.floor(rand(0, colors.length))],
      });
    }
    // 碎石（旋转的深色碎块，受重力抛洒）
    const nc = Math.floor(7 * scale);
    for (let i = 0; i < nc; i++) {
      const a = rand(-Math.PI, 0); // 向上半球抛出
      const sp = rand(120, 380) * scale;
      this.spawn(x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.4, 0.9), size: rand(3, 7) * scale,
        color: chance(0.5) ? '#3a3430' : '#5a4a3a',
        type: 'chunk', grav: 1500,
        rot: rand(0, Math.PI), vr: rand(-14, 14),
      });
    }
    // 烟雾（滞后升腾）
    for (let i = 0; i < Math.floor(5 * scale); i++) {
      this.spawn(x + rand(-14, 14) * scale, y + rand(-10, 10) * scale, {
        vx: rand(-18, 18), vy: rand(-60, -20),
        life: rand(0.5, 1.0), size: rand(8, 14) * scale,
        color: chance(0.5) ? '#8a8a96' : '#6a6a76',
        type: 'smoke', grav: -70, grow: 36 * scale,
      });
    }
    // 闪光 + 冲击环
    this.spawn(x, y, { life: 0.12, size: 36 * scale, color: '#fff6c8', type: 'flash', grav: 0 });
    this.spawn(x, y, { life: 0.32, size: 10 * scale, color: '#ffb830', type: 'ring', grav: 0, grow: 340 * scale });
    // 地面灼痕（残留几秒）
    this.spawn(x, y + 6, { life: 2.6, size: 30 * scale, color: '#14100c', type: 'scorch', grav: 0 });
  }

  bigExplosion(x, y) {
    this.explosion(x, y, 2.2);
    this.explosion(x + rand(-40, 40), y + rand(-40, 40), 1.5);
    this.spawn(x, y, { life: 0.5, size: 20, color: '#fff', type: 'ring', grav: 0, grow: 420 });
  }

  text(x, y, str, color = '#ffe95a') {
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
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
      if (p.grow) p.size += p.grow * dt;
      if (p.vr) p.rot += p.vr * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 46 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  draw(ctx) {
    // 第一遍：普通混合（灼痕/烟雾/序列帧）
    ctx.save();
    for (const p of this.list) {
      const a = Math.max(0, p.life / p.max);
      if (p.type === 'scorch') {
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * (1.2 - a * 0.2), p.size * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'smoke') {
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'anim') {
        const idx = Math.min(p.frames.length - 1, Math.floor((1 - a) * p.frames.length));
        const img = p.frames[idx];
        ctx.globalAlpha = Math.min(1, a * 3); // 末尾淡出
        ctx.drawImage(img, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.restore();
    // 第二遍：加色发光（火星/闪光/冲击环/碎石）
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
      } else if (p.type === 'chunk') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else if (p.type === 'dot') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.restore();
    // 浮动文字
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
