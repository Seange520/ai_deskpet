# Phase 3：独立 3D 指令实验

入口：本地开发或生产预览的 `/lab/deskpet3d/`。独立 HTML 页面及 React root，主应用仍使用原来的 2D 伙伴，不导入 3D 模块。Vite 保留多 HTML 入口，Vercel 保留原 SPA rewrite；没有新增线上入口，线上独立路径仍待单独确认。

## 固定版本

沿用 React / React DOM 18.3.1、@react-three/fiber 8.18.0、@react-three/drei 9.122.0、three 0.170.0。没有安装或升级依赖。

## 指令来源与只读边界

原 `CodeRunner` 内部直接调用学习 store，无法在不改业务源码的情况下传入拦截回调；该 store 导入时还会执行初始化保存。因此 demo 不再加载原 `CodeRunner` 或 `useLearningStore`，改用专用 `DemoCodeRunner` 和仅在内存中的 `useDemoRuntime`。

专用运行器复用原 `executeProgram` 白名单解析与执行逻辑，将 move/light/play 的回调限定为更新临时运行态或空操作。它不包含 XP、关卡、路线、持久化、通关 action 或音效调用。没有修改解析器或业务 store，也没有覆盖全局 Zustand action、修改 Storage API 或事后恢复存档。

`DeskPet3DStage` 只读订阅 `useDemoRuntime((state) => state.runtime)`，读取 action、led、status、runId 和 instructions 驱动动画。临时运行态只在本页有效，刷新复位，不与主应用或其他标签页同步。

隔离验收命令：先 `npm run dev -- --port 5220 --strictPort`，再运行 `node scripts/check-deskpet3d.mjs`（可用 SPARKMATE_DEMO_URL 指定本地主场服务）。补验独立于原 64 项 Playwright 用例，覆盖新用户、已有进度和旧版迁移存档：加载、符合通关条件的运行、重复运行、错误、复位和刷新全过程 localStorage 字节不变，存储读写调用均为 0，并检查主应用内存中的 XP 和关卡未变，以及实际 3D 位移与眼睛亮度。

## 动画与清理

- 成功运行后按最终 `runtime.action` 展示：前进/后退沿 Z 轴平滑偏移，并轻微上下浮动；底座保持固定。
- `runtime.led` 为真时，双眼 emissiveIntensity 从 0.15 平滑升至 2.2；关灯恢复 0.15。
- `move("stop")` 平滑回到原位；恢复示例与状态、清空运行态或运行失败时，3D 平滑回到原位和默认亮度。解析失败时不执行整段指令，3D 以 status 判断本地归位。
- 指令由原白名单执行器和临时回调同步执行，3D 展示最终状态，不另行逐条重放。`play` 只记录接收日志，不新增 3D 音效或可选旋转动画。
- 以 `runId` 去重记录 `[3D DeskPet] Received command: move` 等日志（附参数）；每次成功执行的每条指令各一条。相机变化、渲染或同次运行的其他 store 更新不会重复打印；复位后允许新的 runId 从头计数。
- 动画使用 `useFrame` 与 delta 阻尼，不在帧循环里更新 React 或业务状态。保留 demand 渲染，仅动画或过渡期间请求下一帧，静止后休眠。
- 减少动画模式使用静态位移与亮度反馈，无持续浮动。

OrbitControls 保留旋转、缩放和重置视角，禁用平移，距离限制 4.8–11。重置视角只重置相机；模型复位使用 demo 的“恢复示例与状态”。保留 WebGL 降级，无远程模型、HDR、图片或 API Key。

参考：[Fiber useFrame / invalidate](https://r3f.docs.pmnd.rs/api/hooks)。

## 验收

- `npm run build:local`：本机 Windows 构建。
- `$env:SPARKMATE_TEST_PORT='5219'; npx playwright test`：原有 64 项 E2E，原断言和配置不变。
- 额外检查本页的前进/后退、亮灯/关灯、停止、错误、复位、刷新、日志去重、减少动画与移动端布局；检查真实模型位置与材质亮度。
- 检查主页面无 Canvas、不请求 3D 模块。

## Windows 构建环境

本机系统 TEMP 存在 esbuild 临时文件清理 Access is denied 的已知问题。默认 `npm run build` 保持原生 `vite build`；仅显式 `npm run build:local` 使用既有 `scripts/build.mjs`，在 Windows 构建子进程中把 TEMP/TMP 指向被忽略的 `node_modules/.cache/sparkmate-build-tmp`。不修改系统环境或权限，不改变线上构建。未验证 Linux/Vercel 等价构建。
