// ===================== 关卡数据 & 背景/地形绘制（原创布局） =====================
import { CFG } from './config.js';
import { rect, hash01 } from './utils.js';
import { Assets } from './assets.js';

const G = CFG.GROUND_Y; // 470

// ---------------- 关卡定义 ----------------
// 每关：name 显示名 / theme 主题('jungle'|'snow') / width 总长 /
// bossTriggerX 触发 Boss 的玩家 x / wallX Boss 墙左缘 /
// solids 实体地形 / oneways 单向平台 / turrets 炮台(x=中心,y=脚底) /
// snipers 狙击手 / triggers 刷兵触发线 / waters 水面区间 [x0, x1]
export const LEVELS = [
  {
    name: '第1关 丛林',
    theme: 'jungle',
    boss: 'fortress',
    width: 5300,
    bossTriggerX: 4460,
    wallX: 5010,
    solids: [
      { x: 0,    y: G, w: 1200, h: 70, kind: 'ground' },
      { x: 1290, y: G, w: 860,  h: 70, kind: 'ground' },
      { x: 2260, y: G, w: 490,  h: 70, kind: 'ground' },
      { x: 3100, y: G, w: 550,  h: 70, kind: 'ground' },
      { x: 3750, y: G, w: 1550, h: 70, kind: 'ground' },
      { x: 2380, y: 390, w: 200, h: 80, kind: 'rock' },
      { x: 5010, y: 0, w: 290, h: G, kind: 'wall' },
    ],
    oneways: [
      { x: 640,  y: 360, w: 180, h: 14, kind: 'metal' },
      { x: 1320, y: 380, w: 140, h: 14, kind: 'metal' },
      { x: 1500, y: 290, w: 140, h: 14, kind: 'metal' },
      { x: 2430, y: 300, w: 120, h: 14, kind: 'metal' },
      { x: 2750, y: G,   w: 350, h: 14, kind: 'bridge' },
      { x: 3350, y: 360, w: 150, h: 14, kind: 'metal' },
      { x: 3820, y: 370, w: 140, h: 14, kind: 'metal' },
      { x: 3980, y: 280, w: 140, h: 14, kind: 'metal' },
      { x: 4560, y: 350, w: 190, h: 14, kind: 'metal' },
      { x: 4780, y: 250, w: 190, h: 14, kind: 'metal' },
    ],
    turrets: [
      { x: 730,  y: 360 },
      { x: 2480, y: 390 },
      { x: 3960, y: G },
    ],
    snipers: [
      { x: 1700, y: G },
      { x: 3160, y: G },
      { x: 4120, y: G },
    ],
    bombers: [
      { x: 980, y: G },
    ],
    triggers: [
      { x: 500,  type: 'runners', n: 3, dir: -1 },
      { x: 950,  type: 'runners', n: 3, dir: -1 },
      { x: 1050, type: 'paras', n: 2 },
      { x: 1400, type: 'runners', n: 2, dir: 1 },
      { x: 1550, type: 'patrols', n: 1 },
      { x: 1750, type: 'drone', carry: 'M' },
      { x: 2000, type: 'runners', n: 4, dir: -1 },
      { x: 2400, type: 'drone', carry: 'L' },
      { x: 2550, type: 'runners', n: 3, dir: -1 },
      { x: 2650, type: 'jumpers', n: 2, dir: -1 },
      { x: 2900, type: 'drone', carry: 'S' },
      { x: 3150, type: 'drone', carry: 'B' },
      { x: 3250, type: 'runners', n: 4, dir: -1 },
      { x: 3450, type: 'runners', n: 3, dir: 1 },
      { x: 3600, type: 'drone', carry: 'G' },
      { x: 3700, type: 'patrols', n: 1 },
      { x: 3900, type: 'drone', carry: 'S' },
      { x: 4150, type: 'runners', n: 4, dir: -1 },
      { x: 4250, type: 'drone', carry: 'H' },
      { x: 4350, type: 'drone', carry: 'M' },
      { x: 4500, type: 'drone', carry: 'F' },
    ],
    waters: [[1200, 1290], [2150, 2260], [2750, 3100], [3650, 3750]],
  },
  {
    name: '第2关 雪原',
    theme: 'snow',
    boss: 'yeti',
    width: 5600,
    bossTriggerX: 4760,
    wallX: 5310,
    // 地貌性格：雪丘起伏（岩石高台 + 阶梯平台，纵向攀爬）
    solids: [
      { x: 0,    y: G, w: 1500, h: 70, kind: 'ground' },
      { x: 1650, y: G, w: 620,  h: 70, kind: 'ground' },
      { x: 2420, y: G, w: 880,  h: 70, kind: 'ground' },
      { x: 3450, y: G, w: 800,  h: 70, kind: 'ground' },
      { x: 4400, y: G, w: 1200, h: 70, kind: 'ground' },
      { x: 1900, y: 390, w: 180, h: 80,  kind: 'rock' },
      { x: 2700, y: 370, w: 200, h: 100, kind: 'rock' },
      { x: 3750, y: 380, w: 180, h: 90,  kind: 'rock' },
      { x: 4900, y: 390, w: 160, h: 80,  kind: 'rock' },
      { x: 5310, y: 0, w: 290, h: G, kind: 'wall' },
    ],
    oneways: [
      { x: 900,  y: 370, w: 150, h: 14, kind: 'metal' },
      { x: 1150, y: 300, w: 130, h: 14, kind: 'metal' },
      { x: 1520, y: 380, w: 90,  h: 14, kind: 'metal' },
      { x: 2500, y: 290, w: 140, h: 14, kind: 'metal' },
      { x: 2750, y: 240, w: 130, h: 14, kind: 'metal' },
      { x: 3320, y: 360, w: 90,  h: 14, kind: 'metal' },
      { x: 3600, y: 300, w: 140, h: 14, kind: 'metal' },
      { x: 3900, y: 250, w: 130, h: 14, kind: 'metal' },
      { x: 4270, y: 370, w: 90,  h: 14, kind: 'metal' },
      // Boss 竞技场无高台：与雪怪平地一对一
    ],
    turrets: [
      { x: 1960, y: 390 },
      { x: 3810, y: 380 },
    ],
    snipers: [
      { x: 2760, y: 370 },
      { x: 4950, y: 390 },
    ],
    grenadiers: [
      { x: 1800, y: G },
      { x: 4600, y: G },
    ],
    shielders: [
      { x: 3050, y: G },
      { x: 4100, y: G },
    ],
    triggers: [
      { x: 350,  type: 'runners', n: 2, dir: -1 },
      { x: 700,  type: 'paras', n: 2 },
      { x: 1100, type: 'drone', carry: 'M' },
      { x: 1400, type: 'jumpers', n: 2, dir: -1 },
      { x: 1650, type: 'patrols', n: 1 },
      { x: 1800, type: 'runners', n: 3, dir: 1 },
      { x: 1880, type: 'snowballs', n: 1, dir: -1 },
      { x: 2200, type: 'drone', carry: 'S' },
      { x: 2500, type: 'flyers', n: 2 },
      { x: 2680, type: 'snowballs', n: 1, dir: -1 },
      { x: 2900, type: 'rollers', n: 2, dir: -1 },
      { x: 3100, type: 'drone', carry: 'L' },
      { x: 3400, type: 'runners', n: 3, dir: -1 },
      { x: 3700, type: 'drone', carry: 'G' },
      { x: 4000, type: 'flyers', n: 2 },
      { x: 4300, type: 'drone', carry: 'B' },
      { x: 4500, type: 'drone', carry: 'H' },
      { x: 4650, type: 'runners', n: 3, dir: -1 },
      { x: 4800, type: 'drone', carry: 'M' },
      { x: 4950, type: 'drone', carry: 'F' },
    ],
    // 冰湖
    waters: [[1500, 1650], [2270, 2420], [3300, 3450], [4250, 4400]],
  },
  {
    name: '第3关 基地',
    theme: 'base',
    boss: 'mech',
    width: 5600,
    bossTriggerX: 4760,
    wallX: 5310,
    // 地貌性格：双层走廊（上下两层金属平台 + 激光门封路）
    solids: [
      { x: 0,    y: G, w: 900,  h: 70, kind: 'ground' },
      { x: 990,  y: G, w: 700,  h: 70, kind: 'ground' },
      { x: 1780, y: G, w: 800,  h: 70, kind: 'ground' },
      { x: 2670, y: G, w: 750,  h: 70, kind: 'ground' },
      { x: 3510, y: G, w: 750,  h: 70, kind: 'ground' },
      { x: 4350, y: G, w: 1250, h: 70, kind: 'ground' },
      { x: 5310, y: 0, w: 290, h: G, kind: 'wall' },
    ],
    oneways: [
      { x: 400,  y: 340, w: 180, h: 14, kind: 'metal' },
      { x: 700,  y: 230, w: 160, h: 14, kind: 'metal' },
      { x: 1050, y: 340, w: 170, h: 14, kind: 'metal' },
      { x: 1350, y: 230, w: 150, h: 14, kind: 'metal' },
      { x: 1850, y: 340, w: 170, h: 14, kind: 'metal' },
      { x: 2150, y: 230, w: 150, h: 14, kind: 'metal' },
      { x: 2750, y: 340, w: 170, h: 14, kind: 'metal' },
      { x: 3050, y: 230, w: 150, h: 14, kind: 'metal' },
      { x: 3600, y: 340, w: 170, h: 14, kind: 'metal' },
      { x: 3900, y: 230, w: 150, h: 14, kind: 'metal' },
      { x: 4450, y: 340, w: 170, h: 14, kind: 'metal' },
      { x: 4750, y: 230, w: 150, h: 14, kind: 'metal' },
      { x: 5050, y: 320, w: 150, h: 14, kind: 'metal' },
    ],
    turrets: [
      { x: 760,  y: 230 },
      { x: 2200, y: 230 },
      { x: 4800, y: 230 },
    ],
    snipers: [
      { x: 1500, y: G },
      { x: 3700, y: G },
    ],
    grenadiers: [
      { x: 2900, y: G },
      { x: 4600, y: G },
    ],
    bombers: [
      { x: 2100, y: G },
    ],
    shielders: [
      { x: 1100, y: G },
      { x: 3900, y: G },
    ],
    // 激光门：封楼层通道（低的可跳过，高的等熄灭）
    lasers: [
      { x: 1200, h: 110, offset: 0.0 },
      { x: 2400, h: 240, offset: 0.9 },
      { x: 3300, h: 110, offset: 1.8 },
      { x: 4500, h: 240, offset: 0.4 },
    ],
    triggers: [
      { x: 300,  type: 'rollers', n: 2, dir: -1 },
      { x: 600,  type: 'runners', n: 2, dir: -1 },
      { x: 900,  type: 'drone', carry: 'M' },
      { x: 1200, type: 'flyers', n: 2 },
      { x: 1500, type: 'paras', n: 2 },
      { x: 1900, type: 'drone', carry: 'S' },
      { x: 2200, type: 'runners', n: 3, dir: -1 },
      { x: 2500, type: 'rollers', n: 2, dir: -1 },
      { x: 2800, type: 'drone', carry: 'L' },
      { x: 3100, type: 'flyers', n: 2 },
      { x: 3400, type: 'drone', carry: 'G' },
      { x: 3700, type: 'jumpers', n: 2, dir: -1 },
      { x: 4000, type: 'drone', carry: 'H' },
      { x: 4200, type: 'runners', n: 3, dir: -1 },
      { x: 4500, type: 'drone', carry: 'B' },
      { x: 4700, type: 'drone', carry: 'M' },
      { x: 4900, type: 'drone', carry: 'F' },
    ],
    // 酸液池
    waters: [[900, 990], [1690, 1780], [2580, 2670], [3420, 3510], [4260, 4350]],
  },
  {
    name: '第4关 战舰',
    theme: 'sky',
    boss: 'heli',
    width: 5600,
    bossTriggerX: 4760,
    wallX: 5310,
    // 地貌性格：浮岛跳跃（小岛链 + 移动/塌陷平台摆渡 + 侧风）
    solids: [
      { x: 0,    y: G, w: 800,  h: 70, kind: 'ground' },
      { x: 950,  y: G, w: 500,  h: 70, kind: 'ground' },
      { x: 1600, y: G, w: 550,  h: 70, kind: 'ground' },
      { x: 2450, y: G, w: 480,  h: 70, kind: 'ground' },
      { x: 3230, y: G, w: 520,  h: 70, kind: 'ground' },
      { x: 4050, y: G, w: 500,  h: 70, kind: 'ground' },
      { x: 4700, y: G, w: 900,  h: 70, kind: 'ground' },
      { x: 5310, y: 0, w: 290, h: G, kind: 'wall' },
    ],
    oneways: [
      { x: 500,  y: 350, w: 160, h: 14, kind: 'metal' },
      { x: 830,  y: 358, w: 100, h: 14, kind: 'crumble' },
      { x: 1100, y: 360, w: 150, h: 14, kind: 'metal' },
      { x: 1480, y: 365, w: 100, h: 14, kind: 'metal', move: { range: 25, speed: 55, phase: 0 } },
      { x: 1750, y: 300, w: 140, h: 14, kind: 'metal' },
      { x: 2180, y: 358, w: 110, h: 14, kind: 'crumble' },
      { x: 2600, y: 335, w: 140, h: 14, kind: 'metal' },
      { x: 2970, y: 380, w: 110, h: 14, kind: 'metal', move: { range: 35, speed: 65, phase: 1.4 } },
      { x: 3400, y: 350, w: 140, h: 14, kind: 'crumble' },
      { x: 3790, y: 358, w: 110, h: 14, kind: 'crumble' },
      { x: 4200, y: 335, w: 140, h: 14, kind: 'metal' },
      { x: 4590, y: 358, w: 100, h: 14, kind: 'crumble' },
      { x: 4900, y: 335, w: 160, h: 14, kind: 'metal' },
    ],
    turrets: [
      { x: 560,  y: 350 },
      { x: 2660, y: 335 },
      { x: 4260, y: 335 },
    ],
    snipers: [
      { x: 2050, y: G },
      { x: 4350, y: G },
    ],
    grenadiers: [
      { x: 1150, y: G },
      { x: 3450, y: G },
    ],
    shielders: [
      { x: 3350, y: G },
    ],
    // 侧风区：跨大缺口时跳跃被吹偏
    winds: [
      { x0: 2150, x1: 2450, force: -70 },
      { x0: 3750, x1: 4050, force: 70 },
    ],
    triggers: [
      { x: 250,  type: 'flyers', n: 2 },
      { x: 500,  type: 'runners', n: 2, dir: -1 },
      { x: 800,  type: 'drone', carry: 'M' },
      { x: 1100, type: 'paras', n: 2 },
      { x: 1450, type: 'flyers', n: 2 },
      { x: 1800, type: 'drone', carry: 'S' },
      { x: 2100, type: 'jumpers', n: 2, dir: -1 },
      { x: 2400, type: 'flyers', n: 3 },
      { x: 2700, type: 'drone', carry: 'L' },
      { x: 3000, type: 'drone', carry: 'B' },
      { x: 3300, type: 'rollers', n: 2, dir: -1 },
      { x: 3600, type: 'drone', carry: 'G' },
      { x: 3900, type: 'flyers', n: 2 },
      { x: 4200, type: 'runners', n: 3, dir: -1 },
      { x: 4500, type: 'drone', carry: 'H' },
      { x: 4700, type: 'drone', carry: 'M' },
      { x: 4900, type: 'drone', carry: 'F' },
      { x: 5000, type: 'flyers', n: 2 },
    ],
    // 高空：坑洞是无底云海（坠落即死）
    waters: [],
  },
  {
    name: '第5关 遗迹',
    theme: 'desert',
    boss: 'beast',
    ebulletMul: 1.15,     // 后半程加压：敌弹提速
    width: 5600,
    bossTriggerX: 4760,
    wallX: 5310,
    // 地貌性格：开阔沙丘（大平地 + 两片流沙海 + 沙虫埋伏圈，远程火力为主）
    solids: [
      { x: 0,    y: G, w: 1200, h: 70, kind: 'ground' },
      { x: 1850, y: G, w: 1000, h: 70, kind: 'ground' },
      { x: 3000, y: G, w: 900,  h: 70, kind: 'ground' },
      { x: 4200, y: G, w: 500,  h: 70, kind: 'ground' },
      { x: 4700, y: G, w: 900,  h: 70, kind: 'ground' },
      { x: 2100, y: 380, w: 180, h: 90,  kind: 'rock' },
      { x: 3400, y: 370, w: 200, h: 100, kind: 'rock' },
      { x: 5310, y: 0, w: 290, h: G, kind: 'wall' },
    ],
    oneways: [
      { x: 1000, y: 350, w: 160, h: 14, kind: 'metal' },
      { x: 1300, y: 400, w: 160, h: 14, kind: 'metal' },
      { x: 2150, y: 290, w: 130, h: 14, kind: 'metal' },
      { x: 2550, y: 350, w: 150, h: 14, kind: 'metal' },
      { x: 2890, y: 358, w: 100, h: 14, kind: 'crumble' },
      { x: 3450, y: 280, w: 140, h: 14, kind: 'metal' },
      { x: 4020, y: 400, w: 160, h: 14, kind: 'metal' },
      { x: 4400, y: 350, w: 150, h: 14, kind: 'metal' },
      { x: 4900, y: 300, w: 160, h: 14, kind: 'metal' },
      { x: 5150, y: 250, w: 140, h: 14, kind: 'metal' },
      // 两片流沙海（下陷！保持移动）
      { x: 1200, y: G,   w: 500, h: 14, kind: 'quicksand' },
      { x: 3900, y: G,   w: 300, h: 14, kind: 'quicksand' },
    ],
    turrets: [
      { x: 2150, y: 380 },
      { x: 3450, y: 370 },
    ],
    snipers: [
      { x: 2600, y: G },
      { x: 4450, y: G },
    ],
    grenadiers: [
      { x: 3200, y: G },
      { x: 4950, y: G },
    ],
    shielders: [
      { x: 2400, y: G },
    ],
    // 沙虫埋伏圈
    sandworms: [
      { x: 700 }, { x: 2200 }, { x: 3300 }, { x: 4500 }, { x: 4950 },
    ],
    triggers: [
      { x: 400,  type: 'runners', n: 2, dir: -1 },
      { x: 800,  type: 'paras', n: 2 },
      { x: 1100, type: 'drone', carry: 'M' },
      { x: 1400, type: 'rollers', n: 2, dir: -1 },
      { x: 1800, type: 'runners', n: 3, dir: 1 },
      { x: 2100, type: 'drone', carry: 'S' },
      { x: 2400, type: 'flyers', n: 2 },
      { x: 2700, type: 'jumpers', n: 2, dir: -1 },
      { x: 2950, type: 'drone', carry: 'L' },
      { x: 3200, type: 'runners', n: 3, dir: -1 },
      { x: 3450, type: 'drone', carry: 'B' },
      { x: 3700, type: 'flyers', n: 2 },
      { x: 4000, type: 'drone', carry: 'G' },
      { x: 4200, type: 'rollers', n: 2, dir: -1 },
      { x: 4450, type: 'drone', carry: 'H' },
      { x: 4650, type: 'drone', carry: 'M' },
      { x: 4800, type: 'drone', carry: 'F' },
      { x: 4950, type: 'flyers', n: 3 },
    ],
    waters: [],
  },
  {
    name: '第6关 火山',
    theme: 'volcano',
    boss: 'titan',
    ebulletMul: 1.2,      // 后半程再加压：敌弹提速 20%
    width: 5800,
    bossTriggerX: 4960,
    wallX: 5510,
    // 地貌性格：熔岩河谷（岩台攀爬 + 熔岩河 + 塌陷石桥）
    solids: [
      { x: 0,    y: G, w: 1100, h: 70, kind: 'ground' },
      { x: 1280, y: G, w: 820,  h: 70, kind: 'ground' },
      { x: 2300, y: G, w: 900,  h: 70, kind: 'ground' },
      { x: 3400, y: G, w: 900,  h: 70, kind: 'ground' },
      { x: 4500, y: G, w: 1300, h: 70, kind: 'ground' },
      { x: 700,  y: 380, w: 180, h: 90,  kind: 'rock' },
      { x: 1600, y: 370, w: 200, h: 100, kind: 'rock' },
      { x: 2700, y: 390, w: 180, h: 80,  kind: 'rock' },
      { x: 3800, y: 370, w: 200, h: 100, kind: 'rock' },
      { x: 5100, y: 390, w: 160, h: 80,  kind: 'rock' },
      { x: 5510, y: 0, w: 290, h: G, kind: 'wall' },
    ],
    oneways: [
      { x: 500,  y: 340, w: 150, h: 14, kind: 'metal' },
      { x: 1120, y: 400, w: 140, h: 14, kind: 'metal' },
      { x: 1180, y: 330, w: 90,  h: 14, kind: 'crumble' },
      { x: 2100, y: 400, w: 180, h: 14, kind: 'metal' },
      { x: 2160, y: 320, w: 100, h: 14, kind: 'crumble' },
      { x: 2550, y: 280, w: 140, h: 14, kind: 'metal' },
      { x: 3220, y: 400, w: 160, h: 14, kind: 'metal' },
      { x: 3280, y: 330, w: 90,  h: 14, kind: 'crumble' },
      { x: 3850, y: 280, w: 140, h: 14, kind: 'metal' },
      { x: 4320, y: 400, w: 160, h: 14, kind: 'metal' },
      { x: 4780, y: 340, w: 150, h: 14, kind: 'metal' },
      { x: 5200, y: 300, w: 150, h: 14, kind: 'metal' },
    ],
    turrets: [
      { x: 790,  y: 380 },
      { x: 1700, y: 370 },
      { x: 2620, y: 280 },
      { x: 3870, y: 370 },
    ],
    snipers: [
      { x: 1500, y: G },
      { x: 3600, y: G },
      { x: 4900, y: G },
    ],
    grenadiers: [
      { x: 900,  y: G },
      { x: 2800, y: G },
      { x: 4700, y: G },
    ],
    shielders: [
      { x: 1900, y: G },
      { x: 4000, y: G },
    ],
    triggers: [
      { x: 350,  type: 'runners', n: 3, dir: -1 },
      { x: 700,  type: 'rollers', n: 2, dir: -1 },
      { x: 1000, type: 'drone', carry: 'M' },
      { x: 1300, type: 'paras', n: 2 },
      { x: 1650, type: 'jumpers', n: 2, dir: -1 },
      { x: 1950, type: 'drone', carry: 'S' },
      { x: 2250, type: 'flyers', n: 2 },
      { x: 2550, type: 'runners', n: 3, dir: -1 },
      { x: 2850, type: 'drone', carry: 'L' },
      { x: 3100, type: 'rollers', n: 2, dir: -1 },
      { x: 3400, type: 'drone', carry: 'B' },
      { x: 3650, type: 'jumpers', n: 2, dir: -1 },
      { x: 3900, type: 'drone', carry: 'G' },
      { x: 4150, type: 'flyers', n: 3 },
      { x: 4400, type: 'runners', n: 3, dir: -1 },
      { x: 4650, type: 'drone', carry: 'H' },
      { x: 4850, type: 'drone', carry: 'M' },
      { x: 5000, type: 'drone', carry: 'F' },
      { x: 5200, type: 'rollers', n: 2, dir: -1 },
    ],
    // 熔岩河（坑底致死，与丛林水面相同判定）
    waters: [[1100, 1280], [2120, 2300], [3200, 3400], [4300, 4500]],
  },
  {
    name: '第7关 雷暴废城',
    theme: 'storm',
    boss: 'warden',
    ebulletMul: 1.25,     // 后半程再加压：敌弹提速 25%
    width: 5900,
    bossTriggerX: 5060,
    wallX: 5610,
    // 地貌性格：被淹街道（积水坑 + 塌楼踏板 + 电栅 + 暴风侧吹）
    solids: [
      { x: 0,    y: G, w: 1050, h: 70, kind: 'ground' },
      { x: 1240, y: G, w: 760,  h: 70, kind: 'ground' },
      { x: 2200, y: G, w: 850,  h: 70, kind: 'ground' },
      { x: 3250, y: G, w: 850,  h: 70, kind: 'ground' },
      { x: 4300, y: G, w: 700,  h: 70, kind: 'ground' },
      { x: 5200, y: G, w: 700,  h: 70, kind: 'ground' },
      { x: 650,  y: 380, w: 180, h: 90,  kind: 'rock' },
      { x: 1550, y: 370, w: 180, h: 100, kind: 'rock' },
      { x: 2500, y: 385, w: 160, h: 85,  kind: 'rock' },
      { x: 3600, y: 370, w: 200, h: 100, kind: 'rock' },
      { x: 4800, y: 385, w: 160, h: 85,  kind: 'rock' },
      { x: 5280, y: 390, w: 160, h: 80,  kind: 'rock' },
      { x: 5610, y: 0, w: 290, h: G, kind: 'wall' },
    ],
    oneways: [
      { x: 480,  y: 340, w: 150, h: 14, kind: 'metal' },
      { x: 1080, y: 400, w: 140, h: 14, kind: 'metal' },
      { x: 1140, y: 330, w: 90,  h: 14, kind: 'crumble' },
      { x: 2050, y: 400, w: 140, h: 14, kind: 'metal' },
      { x: 2110, y: 320, w: 100, h: 14, kind: 'crumble' },
      { x: 2550, y: 280, w: 140, h: 14, kind: 'metal' },
      { x: 3100, y: 400, w: 140, h: 14, kind: 'metal' },
      { x: 3160, y: 330, w: 90,  h: 14, kind: 'crumble' },
      { x: 3700, y: 280, w: 140, h: 14, kind: 'metal' },
      { x: 4150, y: 400, w: 140, h: 14, kind: 'metal' },
      { x: 4680, y: 340, w: 150, h: 14, kind: 'metal' },
      { x: 5300, y: 300, w: 150, h: 14, kind: 'metal' },
    ],
    turrets: [
      { x: 740,  y: 380 },
      { x: 1640, y: 370 },
      { x: 2620, y: 280 },
      { x: 3680, y: 370 },
    ],
    snipers: [
      { x: 1400, y: G },
      { x: 3500, y: G },
      { x: 4900, y: G },
    ],
    grenadiers: [
      { x: 850,  y: G },
      { x: 2700, y: G },
      { x: 4600, y: G },
    ],
    shielders: [
      { x: 1800, y: G },
      { x: 3900, y: G },
    ],
    lasers: [
      { x: 900,  h: 110, offset: 0.0 },
      { x: 2400, h: 240, offset: 0.9 },
      { x: 3450, h: 110, offset: 1.8 },
      { x: 4700, h: 240, offset: 0.4 },
    ],
    winds: [
      { x0: 1050, x1: 1240, force: -80 },
      { x0: 2000, x1: 2200, force: 80 },
      { x0: 4100, x1: 4300, force: -80 },
    ],
    triggers: [
      { x: 350,  type: 'runners', n: 3, dir: -1 },
      { x: 700,  type: 'rollers', n: 2, dir: -1 },
      { x: 1000, type: 'drone', carry: 'M' },
      { x: 1300, type: 'paras', n: 2 },
      { x: 1650, type: 'jumpers', n: 2, dir: -1 },
      { x: 1950, type: 'drone', carry: 'S' },
      { x: 2250, type: 'flyers', n: 2 },
      { x: 2550, type: 'runners', n: 3, dir: -1 },
      { x: 2850, type: 'drone', carry: 'L' },
      { x: 3100, type: 'rollers', n: 2, dir: -1 },
      { x: 3400, type: 'drone', carry: 'B' },
      { x: 3650, type: 'jumpers', n: 2, dir: -1 },
      { x: 3900, type: 'drone', carry: 'G' },
      { x: 4150, type: 'flyers', n: 3 },
      { x: 4400, type: 'runners', n: 3, dir: -1 },
      { x: 4650, type: 'drone', carry: 'H' },
      { x: 4850, type: 'drone', carry: 'M' },
      { x: 5000, type: 'drone', carry: 'F' },
      { x: 5250, type: 'rollers', n: 2, dir: -1 },
    ],
    // 被淹街道（坑底致死，与水面相同判定）
    waters: [[1050, 1240], [2000, 2200], [3050, 3250], [4100, 4300]],
  },
  {
    name: '第8关 核心要塞',
    theme: 'citadel',
    boss: 'overlord',
    ebulletMul: 1.3,      // 终章加压：敌弹提速 30%
    width: 6000,
    bossTriggerX: 5160,
    wallX: 5710,
    // 地貌性格：虚空裂隙上的悬浮石台 + 能量门 + 升降台
    solids: [
      { x: 0,    y: G, w: 1020, h: 70, kind: 'ground' },
      { x: 1220, y: G, w: 740,  h: 70, kind: 'ground' },
      { x: 2160, y: G, w: 820,  h: 70, kind: 'ground' },
      { x: 3180, y: G, w: 840,  h: 70, kind: 'ground' },
      { x: 4220, y: G, w: 720,  h: 70, kind: 'ground' },
      { x: 5140, y: G, w: 860,  h: 70, kind: 'ground' },
      { x: 620,  y: 380, w: 180, h: 90,  kind: 'rock' },
      { x: 1480, y: 370, w: 180, h: 100, kind: 'rock' },
      { x: 2480, y: 385, w: 160, h: 85,  kind: 'rock' },
      { x: 3520, y: 370, w: 200, h: 100, kind: 'rock' },
      { x: 4580, y: 385, w: 160, h: 85,  kind: 'rock' },
      { x: 5380, y: 390, w: 160, h: 80,  kind: 'rock' },
      { x: 5710, y: 0, w: 290, h: G, kind: 'wall' },
    ],
    oneways: [
      { x: 460,  y: 340, w: 150, h: 14, kind: 'metal' },
      { x: 1050, y: 400, w: 140, h: 14, kind: 'metal' },
      { x: 1110, y: 330, w: 90,  h: 14, kind: 'crumble' },
      { x: 1680, y: 365, w: 100, h: 14, kind: 'metal', move: { range: 25, speed: 55, phase: 0 } },
      { x: 2000, y: 400, w: 140, h: 14, kind: 'metal' },
      { x: 2060, y: 320, w: 100, h: 14, kind: 'crumble' },
      { x: 2550, y: 280, w: 140, h: 14, kind: 'metal' },
      { x: 3050, y: 400, w: 140, h: 14, kind: 'metal' },
      { x: 3110, y: 330, w: 90,  h: 14, kind: 'crumble' },
      { x: 3700, y: 280, w: 140, h: 14, kind: 'metal' },
      { x: 4080, y: 400, w: 140, h: 14, kind: 'metal' },
      { x: 4640, y: 340, w: 150, h: 14, kind: 'metal' },
      { x: 5400, y: 300, w: 150, h: 14, kind: 'metal' },
    ],
    turrets: [
      { x: 710,  y: 380 },
      { x: 1570, y: 370 },
      { x: 2620, y: 280 },
      { x: 3600, y: 370 },
    ],
    snipers: [
      { x: 1400, y: G },
      { x: 3400, y: G },
      { x: 4800, y: G },
    ],
    grenadiers: [
      { x: 800,  y: G },
      { x: 2600, y: G },
      { x: 4500, y: G },
    ],
    shielders: [
      { x: 1750, y: G },
      { x: 3800, y: G },
    ],
    lasers: [
      { x: 880,  h: 110, offset: 0.0 },
      { x: 2360, h: 240, offset: 0.9 },
      { x: 3380, h: 110, offset: 1.8 },
      { x: 4680, h: 240, offset: 0.4 },
    ],
    triggers: [
      { x: 350,  type: 'runners', n: 3, dir: -1 },
      { x: 700,  type: 'rollers', n: 2, dir: -1 },
      { x: 1000, type: 'drone', carry: 'M' },
      { x: 1300, type: 'paras', n: 2 },
      { x: 1650, type: 'jumpers', n: 2, dir: -1 },
      { x: 1950, type: 'drone', carry: 'S' },
      { x: 2250, type: 'flyers', n: 2 },
      { x: 2550, type: 'runners', n: 3, dir: -1 },
      { x: 2850, type: 'drone', carry: 'L' },
      { x: 3100, type: 'rollers', n: 2, dir: -1 },
      { x: 3400, type: 'drone', carry: 'B' },
      { x: 3650, type: 'jumpers', n: 2, dir: -1 },
      { x: 3900, type: 'drone', carry: 'G' },
      { x: 4150, type: 'flyers', n: 3 },
      { x: 4400, type: 'runners', n: 3, dir: -1 },
      { x: 4650, type: 'drone', carry: 'H' },
      { x: 4850, type: 'drone', carry: 'M' },
      { x: 5100, type: 'drone', carry: 'F' },
      { x: 5350, type: 'rollers', n: 2, dir: -1 },
    ],
    // 虚空裂隙（坑底致死，与水面相同判定）
    waters: [[1020, 1220], [1960, 2160], [2980, 3180], [4020, 4220], [4940, 5140]],
  },
];

