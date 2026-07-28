// ===================== 图片资源加载器 =====================
// 所有生成素材集中加载；加载失败时回退 null，渲染层自动退回代码手绘。
const FILES = {
  // 玩家（2x2 帧：跑A/跑B/跳/蹲）
  player_0: 'assets/img/player_0.webp',
  player_1: 'assets/img/player_1.webp',
  player_2: 'assets/img/player_2.webp',
  player_3: 'assets/img/player_3.webp',
  // 跑男（2x2 四帧跑循环）
  runner_0: 'assets/img/runner_0.webp',
  runner_1: 'assets/img/runner_1.webp',
  runner_2: 'assets/img/runner_2.webp',
  runner_3: 'assets/img/runner_3.webp',
  // 单体敌人
  turret: 'assets/img/turret.webp',
  sniper: 'assets/img/sniper.webp',
  drone: 'assets/img/drone.webp',
  // Boss
  boss_core: 'assets/img/boss_core.webp',
  boss_cannon: 'assets/img/boss_cannon.webp',
  yeti: 'assets/img/yeti.webp',
  mech: 'assets/img/mech.webp',
  heli: 'assets/img/heli.webp',
  // 武器徽章
  emblem_R: 'assets/img/emblem_R.webp',
  emblem_M: 'assets/img/emblem_M.webp',
  emblem_S: 'assets/img/emblem_S.webp',
  emblem_L: 'assets/img/emblem_L.webp',
  emblem_G: 'assets/img/emblem_G.webp',
  emblem_H: 'assets/img/emblem_H.webp',
  emblem_F: 'assets/img/emblem_F.webp',
  emblem_B: 'assets/img/emblem_star.webp',   // 防护罩：金星徽章
  // 自爆滚雷
  roller: 'assets/img/roller.webp',
  // 沙虫 / 熔岩巨兽
  sandworm: 'assets/img/sandworm.webp',
  lavabeast: 'assets/img/lavabeast.webp',
  // 冰晶冲击波
  icewave: 'assets/img/icewave.webp',
  // 武器子弹 / 特效帧
  bullet_laser: 'assets/img/bullet_laser.webp',
  bullet_missile: 'assets/img/bullet_missile.webp',
  bullet_grenade: 'assets/img/bullet_grenade.webp',
  flame_0: 'assets/img/flame_0.webp',
  flame_1: 'assets/img/flame_1.webp',
  flame_2: 'assets/img/flame_2.webp',
  flame_3: 'assets/img/flame_3.webp',
  explode_0: 'assets/img/explode_0.webp',
  explode_1: 'assets/img/explode_1.webp',
  explode_2: 'assets/img/explode_2.webp',
  explode_3: 'assets/img/explode_3.webp',
  // 地形砖块
  tile_ground: 'assets/img/tile_ground.webp',
  tile_rock: 'assets/img/tile_rock.webp',
  tile_metal: 'assets/img/tile_metal.webp',
  tile_bridge: 'assets/img/tile_bridge.webp',
  tile_snow_ground: 'assets/img/tile_snow_ground.webp',
  // 背景层
  bg_sky: 'assets/img/bg_sky.webp',
  bg_mountains: 'assets/img/bg_mountains.webp',
  bg_jungle: 'assets/img/bg_jungle.webp',
  // 背景层（第 2 关雪原）
  bg_snow_sky: 'assets/img/bg_snow_sky.webp',
  bg_snow_mountains: 'assets/img/bg_snow_mountains.webp',
  bg_snow_trees: 'assets/img/bg_snow_trees.webp',
  // 背景层（第 3 关基地）
  bg_base: 'assets/img/bg_base.webp',
  // 背景层（第 4 关战舰）
  bg_sky4: 'assets/img/bg_sky4.webp',
  // 背景层（第 5 关遗迹）
  bg_desert: 'assets/img/bg_desert.webp',
  bg_ruins: 'assets/img/bg_ruins.webp',
  tile_sand: 'assets/img/tile_sand.webp',
};

