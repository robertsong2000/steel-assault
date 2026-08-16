// ===================== 全局配置（调参都集中在这里） =====================
export const CFG = {
  W: 960,                 // 逻辑分辨率宽
  H: 540,                 // 逻辑分辨率高
  GRAV: 2400,             // 重力 px/s^2
  RUN_SPEED: 280,         // 玩家跑动速度
  JUMP_V: 830,            // 起跳速度
  MAX_FALL: 1050,         // 最大下落速度
  BULLET_SPEED: 740,      // 玩家子弹速度
  EBULLET_SPEED: 250,     // 敌方子弹速度
  PLAYER_W: 26,
  PLAYER_H: 46,
  CROUCH_H: 28,
  START_LIVES: 3,
  RESPAWN_INV: 2.5,       // 重生无敌秒数
  LEVEL_W: 5300,          // 关卡总长
  GROUND_Y: 470,          // 地面顶面高度
  BOSS_TRIGGER_X: 4460,   // 玩家越过此 x 触发 Boss
  ARENA_WALL_X: 5010,     // Boss 墙左缘（玩家不可越过）
};

// 武器参数：射速/子弹速度/冷却/伤害/特殊行为
// pierce=穿透敌人  aoe=爆炸半径  homing=追踪转向速率(rad/s)
// grav=受重力(抛物线)  flame=火焰(短射程/变大)  life=子弹存活秒数
export const WEAPONS = {
  R: { cd: 0.18,  speed: 740,  dmg: 1,   name: 'RIFLE'   },
  M: { cd: 0.085, speed: 800,  dmg: 1,   jitter: 0.05, name: 'MACHINE' },
  S: { cd: 0.30,  speed: 700,  dmg: 1,   fan: 5, spread: 0.5, name: 'SPREAD' },
  L: { cd: 0.26,  speed: 1150, dmg: 2,   pierce: true, name: 'LASER'   },
  G: { cd: 0.60,  speed: 620,  dmg: 2,   aoe: 110, grav: 1300, name: 'GRENADE' },
  H: { cd: 0.40,  speed: 430,  dmg: 2,   aoe: 85,  homing: 6.5, name: 'HOMING'  },
  F: { cd: 0.05,  speed: 540,  dmg: 0.6, pierce: true, flame: true, life: 0.62, name: 'FLAME' },
};

// 拾取提示文案
export const WEAPON_LABEL = {
  M: '机枪!', S: '散弹枪!', L: '激光枪!', G: '榴弹发射器!', H: '追踪导弹!', F: '火焰喷射器!',
  B: '防护罩!',
};

// 补给箱配色 [边框, 主体]
export const WEAPON_COLOR = {
  M: ['#2757a3', '#3f7ee0'],
  S: ['#a3272e', '#e0434b'],
  L: ['#1a7a8c', '#39d0e8'],
  G: ['#3a6e2c', '#5fae4a'],
  H: ['#8c4d12', '#e88a2a'],
  F: ['#8c2f12', '#e8552a'],
  B: ['#8c6a12', '#e8c82a'],
};

export const SCORE = { runner: 100, sniper: 200, turret: 300, drone: 150, cannon: 500, boss: 5000, powerup: 500 };

// 难度：命数 + 敌弹速度倍率
export const DIFFS = [
  { name: '简单', lives: 5, mul: 0.85 },
  { name: '经典', lives: 3, mul: 1.0 },
  { name: '硬核', lives: 1, mul: 1.2 },
];

// 每关 BGM 变奏（移调半音 + 速度）
export const LEVEL_MUSIC = [
  { transpose: 0, bpm: 150 },   // 丛林 原版
  { transpose: 4, bpm: 154 },   // 雪原 高四度冷冽
  { transpose: -2, bpm: 146 },  // 基地 低沉闷
  { transpose: 2, bpm: 156 },   // 战舰 明亮
  { transpose: -4, bpm: 158 },  // 遗迹 紧张
  { transpose: 3, bpm: 162 },   // 火山 急促
  { transpose: -3, bpm: 166 },  // 雷暴废城 低沉急促
];
