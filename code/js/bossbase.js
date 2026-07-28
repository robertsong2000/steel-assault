// ===================== BaseBoss：五个 Boss 的公共抽象 =====================
// 收敛五胞胎复制粘贴：公共字段 / phase2 半血狂暴 / 死亡连锁爆炸序列 updateDying /
// damage 核心扣分模式（killScore 为子类字段）。子类只保留各自的移动/攻击/绘制逻辑。
import { rand } from './utils.js';

export class BaseBoss {
  constructor() {
    this.cannons = [];
    this.dead = false;   // 核心已毁，播放连锁爆炸
    this.done = false;   // 爆炸演完 → 胜利
    this.dyingT = 0;
    this.boomT = 0;
    this.flash = 0;
    this.clearText = '';
    this.title = '';
    // ---- 死亡演出可覆写参数 ----
    this.dyingBoomInterval = 0.1;   // 连锁爆炸间隔
    this.dyingDuration = 1.8;       // 演出总时长
    this.dyingShake = 6;            // 每次爆炸震屏强度
    this.killScore = 5000;          // 击杀分数（子类覆写）
  }

  // 半血狂暴判断
  get phase2() { return this.core.hp <= this.core.max / 2; }

  // 连锁爆炸的火花位置（子类按体型/场景覆写）
  dyingBoomPos() {
    return { x: this.core.x, y: this.core.y, s: rand(0.8, 1.6) };
  }

  // 死亡演出中的每帧附加行为（直升机失控下坠 / 巨兽沉浆，子类按需覆写）
  dyingTick(dt, world) {}

  // 演出结束条件（直升机触地提前终爆，子类可覆写）
  dyingFinished() { return this.dyingT > this.dyingDuration; }

  // 终爆位置
  finalBoomPos() { return { x: this.core.x, y: this.core.y }; }

  // 死亡连锁爆炸序列：火花连爆 → 终爆 → done
  updateDying(dt, world) {
    const { particles, audio } = world;
    this.dyingT += dt;
    this.boomT -= dt;
    if (this.boomT <= 0) {
      this.boomT = this.dyingBoomInterval;
      const p = this.dyingBoomPos();
      particles.explosion(p.x, p.y, p.s);
      audio.sfx('explode');
      world.shake(this.dyingShake);
    }
    this.dyingTick(dt, world);
    if (this.dyingFinished()) {
      this.done = true;
      const f = this.finalBoomPos();
      particles.bigExplosion(f.x, f.y);
      audio.sfx('bigExplode');
      world.shake(18);
    }
  }

  // 击杀给分飘字位置（子类覆写）
  scorePos() { return { x: this.core.x, y: this.core.y }; }

  // damage 核心扣分模式：'core' 全额伤害 / 其他部位减半，击杀分数为子类字段
  damage(part, dmg, world) {
    if (this.dead) return;
    this.core.hp -= part === 'core' ? dmg : dmg * 0.5;
    this.flash = 0.08;
    world.audio.sfx('bossHit');
    if (this.core.hp <= 0) {
      this.dead = true;
      this.dyingT = 0;
      const s = this.scorePos();
      world.addScore(this.killScore, s.x, s.y);
    }
  }
}
