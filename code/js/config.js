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

// 武器参数：射速/子弹速度/冷却
export const WEAPONS = {
  R: { cd: 0.22, speed: 740, name: 'RIFLE'  },
  M: { cd: 0.085, speed: 800, jitter: 0.05, name: 'MACHINE' },
  S: { cd: 0.30, speed: 700, fan: 5, spread: 0.5, name: 'SPREAD' },
};

export const SCORE = { runner: 100, sniper: 200, turret: 300, drone: 150, cannon: 500, boss: 5000, powerup: 500 };