// 当前关卡（setLevel 就地替换内容，外部 import 绑定不失效）
export const LEVEL = {};

export function setLevel(i) {
  const def = LEVELS[i];
  // 先清空上一关残留字段（lasers/winds/sandworms/ebulletMul 等可选键），防止跨关污染
  for (const k in LEVEL) delete LEVEL[k];
  Object.assign(LEVEL, def);
  // 深拷贝可变地形数组：塌陷/流沙/移动平台的运行时状态（gone/sink/baseY 等）不得跨关或跨重开残留
  LEVEL.solids = structuredClone(def.solids);
  LEVEL.oneways = structuredClone(def.oneways);
  // Boss / 敌人 / 主循环运行时读取 CFG 中的关卡边界，同步写回
  CFG.LEVEL_W = def.width;
  CFG.BOSS_TRIGGER_X = def.bossTriggerX;
  CFG.ARENA_WALL_X = def.wallX;
}
setLevel(0);

// 求某 x 处的落脚面高度（用于刷兵/重生），无地面返回 null
// safe=true 时跳过已塌落的塌陷平台和流沙（重生/刷兵安全点用）
export function groundTopAt(x, { safe = false } = {}) {
  let best = null;
  for (const s of [...LEVEL.solids, ...LEVEL.oneways]) {
    if (safe && (s.gone || s.kind === 'quicksand')) continue;
    if (x >= s.x && x <= s.x + s.w) {
      if (best === null || s.y < best) best = s.y;
    }
  }
  return best;
}

