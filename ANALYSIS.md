# STEEL ASSAULT — 代码审查与不足分析报告

> **修复状态（2026-07-28）**：P0×3 + P1×6 已全部修复并回归验证通过（13/13）。
> 修复要点：
> - P0-1 → `level.js setLevel` 先 `delete` 旧 key；并追加 `structuredClone` 深拷贝 solids/oneways
>   （架构师复审发现 Low-1：浅拷贝共享引用导致塌陷/流沙/移动平台运行时状态跨重开残留，已一并根治）
> - P0-2 → `utils.js` 新增 `loadNum`/`saveVal`，main.js 全部 localStorage 收口
> - P0-3 → `start(keepRun)`，胜利连关 `start(true)` 累计分数/战绩
> - P1-4 → `enemies.js` 导出 `ebSpeed()`，敌人+5 Boss 直射弹全部收口（弹道解算弹 vx=dx/T 除外，已注释说明）
> - P1-5 → 55 张素材 PNG→WebP（徽章 64px），12MB→1.3MB；`assets/raw/` 已 git untrack + `.gitignore`/`.dockerignore`
> - P1-6 → 新建 `js/bossbase.js` BaseBoss，5 Boss extends，净删 78 行、消重复约 150 行
> - P1-7 → lavabeast 岩浆池从 `LEVEL.wallX` 派生 + 站进岩浆致死（尊重 inv/shieldT）
> - P1-8 → `groundTopAt(x,{safe})` 跳过塌落平台/流沙；respawn 附近扫描安全点；刷兵用 safe
> - P1-9 → `audio.js schedule()` catch-up 最多补 4 步
> - 验证：node --check ×20、check-levels.mjs 5 关全绿、集成回归 13 项、架构师对抗复审 APPROVED、
>   deslop 通过（删 heli.js 1 处死代码）

> 生成日期：2026-07-28
> 范围：`code/js/` 全部 19 个 ES Module（约 5400 行）、`index.html`、`style.css`、`tools/check-levels.mjs`、Docker 工程化配置、素材目录
> 说明：P0 第 1、2 项已经 Node 实测复现；本报告为只读分析，未修改任何游戏代码。

## 总评

代码整体质量不错：固定步长 60Hz 主循环、粒子/子弹对象上限护栏、素材缺失全面回退代码手绘、`check-levels.mjs` 永久关卡数据校验都是亮点。主要技术债集中在：

1. **`setLevel` 状态残留（真 bug，已复现）**
2. **5 个 Boss 文件大面积复制粘贴**
3. **难度倍率未收口，Boss 不吃难度**
4. **素材体积与 git/镜像卫生**

---

## 🔴 P0 — 必修 Bug

### 1. 关卡切换时 `LEVEL` 残留上一关字段 ⭐ 最严重（已实测复现）

- **位置**：`code/js/level.js:380-387` — `setLevel()` 只做 `Object.assign(LEVEL, def)`，**不删除旧 key**。
- **实测**：先 `setLevel(4)`（遗迹）再 `setLevel(0)`（丛林）后，`LEVEL.sandworms`、`LEVEL.ebulletMul` 等字段残留。
- **后果链**：
  - `main.js:96-97` 按 `LEVEL.grenadiers/shielders/sandworms || []` 刷兵 → 玩过第 3/5 关后重玩第 1 关会**错误刷出沙虫/盾牌兵**；
  - `main.js:463-470` + `level.js:818` — 第 3 关的激光门（x=1200/2400/3300/4500）会在其他关卡**绘制并秒杀玩家**；
  - `enemies.js:138` — 第 5 关的 `ebulletMul: 1.15` 永久污染后续所有关卡的敌弹速度；
  - `main.js:213` — 第 4 关侧风残留影响第 5 关跳跃。
- 标题画面允许任意选关（`main.js:50` `unlocked = LEVELS.length - 1`），触发路径非常容易。
- **修复方向**：`setLevel` 开头先清空：`for (const k in LEVEL) delete LEVEL[k]`。

### 2. localStorage 损坏值导致启动即崩 / 全程无写保护

- `main.js:51` — `+(getItem('steel_assault_diff') ?? 1)` 若被写成非数字 → `Math.max(0, NaN)` = `NaN` → `DIFFS[NaN]` 为 `undefined` → `start()` 第 90 行 `.lives` 抛 TypeError，游戏无法开始。
- `main.js:42,111,190` — `getItem/setItem` 无 try/catch；Safari 隐私模式等环境 `setItem` 会抛异常（发生在 `addScore` 热路径上，每次破纪录都抛）。

### 3. 胜利"连关"会清空总分，HI 体系形同虚设

- `main.js:270-272` 连关 → `start()`；`main.js:80` `this.score = 0` — 每过一关分数清零。
- 玩家打穿 5 关，HI 只记录单关最高分，与街机/魂斗罗惯例（全程累计）相悖；`hud.js` 的 HI 展示价值大减。要么累计，要么改文案。