export const Assets = {
  map: {},
  patterns: {},

  load() {
    const jobs = Object.entries(FILES).map(([name, src]) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { this.map[name] = img; resolve(); };
        img.onerror = () => { this.map[name] = null; resolve(); }; // 缺失素材不阻塞游戏
        img.src = src;
      })
    );
    return Promise.all(jobs).then(() => {
      this.recolorPlayerSnow();
      // 雪原新敌人换色：雪球兵（跑男→冰蓝）/ 寒冰无人机（补给机→青）
      for (let i = 0; i < 4; i++) {
        this.recolorSprite(`runner_${i}`, `grenadier_${i}`, (r, g, b) =>
          (r > g + 30 && r > b + 30 && r + g + b < 540)
            ? [r * 0.25 + 20, r * 0.45 + 30, Math.min(255, r * 0.85 + 40)] : null);
      }
      this.recolorSprite('drone', 'flyer', (r, g, b) =>
        (Math.max(r, g, b) - Math.min(r, g, b) < 60)
          ? [r * 0.35, Math.min(255, g * 0.75 + 50), Math.min(255, b * 0.85 + 80)] : null);
      // 蛙跳兵（跑男→紫）/ 空降兵（跑男→卡其）
      for (let i = 0; i < 4; i++) {
        this.recolorSprite(`runner_${i}`, `jumper_${i}`, (r, g, b) =>
          (r > g + 30 && r > b + 30 && r + g + b < 540)
            ? [r * 0.55 + 40, g * 0.4, Math.min(255, r * 0.7 + 60)] : null);
        this.recolorSprite(`runner_${i}`, `para_${i}`, (r, g, b) =>
          (r > g + 30 && r > b + 30 && r + g + b < 540)
            ? [r * 0.62, r * 0.56, b * 0.5] : null);
      }
      // 玩家主题迷彩：基地深灰夜行 / 遗迹沙漠卡其
      for (let i = 0; i < 4; i++) {
        this.recolorSprite(`player_${i}`, `player_base_${i}`, (r, g, b) =>
          (g > r + 18 && g > b + 18) ? [g * 0.45, g * 0.52, g * 0.68] : null);
        this.recolorSprite(`player_${i}`, `player_desert_${i}`, (r, g, b) =>
          (g > r + 18 && g > b + 18) ? [Math.min(255, g * 1.15), g * 0.82, b * 0.45] : null);
      }
      // 玩家精灵统一加深色描边（从背景中跳出来）
      for (let i = 0; i < 4; i++) {
        for (const p of ['player', 'player_snow', 'player_base', 'player_desert']) {
          if (this.map[`${p}_${i}`]) this.map[`${p}_${i}`] = this.outlineSprite(this.map[`${p}_${i}`]);
        }
      }
    });
  },

  // 雪原主题：玩家绿色军装 → 亮橙冬装（运行时换色，无需新素材）
  recolorPlayerSnow() {
    for (let i = 0; i < 4; i++) {
      const img = this.map[`player_${i}`];
      if (!img) continue;
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height);
      const p = d.data;
      for (let j = 0; j < p.length; j += 4) {
        const r = p[j], g = p[j + 1], b = p[j + 2];
        // 绿色主导像素（军装/头盔）→ 亮橙色系，保持明暗层次
        if (p[j + 3] > 0 && g > r + 18 && g > b + 18) {
          p[j] = Math.min(255, g * 1.75);
          p[j + 1] = g * 0.72;
          p[j + 2] = b * 0.3;
        }
      }
      cx.putImageData(d, 0, 0);
      this.map[`player_snow_${i}`] = c;
    }
  },

  // 给精灵生成一圈深色描边（透明像素中贴近实体的部分填深色）
  outlineSprite(img, th = 2) {
    const w = img.width, h = img.height;
    const c = document.createElement('canvas');
    c.width = w + th * 2;
    c.height = h + th * 2;
    const cx = c.getContext('2d');
    cx.drawImage(img, th, th);
    const d = cx.getImageData(0, 0, c.width, c.height);
    const p = d.data;
    const src = new Uint8ClampedArray(p);
    const W = c.width, H = c.height;
    const alphaAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : src[(y * W + x) * 4 + 3];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (alphaAt(x, y) > 0) continue;
        let edge = false;
        for (let dy = -th; dy <= th && !edge; dy++) {
          for (let dx = -th; dx <= th && !edge; dx++) {
            if (dx * dx + dy * dy <= th * th && alphaAt(x + dx, y + dy) > 40) edge = true;
          }
        }
        if (edge) {
          const i = (y * W + x) * 4;
          p[i] = 18; p[i + 1] = 20; p[i + 2] = 28; p[i + 3] = 255;
        }
      }
    }
    cx.putImageData(d, 0, 0);
    return c;
  },

  // 通用换色：fn(r,g,b) 返回新颜色数组或 null（保留原色）
  recolorSprite(srcName, dstName, fn) {
    const img = this.map[srcName];
    if (!img) return;
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, c.width, c.height);
    const p = d.data;
    for (let j = 0; j < p.length; j += 4) {
      if (p[j + 3] === 0) continue;
      const nc = fn(p[j], p[j + 1], p[j + 2]);
      if (nc) { p[j] = nc[0]; p[j + 1] = nc[1]; p[j + 2] = nc[2]; }
    }
    cx.putImageData(d, 0, 0);
    this.map[dstName] = c;
  },

  get(name) {
    return this.map[name] || null;
  },

  // 平铺纹理（用于地形填充）
  pattern(ctx, name) {
    if (!this.patterns[name] && this.map[name]) {
      this.patterns[name] = ctx.createPattern(this.map[name], 'repeat');
    }
    return this.patterns[name] || null;
  },
};

// 画一张适配目标矩形的图片（保持纵横比，按高度对齐脚底，支持左右翻转）
export function drawSprite(ctx, img, x, y, w, h, { flip = false, scale = 1, alpha = 1 } = {}) {
  if (!img) return false;
  const dw = w * scale, dh = h * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (flip) {
    ctx.translate(x + w / 2, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -dw / 2, y + h - dh, dw, dh);
  } else {
    ctx.drawImage(img, x + w / 2 - dw / 2, y + h - dh, dw, dh);
  }
  ctx.restore();
  return true;
}
