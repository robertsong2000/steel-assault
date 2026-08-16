# STEEL ASSAULT — 自动化任务队列

> Cloud Automation 每轮只取 **一项** `status: open` 且优先级最高的任务。
> 完成后把 status 改为 `done`，并在 TODO.md 对应项打 ✅。
> Memories 里记录最近完成的 `id`，避免重复挑选。

## 选取规则

1. 只选 `status: open`
2. 按 `priority` 升序（P1 先于 P2），同优先级按列表顺序
3. 一次 run **只做一项**；做不完就缩小范围，不要并行开多项
4. 若队列为空：更新 Memories「queue empty」、**不要**空开 PR，直接结束

---

## 队列

### A1 — 手柄支持（Gamepad API）
- **status**: done
- **priority**: P2
- **source**: TODO.md → P2 手柄支持
- **scope**: `code/js/input.js`（+ 必要时 `touch.js` / `hud.js` 提示文案）
- **acceptance**:
  - 连接手柄后可移动/跳/射/暂停
  - 标题画面可用手柄选关与难度
  - 无手柄时键盘/触屏行为不变
- **tests（TDD 必写）**:
  - 新增 `code/tests/input-gamepad.test.js`（可测纯函数：轴→动作映射、死区）
  - `npm run check` 全绿

### A2 — 设置界面（音量、按键自定义）
- **status**: done
- **priority**: P2
- **source**: TODO.md → P2 设置界面
- **scope**: `hud.js` / `audio.js` / `input.js` / `main.js` / `utils.js`（localStorage）
- **acceptance**:
  - 标题或暂停可进设置
  - 主音量可调并持久化
  - 至少射击/跳跃键可自定义并持久化
  - 坏 localStorage / 隐私模式不崩溃
- **tests（TDD 必写）**:
  - 音量/键位读写 round-trip + 非法值回退
  - `npm run check` 全绿

### A3 — 新敌人：巡逻机器人
- **status**: done
- **priority**: P1
- **source**: TODO.md → 新敌人类型（扩展）
- **scope**: `enemies.js` + 在现有 1–2 关 `triggers` 少量投放（不要一次改五关）
- **acceptance**:
  - 有明确 AI（来回巡逻 + 发现玩家射击）
  - 有绘制（素材可代码手绘回退）
  - `check-levels.mjs` 仍全绿
- **tests（TDD 必写）**:
  - 生成/状态机/得分映射单测
  - `npm run check` 全绿

### A4 — 新敌人：掷弹兵变种
- **status**: done
- **priority**: P1
- **source**: TODO.md → 新敌人类型（扩展）
- **scope**: `enemies.js` + 关卡少量投放
- **acceptance**: 与现有 grenadier 行为可区分；不破坏盾牌/火焰交互回归
- **tests**: 变种行为单测 + `npm run check`

### A5 — 新机关：滚雪球陷阱（第 2 关）
- **status**: done
- **priority**: P1
- **source**: TODO.md → 新敌人类型（扩展）
- **scope**: `enemies.js` 或 `level.js` 动态 + L2 triggers
- **acceptance**: 雪原关可见；可躲/可打爆；不影响其他关
- **tests**: 生成与伤害边界单测 + `npm run check`

### A6 — 第 6 关（规划落地）
- **status**: done
- **priority**: P1
- **depends**: 建议先完成 A3–A5 至少一项，避免空关卡
- **source**: TODO.md → 第 6~8 关
- **scope**: `level.js` LEVELS 追加 + Boss 新文件或复用变体 + `BOSS_CLASSES` + `LEVEL_MUSIC` + `check-levels`
- **acceptance**:
  - 新关可从标题选中
  - Boss 可击败；关卡校验全绿
  - 更新「exposes exactly 5 campaign levels」等硬编码断言为 6
- **tests**: 关卡隔离 / Boss 注册 / `npm run check`

### A7 — 第 7 关
- **status**: open
- **priority**: P1
- **depends**: A6
- **source**: TODO.md → 第 6~8 关

### A8 — 第 8 关
- **status**: open
- **priority**: P1
- **depends**: A7
- **source**: TODO.md → 第 6~8 关

---

## 完成时清单

- [ ] 本项 acceptance 全部满足
- [ ] 新增/更新测试，且 **先红后绿** 有体现（提交信息或 PR 描述写清）
- [ ] `npm run check` 通过
- [ ] `TODO.md` 对应项改为 ✅（若整项完成）
- [ ] 本文件该项 `status: done`
- [ ] 开 draft PR，标题带队列 id（如 `A1: gamepad support`）
