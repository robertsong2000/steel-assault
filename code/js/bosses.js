// ===================== Boss 注册表：关卡 def.boss → 类 =====================
import { Boss } from './boss.js';
import { YetiBoss } from './yeti.js';
import { MechBoss } from './mech.js';
import { HeliBoss } from './heli.js';
import { LavaBeast } from './lavabeast.js';
import { TitanBoss } from './titan.js';
import { DrillBoss } from './drill.js';
import { WardenBoss } from './warden.js';
import { OverlordBoss } from './overlord.js';

export const BOSS_CLASSES = {
  fortress: Boss,
  yeti: YetiBoss,
  mech: MechBoss,
  heli: HeliBoss,
  beast: LavaBeast,
  titan: TitanBoss,
  drill: DrillBoss,
  warden: WardenBoss,
  overlord: OverlordBoss,
};
