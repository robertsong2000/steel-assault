# STEEL ASSAULT — Cloud Agent 约定

## 质量门禁（每次改代码后必须跑）

```bash
npm run check
```

等价于：`npm test`（`node:test` 单测）+ `npm run test:levels`（`check-levels.mjs`）。

失败则不得 push / 不得开 PR。

## 测试驱动（TDD）

1. **先写失败测试**，覆盖你要改的行为（回归或新验收）。
2. **再写最小实现**让测试变绿。
3. 新功能必须带 `code/tests/*.test.js`；关卡/敌人数据变更必须仍通过 `check-levels`。
4. 禁止靠删除断言或弱化断言“刷绿”。

## 定时自动化

若你是由 Cursor Automation 启动的 TODO 工人：

- 唯一任务源：`AUTOMATION_QUEUE.md`
- 完整指令：`AUTOMATION.md` 与 `.cursor/automations/todo-tdd-runner.prompt.md`
- 一次只做一项；做完更新队列状态并开 draft PR

## 代码边界

- 游戏逻辑在 `code/js/`（浏览器 ES Module，零运行时依赖）
- 调参集中在 `code/js/config.js`
- 关卡数据在 `code/js/level.js` 的 `LEVELS`
- 不要把 `code/assets/raw/` 加回版本库
- 分支名保持 `cursor/<slug>-5a04` 小写格式
