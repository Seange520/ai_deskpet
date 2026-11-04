# 昼夜系统与情绪反馈

## 时间与展示状态

`src/features/environment/useEnvironmentStore.js` 使用独立 Zustand 内存状态：mode、hour、night、idleSleeping。默认 mode=auto，通过浏览器 `new Date().getHours()` 判断本地时间；19:00 起至次日 06:00 前为夜间。手动白天/黑夜覆盖时钟，点击「跟随本地时间」恢复自动；关闭聚焦不会丢失当前会话选择，刷新后恢复自动。不写 localStorage 或主学习 Store。

`useEnvironment` 每 30 秒核对小时，恢复页面可见时立即同步；夜间仅改变背景、三个场景灯光强度及半闭眼/轻微低头，不强制休眠、不改变 LED 指令亮度，也不阻断 jump/spin 或真实沙盒动作。`EnvironmentLighting` 独立阻尼灯光强度，保留同一 Canvas、几何体、相机与原动画事件；减少动画时采用静态切换。

## 闲置与情绪优先级

- 一分钟没有 pointermove/pointerdown/touchstart/keydown/wheel 时设置闲置休眠；活动只清除 idleSleeping，不清除硬件暗光或手动休眠。
- 用一个延迟检查器记录活动时间，不在每次鼠标移动时重建计时器。页面隐藏时清理计时器，恢复可见后重新计算；组件卸载移除全部监听与计时器。
- 原 usePetActions、runtime、XP、闯关、Debug 与存档迁移不变。真实休眠优先于夜间困倦与摸头反馈。
- 1.8 秒内三次有效头部点击触发约 1.8 秒的局部摇头和星星；保留 R3F 射线检测、左键与拖拽过滤。极短重复事件过滤为 80ms，普通开心反馈仍保持 700ms 节流；晕圈 2.2 秒内不重复触发，关闭/暂停/休眠清理特效与点击序列。
- 减少动画时不摇头、不上浮，仅显示静态淡出星星。音效复用共享 AudioContext，昼夜/晕圈峰值增益 0.012，遵守全局静音和无音频 API 的降级。首次加载不发声；自动切换不创建或恢复音频上下文。

## 验证与时间固定

原 Playwright 配置仅为 webServer 子进程设置 `VITE_SPARKMATE_ENVIRONMENT=regression`：本地小时固定为 12，并关闭新增闲置计时；原 65 项测试与断言保持不变。这是展示层的明确测试入口，不改变任何业务校验。正常开发和生产构建不设置该参数，完整启用真实时间与闲置行为。

新功能在没有该参数的独立开发服务上验证：

```powershell
npm run dev -- --port 5232 --strictPort
# 另一个终端
$env:SPARKMATE_ENVIRONMENT_URL='http://127.0.0.1:5232'
node scripts/check-environment.mjs
node --test tests/environment.unit.mjs
```

独立浏览器补验使用 Playwright Clock 控制时间，实际检查 19:00 边界、半闭眼和灯光、沙盒 LED 保持、手动覆盖与恢复自动、60 秒闲置及鼠标/触摸唤醒、硬件/手动休眠优先、三次真实头部射线点击、静音/无音频/减少动画、短屏关闭及无学习/存档写入。报告与截图放在忽略提交的 `test-results/`；没有使用生产测试 API。

旧 3D 几何补验若需要白天基准，可在独立开发服务启动前给当前终端设置 `$env:VITE_SPARKMATE_ENVIRONMENT='regression'`，验证后移除该变量。不要把此参数写入生产环境文件。
