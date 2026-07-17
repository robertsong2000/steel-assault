# 钢铁突击 / STEEL ASSAULT

类魂斗罗（Contra-style）横版跑射网页游戏。

在线试玩：直接打开 `code/index.html` 所在的本地服务器即可。

## 快速开始

```bash
cd code
python3 -m http.server 8931
# 浏览器打开 http://localhost:8931
```

## 项目结构

```
code/
├── index.html
├── style.css
├── js/           # 游戏逻辑（零依赖 ES Module）
├── assets/
│   ├── raw/      # PPToken 生成的原图
│   ├── img/      # 游戏最终加载的透明素材
│   └── audio/    # Kenney CC0 短音效
└── README.md     # 完整操作说明与素材管线
```

更详细的玩法、操作、素材管线说明见 [`code/README.md`](code/README.md)。
