# 钢铁突击 STEEL ASSAULT

类魂斗罗（Contra-style）横版跑射网页游戏。纯原创：关卡设计、代码、音乐均为原创；
美术为 PPToken（gpt-image-2）AI 生成的原创像素素材，经品红键控/帧提取后接入；
胜利/失败/开场 stinger 来自本地 Kenney CC0 素材库。

## 运行

需要通过本地 HTTP 服务器打开（ES Module 限制，不能直接双击 html）：

```bash
cd code
python3 -m http.server 8931
# 浏览器打开 http://localhost:8931
```

## 操作

| 按键 | 功能 |
| --- | --- |
| ← / → | 移动 |
| ↑ / ↓ | 向上瞄准 / 蹲下（空中朝下射击） |
| Z | 射击（支持八方向） |
| X / 空格 | 跳跃 |
| ENTER | 开始 / 暂停 |
| M | 静音 |

## 玩法

- 一击必杀，3 条命；死亡掉落当前武器，重生短暂无敌
- 打落**无人机**掉落补给：**M** 机枪（高射速）/ **S** 散弹（5 路扇形）
- 敌人：跑男、自瞄炮台、掩体狙击手
- 关卡终点是装甲要塞：先拆双副炮，再集中火力打爆**核心**
- 标题画面输入经典秘技 ↑↑↓↓←→←→BA 可获得 30 条命（彩蛋）

## 素材管线（generate2dsprite + PPToken）

```
assets/raw/        PPToken 生成的原图（品红底 #FF00FF）
assets/sprites/    generate2dsprite.py 处理产物（键控/帧提取/QC meta/GIF）
assets/img/        游戏实际加载的最终图（透明帧 + 砖块 + 背景层）
assets/audio/      Kenney CC0 jingles
```

- 精灵表（玩家/跑男 2x2）：`generate2dsprite.py process --mode sheet --rows 2 --cols 2 --shared-scale`
- 单体（炮台/狙击手/无人机/Boss）：`--rows 1 --cols 1`
- 地形砖块（满格 2x2）：定制脚本按网格切分后缩放为 64px
- 背景层（远山/丛林）：品红键控转透明后裁切；天空层直接缩放至 960x540
- 重新生成某张图：替换 `assets/raw/<name>.png` 后重跑对应处理命令即可

## 技术

- 零依赖：原生 ES Module + Canvas 2D，固定步长游戏循环（60Hz）
- 音频：WebAudio 实时合成（射击/爆炸/跳跃等音效 + 原创 BGM 步进音序器）
- 渲染：AI 精灵图优先，任何素材缺失时自动回退代码手绘（见 `js/assets.js`）
- `js/config.js` 集中所有手感调参（重力/速度/射速/关卡长度等）