// ---------------- 关卡动态（移动平台 / 塌陷平台） ----------------
export function updateLevelDynamics(dt, world) {
  const t = world.time;
  for (const p of LEVEL.oneways) {
    // 垂直升降平台：baseY ± range 正弦往返
    if (p.move) {
      if (p.baseY === undefined) p.baseY = p.y;
      p.y = p.baseY + Math.sin(t * p.move.speed / 50 + p.move.phase) * p.move.range;
    }
    // 塌陷平台：站上去 0.7s 后塌落，3.5s 后复原
    if (p.kind === 'crumble') {
      if (p.goneT > 0) {
        p.goneT -= dt;
        if (p.goneT <= 0) { p.gone = false; p.stand = 0; }
        continue;
      }
      const pl = world.player;
      const standing = pl.onGround && !pl.dead &&
        Math.abs(pl.y + pl.h - p.y) < 5 &&
        pl.x + pl.w > p.x && pl.x < p.x + p.w;
      if (standing) {
        p.stand = (p.stand || 0) + dt;
        if (p.stand > 0.7) {
          p.gone = true;
          p.goneT = 3.5;
          p.stand = 0;
          world.audio.sfx('turretDie');
          world.particles.sparks(p.x + p.w / 2, p.y + 6, 10, '#8a8f9e');
        }
      } else if (p.stand > 0) {
        p.stand = Math.max(0, p.stand - dt * 2);
      }
    }
    // 流沙：平台随玩家缓慢下沉（物理吸附带着玩家下陷），离开后回弹
    if (p.kind === 'quicksand') {
      if (p.sink === undefined) p.sink = 0;
      const pl = world.player;
      const standing = pl.onGround && !pl.dead &&
        Math.abs(pl.y + pl.h - p.y) < 6 &&
        pl.x + pl.w > p.x && pl.x < p.x + p.w;
      if (standing) {
        p.sink += 24 * dt;
        pl.inQuicksand = true;
        if (pl.y + pl.h > G + 34) world.onPitDeath();
      } else if (p.sink > 0) {
        p.sink = Math.max(0, p.sink - 30 * dt);
      }
      p.y = G + p.sink;
    }
  }
  // 每帧复位流沙标记（updateLevelDynamics 先于下一帧移动调用）
  if (!LEVEL.oneways.some(p => p.kind === 'quicksand' &&
      world.player.onGround &&
      Math.abs(world.player.y + world.player.h - p.y) < 6 &&
      world.player.x + world.player.w > p.x && world.player.x < p.x + p.w)) {
    world.player.inQuicksand = false;
  }
}
// 激光门状态：激活期造成伤害
export const LASER_PERIOD = 2.6;
export const LASER_ON = 1.3;
export function laserActive(g, time) {
  return (time + g.offset) % LASER_PERIOD < LASER_ON;
}