---

## 🟡 P1 — 重要改进

### 4. 难度系统死角：`DIFF_MUL` / `ebulletMul` 只对部分敌弹生效

- `enemies.js:138,143` 默认参数才乘倍率，以下路径全部绕过：
  - `enemies.js:217` 狙击手：`CFG.EBULLET_SPEED + 30`（固定值）；
  - `boss.js:77,88-89` 要塞副炮/扇形弹幕：显式传 speed，不含倍率；
  - `heli.js:103,141`、`yeti.js:98-99,115-120`、`mech.js:84-85,102-107`、`lavabeast.js:110-115` 全部手抛弹幕，不吃难度。
- 结果：选"硬核"主要只影响命数和炮台灯兵，5 个 Boss 难度几乎不变。
- **建议**：统一收口到一个 `enemyBulletSpeed()` 工厂函数。

### 5. 素材体积与加载策略

- `assets/img` 12MB 全部在 `assets.js:80-89` 启动时**串行一次性拉取**（55 张），无进度反馈（`main.js:613-620` 只有静态"加载中"文字）。
- 单文件极不合理：`emblem_*.png` 8 张各 ~140KB（HUD 只画 24×24）、`lavabeast.png` 1.1MB、`bg_*.png` 400-900KB 未压缩。可用 pngquant/WebP 压到 <2MB。
- `assets/raw/` **35MB 中间产物仍被 git 追踪**（实测 33 个文件），与"untrack 可再生中间产物"的意图相悖，clone 体积白白 +35MB。
- `.dockerignore` 排除了 `assets/sprites/` 但**没排除 `assets/raw/`** → Docker 镜像内嵌 35MB 永远不会被请求的文件。

### 6. 5 个 Boss 文件大面积复制粘贴，应抽象基类

- `boss.js / yeti.js / mech.js / heli.js / lavabeast.js` 中以下块几乎逐字重复（每处 ~20 行）：
  - 死亡连锁爆炸序列：`boss.js:36-53` ≈ `yeti.js:43-60` ≈ `mech.js:44-60` ≈ `heli.js:49-70` ≈ `lavabeast.js:47-65`（仅间隔/时长微调）；
  - 构造器公共字段：`cannons=[]、dead、done、dyingT、boomT、flash、clearText、title`、`get phase2()`（5 处相同）；
  - `damage()` 核心扣分模式：`mech.js:154-164` = `heli.js:189-199` = `lavabeast.js:181-191`（仅分数 8000/10000/12000 魔法数字不同）。
- 一个 `BaseBoss`（含 `updateDying()`、`damageCore()`、`hitCircle()`）可消掉 ~300 行重复。

### 7. 熔岩巨兽关卡几何硬编码，与关卡数据脱节

- `lavabeast.js:8-9` `POOL_X0=4820 / POOL_X1=5280`、`spots=[4900,5050,5200]` 写死，不读 `LEVEL.wallX`（5310）。关卡表调整 wallX 后岩浆池与 Boss 墙错位，且 `check-levels.mjs` 无法发现。
- 同 Boss：岩浆池纯视觉，**玩家站进岩浆不掉血**（只有喷泉/火球有伤害），与第 1-3 关"水面=落坑死"的认知冲突。

### 8. 重生点计算不看平台状态

- `level.js:391-399` `groundTopAt()` 不区分 `p.gone`（塌陷平台消失期）和 `quicksand`：
  - 在塌陷平台消失瞬间死亡 → `main.js:142-146` `respawn()` 可能把玩家放回已消失平台 → 连死循环；
  - 刷兵 `spawnRunners/spawnJumpers/spawnRollers`（`enemies.js:25,79,92`）可能把兵刷在流沙上。

### 9. BGM 音序器在后台标签页漂移，回前台爆音

- `audio.js:174,183-190` — `setInterval` 在后台被节流但 `ctx.currentTime` 持续前进，回前台时 `while` 循环把错过的几十/上百个音符全部排进过去时间 → Web Audio 瞬间叠放（一声巨响）。
- **建议**：catch-up 加上限（如最多补 4 步，其余直接跳过）。

---

## 🟢 P2 — 可选优化

### 代码质量

10. **死代码/无效逻辑**：`utils.js:30` `ent.hitWall` 全仓库只写不读；`hud.js:90-104` 选关"🔒"逻辑因 `main.js:50` 全解锁成为不可达分支；`config.js:16` `LEVEL_W` 初始值会被 `setLevel` 覆盖。
11. **魔法数字散落**：竞技场左缘 660/680 在 `yeti.js:164`、`mech.js:9`、`heli.js:8` 三处各自定义；`check-levels.mjs:46` 激光高度硬编码 110/240；`main.js:355` 子弹上限 240、`enemies.js:387` 敌弹上限 120、`particles.js:5` 粒子 320 等护栏无量纲说明。
12. **全局可变单例耦合**：`LEVEL`（`level.js:378`）与 `CFG`（`level.js:384-386` 反向写回）被 main/player/enemies/boss 全部直接 import 读写，测试和重构困难；`window.__game`（`main.js:623`）暴露调试句柄。

