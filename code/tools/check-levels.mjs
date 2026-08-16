// ===================== 关卡数据校验（回归护栏） =====================
// 用法：cd code && node tools/check-levels.mjs
// 校验：Boss 配置 / 敌人站位 / 触发线越界 / 刷兵点与出生点地面 /
//       水面与流沙不在实体上 / 激光门高度 / Boss 注册表覆盖
import { LEVELS, LEVEL, setLevel, groundTopAt } from '../js/level.js';
import { CFG } from '../js/config.js';
import { BOSS_CLASSES } from '../js/bosses.js';

let fail = 0;
const err = (m) => { console.error('ERR', m); fail++; };

LEVELS.forEach((lv, i) => {
  setLevel(i);
  // Boss 配置
  if (!lv.boss) err(`L${i} missing boss type`);
  else if (!BOSS_CLASSES[lv.boss]) err(`L${i} unknown boss "${lv.boss}"（需注册 BOSS_CLASSES）`);
  // CFG 边界同步
  if (CFG.LEVEL_W !== lv.width || CFG.ARENA_WALL_X !== lv.wallX || CFG.BOSS_TRIGGER_X !== lv.bossTriggerX) {
    err(`L${i} CFG sync fail`);
  }
  // 固定敌人脚下有恰好等高的支撑面
  const fixed = [...lv.turrets, ...lv.snipers, ...(lv.grenadiers || []), ...(lv.shielders || [])];
  for (const e of fixed) {
    const ok = [...lv.solids, ...lv.oneways].some(
      (s) => e.x >= s.x && e.x <= s.x + s.w && Math.abs(s.y - e.y) <= 1
    );
    if (!ok) err(`L${i} enemy@${e.x},${e.y} no matching platform`);
  }
  // 触发线不越界
  for (const t of lv.triggers) if (t.x >= lv.width) err(`L${i} trigger@${t.x} out of bounds`);
  // 出生点与 Boss 竞技场有地面
  if (groundTopAt(120) === null) err(`L${i} spawn no ground`);
  if (groundTopAt(lv.wallX - 100) === null) err(`L${i} arena no ground`);
  // 水面中段不能有实体地面（允许桥/单向平台跨越）
  for (const [x0, x1] of lv.waters) {
    const mid = (x0 + x1) / 2;
    if (lv.solids.some((s) => mid >= s.x && mid <= s.x + s.w)) err(`L${i} water [${x0},${x1}] over solid`);
  }
  // 沙虫埋伏点有地面
  for (const wm of lv.sandworms || []) {
    if (groundTopAt(wm.x) === null) err(`L${i} sandworm@${wm.x} no ground`);
  }
  // 激光门必须在地面上且高度合法
  for (const g of lv.lasers || []) {
    if (groundTopAt(g.x) === null) err(`L${i} laser@${g.x} over pit`);
    if (g.h !== 110 && g.h !== 240) err(`L${i} laser@${g.x} unexpected h=${g.h}`);
  }
  // 流沙坑下不能有实体地面（否则玩家不会陷进去）
  for (const p of lv.oneways.filter((p) => p.kind === 'quicksand')) {
    const mid = p.x + p.w / 2;
    if (lv.solids.some((s) => mid >= s.x && mid <= s.x + s.w && s.y <= p.y)) {
      err(`L${i} quicksand@${p.x} has solid beneath`);
    }
  }
  // 平台可达性：跳跃极限 ~143px，每个高台必须有 140px 内的踏脚点（实体岩石也算）
  const MAXJ = 140;
  const GY = CFG.GROUND_Y;
  const surfaces = [...lv.solids, ...lv.oneways];
  for (const p of lv.oneways) {
    if (p.kind === 'quicksand') continue;
    if (GY - p.y <= MAXJ) continue;   // 地面直跳可达
    const hasStep = surfaces.some((q) => q !== p && Math.abs(q.y - p.y) <= MAXJ &&
      !(q.x > p.x + p.w + 200 || p.x > q.x + q.w + 200));
    if (!hasStep) err(`L${i} platform@${p.x},y=${p.y} unreachable (needs ${GY - p.y}px jump)`);
  }
  // 移动平台最高点也必须可达
  for (const p of lv.oneways.filter((p) => p.move)) {
    const topY = p.y - p.move.range;
    if (GY - topY > MAXJ) err(`L${i} mover@${p.x} top=${topY} unreachable (needs ${GY - topY}px jump)`);
  }
  console.log(
    `L${i} ${lv.name} boss=${lv.boss} mul=${lv.ebulletMul || 1} ` +
    `enemies=${fixed.length}+${(lv.sandworms || []).length} triggers=${lv.triggers.length} OK`
  );
});

if (fail) { console.error(`\n${fail} error(s)`); process.exit(1); }
console.log('\nAll levels OK');