// ---------------- 背景（三层视差，按主题分派） ----------------
export function drawBackground(ctx, camX, t) {
  if (LEVEL.theme === 'snow') return drawSnowBackground(ctx, camX, t);
  if (LEVEL.theme === 'base') return drawBaseBackground(ctx, camX, t);
  if (LEVEL.theme === 'sky') return drawSkyBackground(ctx, camX, t);
  if (LEVEL.theme === 'desert') return drawDesertBackground(ctx, camX, t);
  if (LEVEL.theme === 'volcano') return drawVolcanoBackground(ctx, camX, t);
  if (LEVEL.theme === 'storm') return drawStormBackground(ctx, camX, t);
  if (LEVEL.theme === 'citadel') return drawCitadelBackground(ctx, camX, t);

  const sky = Assets.get('bg_sky');
  if (sky) {
    // 生成天空图：静态满屏
    ctx.drawImage(sky, 0, 0, CFG.W, CFG.H);
  } else {
    // 天空
    const grad = ctx.createLinearGradient(0, 0, 0, CFG.H);
    grad.addColorStop(0, '#160b2e');
    grad.addColorStop(0.45, '#3d1b4e');
    grad.addColorStop(0.75, '#8a3550');
    grad.addColorStop(1, '#c9542f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    // 星星（随时间微闪）
    for (let i = 0; i < 60; i++) {
      const sx = hash01(i, 7) * CFG.W;
      const sy = hash01(i, 13) * 240;
      const tw = hash01(i, 29) > 0.5 ? Math.sin(t * 2 + i) * 0.4 + 0.6 : 0.8;
      ctx.globalAlpha = tw * (1 - sy / 300);
      ctx.fillStyle = '#ffe9d0';
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;

    // 落日
    const sunX = 720 - camX * 0.04;
    ctx.fillStyle = '#ff9a3d';
    ctx.beginPath();
    ctx.arc(sunX, 330, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffc46b';
    ctx.beginPath();
    ctx.arc(sunX, 330, 44, 0, Math.PI * 2);
    ctx.fill();
  }

  // 远山（视差 0.3）：生成图平铺 / 代码山脊回退
  const mt = Assets.get('bg_mountains');
  if (mt) {
    tileLayer(ctx, mt, camX * 0.3, CFG.GROUND_Y - 215, 215);
  } else {
    drawRidge(ctx, camX * 0.15, 330, 150, '#2a1440', 0.9);
    drawRidge(ctx, camX * 0.3, 400, 110, '#1d0f30', 1.4);
  }
  // 丛林（视差 0.55）
  const jg = Assets.get('bg_jungle');
  if (jg) {
    tileLayer(ctx, jg, camX * 0.55, CFG.GROUND_Y - 120, 120);
  } else {
    drawJungle(ctx, camX * 0.55);
  }
}

// ---------------- 雪原背景 ----------------
function drawSnowBackground(ctx, camX, t) {
  const sky = Assets.get('bg_snow_sky');
  if (sky) {
    ctx.drawImage(sky, 0, 0, CFG.W, CFG.H);
  } else {
    // 冷色白昼天空
    const grad = ctx.createLinearGradient(0, 0, 0, CFG.H);
    grad.addColorStop(0, '#7ea8d8');
    grad.addColorStop(0.55, '#b8d4ec');
    grad.addColorStop(1, '#eef5fb');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    // 苍白冬日
    const sunX = 700 - camX * 0.04;
    ctx.fillStyle = 'rgba(255,252,240,0.9)';
    ctx.beginPath();
    ctx.arc(sunX, 120, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,252,240,0.35)';
    ctx.beginPath();
    ctx.arc(sunX, 120, 58, 0, Math.PI * 2);
    ctx.fill();
  }

  // 雪山（视差 0.3）
  const mt = Assets.get('bg_snow_mountains');
  if (mt) {
    tileLayer(ctx, mt, camX * 0.3, CFG.GROUND_Y - 215, 215);
  } else {
    drawRidge(ctx, camX * 0.15, 320, 150, '#c3d6e8', 0.9);
    drawRidge(ctx, camX * 0.3, 395, 110, '#9dbbd4', 1.4);
  }
  // 空气透视：远山蒙雾，降低远景对比
  let fog = ctx.createLinearGradient(0, CFG.GROUND_Y - 280, 0, CFG.GROUND_Y);
  fog.addColorStop(0, 'rgba(216,232,246,0)');
  fog.addColorStop(1, 'rgba(216,232,246,0.5)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, CFG.GROUND_Y - 280, CFG.W, 280);
  // 雪松（视差 0.55）
  const tr = Assets.get('bg_snow_trees');
  if (tr) {
    tileLayer(ctx, tr, camX * 0.55, CFG.GROUND_Y - 120, 120);
  } else {
    drawSnowTrees(ctx, camX * 0.55);
  }
  // 近景树林再蒙一层薄雾，让前景角色更突出
  fog = ctx.createLinearGradient(0, CFG.GROUND_Y - 140, 0, CFG.GROUND_Y);
  fog.addColorStop(0, 'rgba(224,238,250,0)');
  fog.addColorStop(1, 'rgba(224,238,250,0.32)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, CFG.GROUND_Y - 140, CFG.W, 140);

  // 飘雪（屏幕空间，前景氛围）
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 80; i++) {
    const speed = 30 + hash01(i, 9) * 50;
    const x = (hash01(i, 5) * CFG.W + Math.sin(t * 0.8 + i) * 18 + camX * 0.05) % CFG.W;
    const y = (hash01(i, 7) * CFG.H + t * speed) % CFG.H;
    const s = hash01(i, 11) > 0.6 ? 3 : 2;
    ctx.globalAlpha = 0.5 + hash01(i, 13) * 0.5;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
}

// ---------------- 高空战舰背景 ----------------
function drawSkyBackground(ctx, camX, t) {
  const sky = Assets.get('bg_sky4');
  if (sky) {
    ctx.drawImage(sky, 0, 0, CFG.W, CFG.H);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, CFG.H);
    grad.addColorStop(0, '#2a6ec8');
    grad.addColorStop(0.6, '#7ab8f0');
    grad.addColorStop(1, '#d8ecfc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CFG.W, CFG.H);
  }
  // 侧风区的气流线
  if (LEVEL.winds) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const w of LEVEL.winds) {
      if (w.x1 < camX || w.x0 > camX + CFG.W) continue;
      for (let i = 0; i < 10; i++) {
        const wy = 120 + hash01(i, w.x0) * 320;
        const wx = w.x0 + ((hash01(i, 7) * (w.x1 - w.x0) + t * w.force * 3) % (w.x1 - w.x0) + (w.x1 - w.x0)) % (w.x1 - w.x0);
        ctx.fillRect(wx, wy, w.force > 0 ? 26 : -26, 2);
      }
    }
  }
}

// ---------------- 沙漠遗迹背景 ----------------
function drawDesertBackground(ctx, camX, t) {
  const bg = Assets.get('bg_desert');
  if (bg) {
    ctx.drawImage(bg, 0, 0, CFG.W, CFG.H);
  } else {
    // 黄昏沙漠天空
    const grad = ctx.createLinearGradient(0, 0, 0, CFG.H);
    grad.addColorStop(0, '#3a2056');
    grad.addColorStop(0.5, '#c8542f');
    grad.addColorStop(1, '#f0a848');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    const sunX = 700 - camX * 0.04;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(sunX, 300, 50, 0, Math.PI * 2);
    ctx.fill();
  }
  // 遗迹石柱剪影（视差 0.5）
  const rn = Assets.get('bg_ruins');
  if (rn) {
    tileLayer(ctx, rn, camX * 0.5, CFG.GROUND_Y - 190, 190);
  } else {
    // 回退：代码石柱
    ctx.fillStyle = '#8a6a42';
    for (let i = -1; i < 8; i++) {
      const wx = i * 230 + (camX * 0.5 % 230);
      const h = 60 + hash01(i + Math.floor(camX * 0.5 / 230), 3) * 90;
      ctx.fillRect(wx, CFG.GROUND_Y - h, 26, h);
      ctx.fillRect(wx - 6, CFG.GROUND_Y - h - 10, 38, 12);
    }
  }
  // 热霾（远景微微泛光，突出前景）
  const fog = ctx.createLinearGradient(0, CFG.GROUND_Y - 200, 0, CFG.GROUND_Y);
  fog.addColorStop(0, 'rgba(240,168,72,0)');
  fog.addColorStop(1, 'rgba(240,168,72,0.18)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, CFG.GROUND_Y - 200, CFG.W, 200);
  // 飘沙
  ctx.fillStyle = 'rgba(240,220,170,0.5)';
  for (let i = 0; i < 40; i++) {
    const x = (hash01(i, 5) * CFG.W + t * (60 + hash01(i, 9) * 60)) % CFG.W;
    const y = hash01(i, 7) * CFG.H;
    ctx.fillRect(x, y, 2, 2);
  }
}

// ---------------- 火山夜背景 ----------------
function drawVolcanoBackground(ctx, camX, t) {
  const grad = ctx.createLinearGradient(0, 0, 0, CFG.H);
  grad.addColorStop(0, '#1a0a12');
  grad.addColorStop(0.45, '#4a1820');
  grad.addColorStop(0.8, '#8a2a18');
  grad.addColorStop(1, '#c94a20');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CFG.W, CFG.H);
  // 远火山剪影
  drawRidge(ctx, camX * 0.12, 310, 160, '#2a1014', 0.8);
  drawRidge(ctx, camX * 0.28, 390, 120, '#1c0c10', 1.3);
  // 火山口辉光
  const glowX = 640 - camX * 0.08;
  ctx.fillStyle = 'rgba(255,90,30,0.28)';
  ctx.beginPath();
  ctx.arc(glowX, 300, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff6a28';
  ctx.beginPath();
  ctx.arc(glowX, 318, 22, 0, Math.PI * 2);
  ctx.fill();
  // 热霾
  const fog = ctx.createLinearGradient(0, CFG.GROUND_Y - 200, 0, CFG.GROUND_Y);
  fog.addColorStop(0, 'rgba(80,20,10,0)');
  fog.addColorStop(1, 'rgba(80,20,10,0.35)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, CFG.GROUND_Y - 200, CFG.W, 200);
  // 升腾火星
  ctx.fillStyle = '#ff9a50';
  for (let i = 0; i < 50; i++) {
    const x = (hash01(i, 5) * CFG.W + Math.sin(t * 0.7 + i) * 12) % CFG.W;
    const y = (CFG.H - (hash01(i, 7) * CFG.H + t * (40 + hash01(i, 11) * 80)) % CFG.H);
    ctx.globalAlpha = 0.35 + hash01(i, 13) * 0.5;
    ctx.fillRect(x, y, hash01(i, 17) > 0.6 ? 3 : 2, 2);
  }
  ctx.globalAlpha = 1;
}

// ---------------- 雷暴废城背景 ----------------
function drawStormBackground(ctx, camX, t) {
  const grad = ctx.createLinearGradient(0, 0, 0, CFG.H);
  grad.addColorStop(0, '#0c1020');
  grad.addColorStop(0.4, '#1a2440');
  grad.addColorStop(0.75, '#2a3858');
  grad.addColorStop(1, '#1c2838');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CFG.W, CFG.H);
  // 闪电闪空
  const flash = Math.sin(t * 7.3) > 0.92 || Math.sin(t * 3.1 + 1.7) > 0.96;
  if (flash) {
    ctx.fillStyle = 'rgba(180,220,255,0.22)';
    ctx.fillRect(0, 0, CFG.W, CFG.H);
  }
  // 废楼剪影
  drawRidge(ctx, camX * 0.12, 300, 150, '#12182a', 0.7);
  ctx.fillStyle = '#151c30';
  for (let i = -1; i < 10; i++) {
    const wx = i * 180 + (camX * 0.32 % 180);
    const h = 70 + hash01(i + Math.floor(camX * 0.32 / 180), 5) * 110;
    ctx.fillRect(wx, CFG.GROUND_Y - h, 40, h);
    ctx.fillRect(wx + 8, CFG.GROUND_Y - h - 18, 16, 18);
    ctx.fillStyle = flash ? '#7ad0ff' : '#2a3858';
    ctx.fillRect(wx + 10, CFG.GROUND_Y - h + 16, 8, 10);
    ctx.fillStyle = '#151c30';
  }
  // 雨
  ctx.fillStyle = 'rgba(170,200,230,0.45)';
  for (let i = 0; i < 70; i++) {
    const x = (hash01(i, 5) * CFG.W + t * (220 + hash01(i, 9) * 80)) % CFG.W;
    const y = (hash01(i, 7) * CFG.H + t * 380) % CFG.H;
    ctx.fillRect(x, y, 1, 8);
  }
  // 侧风气流
  if (LEVEL.winds) {
    ctx.fillStyle = 'rgba(170,210,255,0.35)';
    for (const w of LEVEL.winds) {
      if (w.x1 < camX || w.x0 > camX + CFG.W) continue;
      for (let i = 0; i < 8; i++) {
        const wy = 100 + hash01(i, w.x0) * 300;
        const span = w.x1 - w.x0;
        const wx = w.x0 + ((hash01(i, 7) * span + t * w.force * 3) % span + span) % span;
        ctx.fillRect(wx, wy, w.force > 0 ? 22 : -22, 2);
      }
    }
  }
  const fog = ctx.createLinearGradient(0, CFG.GROUND_Y - 180, 0, CFG.GROUND_Y);
  fog.addColorStop(0, 'rgba(12,16,32,0)');
  fog.addColorStop(1, 'rgba(12,16,32,0.4)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, CFG.GROUND_Y - 180, CFG.W, 180);
}

// ---------------- 核心要塞背景 ----------------
function drawCitadelBackground(ctx, camX, t) {
  const grad = ctx.createLinearGradient(0, 0, 0, CFG.H);
  grad.addColorStop(0, '#0a0614');
  grad.addColorStop(0.35, '#1a0c2e');
  grad.addColorStop(0.7, '#2a1448');
  grad.addColorStop(1, '#140c22');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CFG.W, CFG.H);
  // 星点
  for (let i = 0; i < 50; i++) {
    const sx = (hash01(i, 3) * CFG.W + camX * 0.04) % CFG.W;
    const sy = hash01(i, 11) * 280;
    ctx.globalAlpha = 0.4 + Math.sin(t * 2 + i) * 0.3;
    ctx.fillStyle = '#e8d0ff';
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;
  // 远塔剪影
  drawRidge(ctx, camX * 0.1, 310, 140, '#12081e', 0.8);
  ctx.fillStyle = '#1a1028';
  for (let i = -1; i < 8; i++) {
    const wx = i * 220 + (camX * 0.28 % 220);
    const h = 90 + hash01(i + Math.floor(camX * 0.28 / 220), 4) * 130;
    ctx.fillRect(wx, CFG.GROUND_Y - h, 36, h);
    ctx.fillRect(wx + 8, CFG.GROUND_Y - h - 22, 20, 22);
    ctx.fillStyle = '#c46ae0';
    ctx.fillRect(wx + 12, CFG.GROUND_Y - h + 20, 8, 12);
    ctx.fillStyle = '#1a1028';
  }
  // 能量尘
  ctx.fillStyle = 'rgba(232,160,255,0.45)';
  for (let i = 0; i < 40; i++) {
    const x = (hash01(i, 6) * CFG.W + t * (40 + hash01(i, 8) * 50)) % CFG.W;
    const y = (hash01(i, 12) * CFG.H + t * 30) % CFG.H;
    ctx.fillRect(x, y, 2, 2);
  }
  const fog = ctx.createLinearGradient(0, CFG.GROUND_Y - 200, 0, CFG.GROUND_Y);
  fog.addColorStop(0, 'rgba(10,6,20,0)');
  fog.addColorStop(1, 'rgba(10,6,20,0.5)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, CFG.GROUND_Y - 200, CFG.W, 200);
}

// ---------------- 基地内部背景 ----------------
function drawBaseBackground(ctx, camX, t) {
  const bg = Assets.get('bg_base');
  if (bg) {
    // AI 工业墙：轻微视差滚动（裁一块比屏宽的窗口）
    const sw = bg.width * 0.7;
    const sx = (camX * 0.12) % (bg.width - sw);
    ctx.drawImage(bg, sx, 0, sw, bg.height, 0, 0, CFG.W, CFG.H);
  } else {
    // 深色金属墙
    const grad = ctx.createLinearGradient(0, 0, 0, CFG.H);
    grad.addColorStop(0, '#101219');
    grad.addColorStop(1, '#1d212c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    // 墙板接缝
    ctx.fillStyle = '#0a0c11';
    for (let x = -((camX * 0.2) % 160); x < CFG.W; x += 160) ctx.fillRect(x, 0, 4, CFG.H);
    // 铆钉
    ctx.fillStyle = '#2c313e';
    for (let x = -((camX * 0.2) % 160) + 20; x < CFG.W; x += 40) {
      for (let y = 30; y < CFG.H; y += 60) ctx.fillRect(x, y, 4, 4);
    }
  }
  // 横向管道（视差 0.35 / 0.55，代码绘制增强纵深感）
  drawPipe(ctx, camX * 0.35, 96, 22, '#2e3542', '#414a5c');
  drawPipe(ctx, camX * 0.55, 168, 14, '#3d3020', '#5c4a2e');
  // 警示灯（随时间轮流明灭）
  for (let i = 0; i < 8; i++) {
    const x = (i * 137 - (camX * 0.35) % 137 + CFG.W) % (CFG.W + 137) - 60;
    const on = Math.sin(t * 2.4 + i * 1.7) > 0.2;
    ctx.fillStyle = on ? '#e8722a' : '#4a2c14';
    ctx.fillRect(x, 126, 8, 6);
    if (on) {
      ctx.fillStyle = 'rgba(232,114,42,0.25)';
      ctx.fillRect(x - 4, 122, 16, 14);
    }
  }
  // 地面以上暗角，让前景更突出
  const fog = ctx.createLinearGradient(0, CFG.GROUND_Y - 200, 0, CFG.GROUND_Y);
  fog.addColorStop(0, 'rgba(8,10,16,0)');
  fog.addColorStop(1, 'rgba(8,10,16,0.45)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, CFG.GROUND_Y - 200, CFG.W, 200);
}

function drawPipe(ctx, off, y, h, dark, light) {
  ctx.fillStyle = dark;
  ctx.fillRect(0, y, CFG.W, h);
  ctx.fillStyle = light;
  ctx.fillRect(0, y, CFG.W, 4);
  // 管箍
  ctx.fillStyle = light;
  for (let x = -(off % 190); x < CFG.W; x += 190) ctx.fillRect(x, y - 3, 10, h + 6);
}

// 透明剪影层横向平铺
function tileLayer(ctx, img, offsetX, y, h) {
  const w = img.width * (h / img.height);
  let start = -(offsetX % w);
  if (start > 0) start -= w;
  for (let x = start; x < CFG.W; x += w) {
    ctx.drawImage(img, x, y, w, h);
  }
}

function drawRidge(ctx, off, baseY, amp, color, freq) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, CFG.H);
  for (let x = 0; x <= CFG.W; x += 8) {
    const wx = x + off;
    const y = baseY - Math.abs(Math.sin(wx * 0.004 * freq)) * amp - Math.sin(wx * 0.013) * 22;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(CFG.W, CFG.H);
  ctx.closePath();
  ctx.fill();
}

function drawJungle(ctx, off) {
  ctx.fillStyle = '#0d1a12';
  ctx.fillRect(0, 440, CFG.W, CFG.H - 440);
  // 树冠团
  for (let i = -1; i < 14; i++) {
    const wx = i * 110 + (off % 110);
    const h = 46 + hash01(i + Math.floor(off / 110), 3) * 40;
    ctx.beginPath();
    ctx.arc(wx, 446 - h * 0.3, h, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 雪松剪影：墨绿塔形 + 雪顶
function drawSnowTrees(ctx, off) {
  ctx.fillStyle = '#dfe9f2';
  ctx.fillRect(0, 440, CFG.W, CFG.H - 440);
  for (let i = -1; i < 14; i++) {
    const wx = i * 100 + (off % 100);
    const seed = i + Math.floor(off / 100);
    const h = 56 + hash01(seed, 11) * 46;
    const baseY = 472;
    // 三层塔形
    for (let k = 0; k < 3; k++) {
      const tw = h * (0.62 - k * 0.15);
      const ty = baseY - h * 0.32 * k;
      ctx.fillStyle = k === 2 ? '#2e5a44' : '#234a36';
      ctx.beginPath();
      ctx.moveTo(wx - tw / 2, ty);
      ctx.lineTo(wx + tw / 2, ty);
      ctx.lineTo(wx, ty - h * 0.42);
      ctx.closePath();
      ctx.fill();
      // 雪檐
      ctx.fillStyle = '#eef4fa';
      ctx.beginPath();
      ctx.moveTo(wx - tw * 0.22, ty - h * 0.42 * 0.62);
      ctx.lineTo(wx + tw * 0.22, ty - h * 0.42 * 0.62);
      ctx.lineTo(wx, ty - h * 0.42);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ---------------- 地形绘制 ----------------
export function drawTerrain(ctx, camX, t) {
  for (const s of LEVEL.solids) {
    if (s.x + s.w < camX - 20 || s.x > camX + CFG.W + 20) continue;
    if (s.kind === 'ground') drawGround(ctx, s);
    else if (s.kind === 'rock') drawRock(ctx, s);
    else if (s.kind === 'wall') drawWall(ctx, s);
  }
  for (const p of LEVEL.oneways) {
    if (p.gone) continue;
    if (p.x + p.w < camX - 20 || p.x > camX + CFG.W + 20) continue;
    if (p.kind === 'bridge') drawBridge(ctx, p, t);
    else if (p.kind === 'crumble') drawCrumble(ctx, p, t);
    else if (p.kind === 'quicksand') drawQuicksand(ctx, p, t);
    else drawMetal(ctx, p);
    // 移动平台：底部推进器辉光
    if (p.move) {
      const glow = Math.sin(t * 8) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(122,208,255,${0.3 + glow * 0.4})`;
      ctx.fillRect(p.x + 8, p.y + p.h, p.w - 16, 4);
    }
  }
  // 坑底水面（雪原冰湖 / 基地酸液 / 丛林水）
  for (const [x0, x1] of LEVEL.waters) drawWater(ctx, camX, t, x0, x1);
  // 激光门（基地主题）
  if (LEVEL.lasers) for (const g of LEVEL.lasers) drawLaserGate(ctx, camX, t, g);
}

// 激光门：上下发射器 + 周期明灭的红色光束
function drawLaserGate(ctx, camX, t, g) {
  if (g.x < camX - 40 || g.x > camX + CFG.W + 40) return;
  const on = laserActive(g, t);
  const phase = (t + g.offset) % LASER_PERIOD;
  const y0 = G - g.h;
  // 发射器
  rect(ctx, g.x - 8, y0 - 10, 16, 10, '#4a4e5e');
  rect(ctx, g.x - 8, G, 16, 8, '#4a4e5e');
  rect(ctx, g.x - 3, y0 - 6, 6, 4, on ? '#ff4a3c' : '#6a3030');
  if (on) {
    // 光束（发光叠加）
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,60,40,0.28)';
    ctx.fillRect(g.x - 7, y0, 14, g.h);
    ctx.fillStyle = 'rgba(255,90,60,0.85)';
    ctx.fillRect(g.x - 3, y0, 6, g.h);
    ctx.fillStyle = '#ffd0c0';
    ctx.fillRect(g.x - 1, y0, 2, g.h);
    ctx.restore();
  } else {
    // 熄灭：虚线提示；即将重新激活时闪烁警告
    const warn = LASER_PERIOD - phase < 0.5;
    ctx.fillStyle = warn && Math.floor(t * 10) % 2 ? 'rgba(255,90,60,0.55)' : 'rgba(255,90,60,0.14)';
    for (let y = y0; y < G; y += 14) ctx.fillRect(g.x - 1, y, 2, 8);
  }
}

function drawGround(ctx, s) {
  if (LEVEL.theme === 'snow') return drawSnowGround(ctx, s);
  if (LEVEL.theme === 'base' || LEVEL.theme === 'sky') return drawBaseGround(ctx, s);
  if (LEVEL.theme === 'desert') return drawSandGround(ctx, s);
  if (LEVEL.theme === 'volcano') return drawVolcanoGround(ctx, s);
  if (LEVEL.theme === 'storm') return drawStormGround(ctx, s);
  if (LEVEL.theme === 'citadel') return drawCitadelGround(ctx, s);
  const pat = Assets.pattern(ctx, 'tile_ground');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    rect(ctx, s.x, s.y, s.w, 3, 'rgba(255,255,255,0.25)');
    return;
  }
  rect(ctx, s.x, s.y, s.w, s.h, '#4a2f1d');
  rect(ctx, s.x, s.y, s.w, 10, '#3f7a35');
  rect(ctx, s.x, s.y + 10, s.w, 4, '#5a3b24');
  // 草丛与土块噪点（坐标哈希，静止不闪）
  for (let x = s.x; x < s.x + s.w; x += 18) {
    if (hash01(x, s.y) > 0.55) rect(ctx, x, s.y - 6, 4, 6, '#4f9440');
    if (hash01(x, 99) > 0.6) rect(ctx, x + 6, s.y + 24 + hash01(x, 5) * 30, 5, 4, '#3a2415');
  }
}

// 基地地板：金属板 + 警示条纹边缘
function drawBaseGround(ctx, s) {
  const pat = Assets.pattern(ctx, 'tile_metal');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    rect(ctx, s.x, s.y, s.w, 3, 'rgba(255,255,255,0.2)');
  } else {
    rect(ctx, s.x, s.y, s.w, s.h, '#3a3e4c');
    rect(ctx, s.x, s.y, s.w, 8, '#565c6e');
  }
  // 顶缘黄色警示条纹
  for (let x = s.x; x < s.x + s.w; x += 32) {
    ctx.fillStyle = ((x - s.x) / 32) % 2 ? '#c9a020' : '#26282e';
    ctx.fillRect(x, s.y + 3, 32, 5);
  }
}

// 沙地：金色沙顶 + 砂岩底
function drawSandGround(ctx, s) {
  const pat = Assets.pattern(ctx, 'tile_sand');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    rect(ctx, s.x, s.y, s.w, 3, 'rgba(255,255,255,0.3)');
    return;
  }
  rect(ctx, s.x, s.y, s.w, s.h, '#a8793c');
  rect(ctx, s.x, s.y, s.w, 12, '#d8b060');
  rect(ctx, s.x, s.y + 12, s.w, 4, '#b89048');
  for (let x = s.x; x < s.x + s.w; x += 18) {
    if (hash01(x, s.y) > 0.55) rect(ctx, x, s.y - 4, 6, 4, '#e8c878');
    if (hash01(x, 99) > 0.6) rect(ctx, x + 6, s.y + 24 + hash01(x, 5) * 30, 5, 4, '#8a5f2c');
  }
}

// 火山岩地：玄武岩顶 + 熔岩裂纹
function drawVolcanoGround(ctx, s) {
  rect(ctx, s.x, s.y, s.w, s.h, '#3a2a26');
  rect(ctx, s.x, s.y, s.w, 10, '#5a4038');
  rect(ctx, s.x, s.y + 10, s.w, 4, '#2e201c');
  for (let x = s.x; x < s.x + s.w; x += 22) {
    if (hash01(x, s.y) > 0.62) rect(ctx, x, s.y + 16, 3, 18 + hash01(x, 7) * 16, '#e8552a');
    if (hash01(x, 99) > 0.7) rect(ctx, x + 8, s.y - 4, 5, 4, '#c94a20');
  }
}

// 废城地面：湿沥青 + 积水反光
function drawStormGround(ctx, s) {
  rect(ctx, s.x, s.y, s.w, s.h, '#2a3040');
  rect(ctx, s.x, s.y, s.w, 10, '#3a4458');
  rect(ctx, s.x, s.y + 10, s.w, 4, '#1c2230');
  for (let x = s.x; x < s.x + s.w; x += 28) {
    if (hash01(x, s.y) > 0.55) rect(ctx, x, s.y + 2, 10, 2, '#7ad0ff');
    if (hash01(x, 99) > 0.65) rect(ctx, x + 8, s.y + 22 + hash01(x, 5) * 24, 6, 3, '#1a2030');
  }
}

// 要塞地面：紫黑晶石 + 能量纹
function drawCitadelGround(ctx, s) {
  rect(ctx, s.x, s.y, s.w, s.h, '#241830');
  rect(ctx, s.x, s.y, s.w, 10, '#3a2450');
  rect(ctx, s.x, s.y + 10, s.w, 4, '#160c22');
  for (let x = s.x; x < s.x + s.w; x += 26) {
    if (hash01(x, s.y) > 0.5) rect(ctx, x, s.y + 2, 8, 2, '#e8a0ff');
    if (hash01(x, 99) > 0.62) rect(ctx, x + 6, s.y + 20 + hash01(x, 5) * 22, 5, 3, '#c46ae0');
  }
}

// 雪地：雪顶 + 蓝灰冻土
function drawSnowGround(ctx, s) {
  const pat = Assets.pattern(ctx, 'tile_snow_ground');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    rect(ctx, s.x, s.y, s.w, 3, 'rgba(255,255,255,0.4)');
    return;
  }
  rect(ctx, s.x, s.y, s.w, s.h, '#7d94ac');
  rect(ctx, s.x, s.y, s.w, 12, '#f2f7fc');
  rect(ctx, s.x, s.y + 12, s.w, 4, '#c9dcec');
  // 冰碴与冻土噪点（坐标哈希，静止不闪）
  for (let x = s.x; x < s.x + s.w; x += 18) {
    if (hash01(x, s.y) > 0.55) rect(ctx, x, s.y - 5, 5, 5, '#ffffff');
    if (hash01(x, 99) > 0.6) rect(ctx, x + 6, s.y + 24 + hash01(x, 5) * 30, 5, 4, '#5d7488');
  }
}

function drawRock(ctx, s) {
  const pat = Assets.pattern(ctx, 'tile_rock');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    rect(ctx, s.x, s.y, s.w, 3, 'rgba(255,255,255,0.2)');
    return;
  }
  rect(ctx, s.x, s.y, s.w, s.h, '#5c5a66');
  rect(ctx, s.x, s.y, s.w, 8, '#7d7b8a');
  for (let x = s.x + 6; x < s.x + s.w - 6; x += 16) {
    for (let y = s.y + 14; y < s.y + s.h - 6; y += 14) {
      if (hash01(x, y) > 0.5) rect(ctx, x, y, 6, 5, '#494753');
    }
  }
}

function drawWall(ctx, s) {
  const pat = Assets.pattern(ctx, 'tile_metal');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    rect(ctx, s.x, s.y, 6, s.h, 'rgba(255,255,255,0.15)');
    return;
  }
  rect(ctx, s.x, s.y, s.w, s.h, '#31323e');
  rect(ctx, s.x, s.y, 8, s.h, '#4a4b5c');
  for (let y = 20; y < s.h - 10; y += 46) {
    rect(ctx, s.x + 10, y, 6, 6, '#555668');
  }
}

function drawMetal(ctx, p) {
  const pat = Assets.pattern(ctx, 'tile_metal');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    rect(ctx, p.x, p.y, p.w, 3, 'rgba(255,255,255,0.35)');
    return;
  }
  rect(ctx, p.x, p.y, p.w, p.h, '#6e7488');
  rect(ctx, p.x, p.y, p.w, 4, '#9aa0b5');
  for (let x = p.x + 8; x < p.x + p.w - 4; x += 24) {
    rect(ctx, x, p.y + 7, 4, 4, '#3f4352');
  }
}

// 塌陷平台：裂纹随站立时间加深，即将塌落时抖动
function drawCrumble(ctx, p, t) {
  const crack = (p.stand || 0) / 0.7;
  const jx = crack > 0.55 ? Math.sin(t * 40) * 2 : 0;
  const x = p.x + jx, y = p.y;
  rect(ctx, x, y, p.w, p.h, '#7a6a52');
  rect(ctx, x, y, p.w, 4, '#9c8a68');
  // 裂纹
  ctx.strokeStyle = `rgba(40,30,20,${0.4 + crack * 0.6})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const n = 2 + Math.floor(crack * 4);
  for (let i = 1; i <= n; i++) {
    const lx = x + (p.w / (n + 1)) * i;
    ctx.moveTo(lx, y + 2);
    ctx.lineTo(lx + 5, y + p.h - 2);
  }
  ctx.stroke();
}

// 流沙：金黄漩涡面 + 下陷气泡
function drawQuicksand(ctx, p, t) {
  rect(ctx, p.x, p.y, p.w, 44, '#c9a050');
  // 漩涡纹
  ctx.strokeStyle = '#a8793c';
  ctx.lineWidth = 2;
  for (let x = p.x + 20; x < p.x + p.w - 10; x += 44) {
    const r = 8 + Math.sin(t * 2 + x) * 3;
    ctx.beginPath();
    ctx.arc(x, p.y + 16, r, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  // 表面亮色 + 气泡
  rect(ctx, p.x, p.y, p.w, 4, '#e8c878');
  ctx.fillStyle = '#f0d898';
  for (let i = 0; i < 5; i++) {
    const bx = p.x + hash01(i, p.x) * p.w;
    const by = p.y + 8 + ((t * 12 + i * 9) % 24);
    ctx.fillRect(bx, by, 3, 3);
  }
  // 边缘警示
  rect(ctx, p.x, p.y - 3, p.w, 3, '#c23a2e');
}

function drawBridge(ctx, p, t) {
  const pat = Assets.pattern(ctx, 'tile_bridge');
  if (pat) {
    ctx.save();
    ctx.beginPath();
    for (let x = p.x; x <= p.x + p.w; x += 10) {
      const sag = Math.sin((x - p.x) / p.w * Math.PI) * 10;
      if (x === p.x) ctx.moveTo(x, p.y + sag - 4);
      else ctx.lineTo(x, p.y + sag - 4);
    }
    ctx.lineTo(p.x + p.w, p.y + 20);
    ctx.lineTo(p.x, p.y + 20);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = pat;
    ctx.fillRect(p.x, p.y - 6, p.w, 30);
    ctx.restore();
    return;
  }
  // 吊桥：木板 + 绳索
  for (let x = p.x; x < p.x + p.w; x += 22) {
    const sag = Math.sin((x - p.x) / p.w * Math.PI) * 10;
    rect(ctx, x, p.y + sag, 20, 8, '#7a5230');
    rect(ctx, x, p.y + sag, 20, 3, '#96683c');
  }
  ctx.strokeStyle = '#5a3b24';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = p.x; x <= p.x + p.w; x += 10) {
    const sag = Math.sin((x - p.x) / p.w * Math.PI) * 10;
    ctx.lineTo(x, p.y - 14 + sag * 0.6);
  }
  ctx.stroke();
}

function drawWater(ctx, camX, t, x0, x1) {
  if (x1 < camX || x0 > camX + CFG.W) return;
  if (LEVEL.theme === 'base') {
    // 酸液池：毒绿 + 气泡
    rect(ctx, x0, 500, x1 - x0, 40, '#123d22');
    ctx.fillStyle = '#3fd06a';
    for (let x = x0; x < x1; x += 16) {
      const yy = 502 + Math.sin(t * 3 + x * 0.09) * 3;
      ctx.fillRect(x, yy, 10, 3);
    }
    ctx.fillStyle = '#7af0a0';
    for (let i = 0; i < 4; i++) {
      const bx = x0 + hash01(i, x0) * (x1 - x0);
      const by = 506 + ((t * 26 + i * 17) % 30);
      ctx.fillRect(bx, by, 3, 3);
    }
    return;
  }
  if (LEVEL.theme === 'snow') {
    // 冰湖：浅冰蓝 + 白波纹
    rect(ctx, x0, 500, x1 - x0, 40, '#3d6e94');
    ctx.fillStyle = '#a8d4ea';
    for (let x = x0; x < x1; x += 16) {
      const yy = 502 + Math.sin(t * 3 + x * 0.09) * 3;
      ctx.fillRect(x, yy, 10, 3);
    }
    return;
  }
  if (LEVEL.theme === 'volcano') {
    // 熔岩河：橙红浆面 + 气泡
    rect(ctx, x0, 500, x1 - x0, 40, '#5a1208');
    ctx.fillStyle = '#e8552a';
    for (let x = x0; x < x1; x += 16) {
      const yy = 502 + Math.sin(t * 4 + x * 0.08) * 3;
      ctx.fillRect(x, yy, 10, 3);
    }
    ctx.fillStyle = '#ffc46b';
    for (let i = 0; i < 5; i++) {
      const bx = x0 + hash01(i, x0) * (x1 - x0);
      const by = 506 + ((t * 22 + i * 15) % 28);
      ctx.fillRect(bx, by, 3, 3);
    }
    return;
  }
  if (LEVEL.theme === 'storm') {
    // 积水街道：深青水面 + 雨点涟漪
    rect(ctx, x0, 500, x1 - x0, 40, '#0e2438');
    ctx.fillStyle = '#3a6a88';
    for (let x = x0; x < x1; x += 16) {
      const yy = 502 + Math.sin(t * 4 + x * 0.1) * 3;
      ctx.fillRect(x, yy, 10, 3);
    }
    ctx.fillStyle = '#7ad0ff';
    for (let i = 0; i < 4; i++) {
      const bx = x0 + hash01(i, x0) * (x1 - x0);
      const by = 506 + ((t * 28 + i * 13) % 26);
      ctx.fillRect(bx, by, 2, 2);
    }
    return;
  }
  if (LEVEL.theme === 'citadel') {
    // 虚空裂隙：深紫 + 能量尘
    rect(ctx, x0, 500, x1 - x0, 40, '#0a0618');
    ctx.fillStyle = '#6a2a88';
    for (let x = x0; x < x1; x += 16) {
      const yy = 502 + Math.sin(t * 3.5 + x * 0.11) * 3;
      ctx.fillRect(x, yy, 10, 3);
    }
    ctx.fillStyle = '#e8a0ff';
    for (let i = 0; i < 5; i++) {
      const bx = x0 + hash01(i, x0) * (x1 - x0);
      const by = 506 + ((t * 24 + i * 11) % 26);
      ctx.fillRect(bx, by, 2, 2);
    }
    return;
  }
  rect(ctx, x0, 500, x1 - x0, 40, '#0e2c4f');
  ctx.fillStyle = '#2f6ea8';
  for (let x = x0; x < x1; x += 16) {
    const yy = 502 + Math.sin(t * 3 + x * 0.09) * 3;
    ctx.fillRect(x, yy, 10, 3);
  }
}