### 性能

13. **每帧分配**：`main.js:385,446` 每颗子弹每帧新建碰撞矩形对象；`main.js:571`、`player.js:211`、`enemies.js:546,644,696,752` 每个实体每帧 `.map()` 生成 4 元素帧数组再 `every(Boolean)`；`level.js:393` `groundTopAt` 每次 `[...solids, ...oneways]` 展开新数组。建议帧数组在 `Assets.load()` 后预组装缓存。
14. **音频噪声 buffer 不复用**：`audio.js:106-125,219-253` 每次射击/爆炸/hi-hat 都 `createBuffer` + 逐样本随机填充（机枪 12 发/秒、BGM 每步 hat/snare 各一块）。预生成 1 块共享 noise buffer 可省掉大部分分配。
15. **无 HiDPI 适配**：`index.html:12` canvas 固定 960×540，纯 CSS 拉伸；Retina 上依赖 `image-rendering: pixelated`，背景大图（非像素风）会被 `main.js:28` 的 `imageSmoothingEnabled=false` 一起劣化。
16. **localStorage 热写**：`main.js:109-112` 破纪录后每次加分都同步写盘，应在 gameover/victory 时统一落盘。

### 架构 / 健壮性

17. **静音状态丢失**：`audio.js:51-55` `toggleMute` 在 ctx 未创建时只置标志位，但 `ensure()`（`:37-38`）无条件 `master.gain.value = 0.45`，标题画面按 M 后进入游戏静音失效。
18. **AudioContext 无兜底**：`audio.js:35-36` 若浏览器无 `AudioContext`，`new AC()` 直接抛错且无 catch（素材加载有降级、音频没有）。
19. **模块加载失败无 UI**：`index.html:15` 若 `js/main.js` 404 或语法错误，页面永远停在黑屏"加载中"（该文字画在 canvas 上，`main.js:615-620`，模块本身失败时连这个都看不到——实际是全黑）。
20. **触屏无鼠标回退**：`touch.js:38-40` 只绑 touch 事件，带触屏的 Windows 笔记本上虚拟按键无法用鼠标点。

### 游戏完整性

21. **命中率可超 100%**：`main.js:134` 散弹 shots 计 5，但 AOE/穿透 `stats.hits++`（`main.js:339,346,349,397,414`）按命中实体数计 → `hud.js:122,145` 命中率失真。
22. **Boss 亡、玩家同时死的时序**：`main.js:228-241` 玩家死亡结算先于 Boss 胜利判定，命数为 0 时同帧击杀 Boss 仍判 gameover（合理但建议确认是设计意图并加注释）。
23. **最高分 NaN 边界**：`main.js:42` 若存储值被改成非数字字符串，`hi` 变 NaN 后 `score > NaN` 永假，HI 永远无法再更新（与 P0-2 同源）。

### 工程化

24. **零测试零 lint 零构建**：仅有 `tools/check-levels.mjs`（数据校验，实测通过 ✅）；无 `package.json`（Node 运行报 `MODULE_TYPELESS_PACKAGE_JSON` 警告）、无 CI、无 ESLint/Prettier。
25. **nginx 无优化**：`Dockerfile` 未提供自定义 nginx.conf — 无 gzip/brotli（12MB PNG/JS 全量直传）、无静态资源 Cache-Control（`index.html:8,15` 只对 css/js 手工 `?v=3`，图片无版本号，更新后可能吃到旧缓存）；`docker-compose.yml:1` `version: '3.8'` 字段已被新版 Compose 废弃（启动有 warning）；基础镜像 `nginx:alpine` 未 pin digest。

---

## 建议修复顺序

| 顺序 | 项目 | 理由 |
| --- | --- | --- |
| 1 | P0-1 `setLevel` 清字段 | 一行修复，影响最大（实测可复现） |
| 2 | P0-2 localStorage 保护 + P1-9 BGM catch-up 上限 | 健壮性，成本低 |
| 3 | P1-4 难度倍率收口 `enemyBulletSpeed()` | 难度系统名实相符 |
| 4 | P1-5 git untrack `assets/raw/` + `.dockerignore` 排除 + 素材压缩 | 仓库/镜像瘦身 ~35MB |
| 5 | P1-6 `BaseBoss` 抽象 | 消 ~300 行重复，后续加 Boss 更快 |
| 6 | P0-3 累计计分 / P1-7 岩浆伤害 / P1-8 重生点安全 | 游戏完整性打磨 |
