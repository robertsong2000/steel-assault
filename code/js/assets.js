// ===================== 图片资源加载器 =====================
// 所有生成素材集中加载；加载失败时回退 null，渲染层自动退回代码手绘。
const FILES = {
  // 玩家（2x2 帧：跑A/跑B/跳/蹲）
  player_0: 'assets/img/player_0.png',
  player_1: 'assets/img/player_1.png',
  player_2: 'assets/img/player_2.png',
  player_3: 'assets/img/player_3.png',
  // 跑男（2x2 四帧跑循环）
  runner_0: 'assets/img/runner_0.png',
  runner_1: 'assets/img/runner_1.png',
  runner_2: 'assets/img/runner_2.png',
  runner_3: 'assets/img/runner_3.png',
  // 单体敌人
  turret: 'assets/img/turret.png',
  sniper: 'assets/img/sniper.png',
  drone: 'assets/img/drone.png',
  // Boss
  boss_core: 'assets/img/boss_core.png',
  boss_cannon: 'assets/img/boss_cannon.png',
  // 地形砖块
  tile_ground: 'assets/img/tile_ground.png',
  tile_rock: 'assets/img/tile_rock.png',
  tile_metal: 'assets/img/tile_metal.png',
  tile_bridge: 'assets/img/tile_bridge.png',
  // 背景层
  bg_sky: 'assets/img/bg_sky.png',
  bg_mountains: 'assets/img/bg_mountains.png',
  bg_jungle: 'assets/img/bg_jungle.png',
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
    return Promise.all(jobs);
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
