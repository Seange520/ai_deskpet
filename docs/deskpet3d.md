# Phase 3：主线 3D 伙伴与独立实验

> 以下保留早期 Phase 3 记录。v0.9.4-beta 的当前 Stage/HUD、画质门控与后期处理架构见 [P0 审核报告](P0_STAGE_HUD_REVIEW.md) 和 [P1 审核报告](P1_POSTPROCESSING_REVIEW.md)。

## 主界面

原 App 中的常驻 `Companion` 挂载点保持不变，组件内部默认渲染 `DeskPet3DStage`。它通过现有 `useLearningStore(state => state.runtime)` 读取真实沙盒结果，再以 props 传给纯展示的 3D 组件。没有替换业务运行器，原 `CodeRunner` 的解析、通关、音效、复位和保存行为保持原样；代码工坊内原有教学预览也保留。

3D 不导入学习 store、demo store 或运行器，不调用学习 action 或持久化函数。摸头音效由 Companion 传入回调，仅从用户交互调用共享音效模块，并只读全局静音设置。主应用不加载 `DemoCodeRunner`、`useDemoRuntime`、demo 页面或全局展台样式。默认主页面右下角是实际 Canvas 与几何模型，保留悬停消息、键盘收起/展开、庆祝反馈、弹窗隐藏和原 z-index 层级。

原 2D `Companion` 完整保存在 `src/components/Companion2D.jsx`，原 CSS 与其他 2D 教学资源未删除。3D chunk 加载期间临时使用原 2D，WebGL 初始化失败或上下文丢失后也回退到原 2D，继续读取同一真实运行态。

## 展示行为

- 成功执行后按最终 action 前进/后退，沿 Z 轴平滑偏移并轻微浮动，底座固定。
- 双眼发光强度随 LED 从 0.15 平滑变为 2.2；停止、复位或错误时平滑归位。
- 按 runId 去重打印 `[3D DeskPet] Received command: ...`，不因重新渲染、导航或材质更新重复执行指令或音效。
- 减少动画模式采用静态位移与亮度反馈；收起模式停止持续浮动。
- 常驻视图只展示模型，不拦截触屏滚动或提供 OrbitControls；原收起/展开按钮保留键盘语义。

## 性能与生命周期

通过 React.lazy 独立加载 3D chunk，避免阻塞原页面交互。常驻伙伴在页面状态切换之外，导航复用同一 Canvas；小型 Canvas 固定 DPR 1，关闭抗锯齿和空间后处理，使用基础材质与几何，无外部模型或纹理。

保留 demand 渲染，静止后休眠。弹窗隐藏、页面进入后台或烧板 Portal 设置 app-shell inert 时暂停 Canvas，恢复后按最新运行态显示。visibility 事件、MutationObserver 和 WebGL context 监听均随组件卸载清理；几何与 renderer 的释放交由现有 Fiber 生命周期处理。

运行 `node scripts/check-main-deskpet3d.mjs` 可检查真实指令与 L1 解锁、动画期间无额外保存、反复导航后 Canvas/几何数量稳定、弹窗/烧板暂停恢复、WebGL 丢失和缺失时的原 2D 降级，以及主界面截图。默认开发服务是 `http://127.0.0.1:5232`，可设置 SPARKMATE_MAIN_URL。它是单独补验脚本，不改变原 64 项用例数量。帧间隔只是本机无头 Chrome 样本，不代表全部设备，也不构成长期内存无泄漏的保证。

## 沉浸模式与摸头反馈

- `PetFocusView.jsx` 使用稳定的 DOM portal 容器，在常驻槽位与 body 下的全屏模态框之间移动同一个 Canvas，不创建第二个 renderer。打开后支持 OrbitControls 旋转和缩放；关闭恢复原视角，保留实时 runtime 和原收起状态。
- 模态框设置背景 app-shell inert、锁定滚动，约束 Tab 焦点，支持 Esc 和关闭按钮；退出或 WebGL 降级时清理并恢复焦点、inert 和滚动状态。自身的 inert 不暂停正在互动的展台；原业务弹窗、烧板遮罩和页面后台暂停保持生效。
- `PetModel.jsx` 在头部 group 绑定 `onClick`，R3F 对其子 mesh 自动执行射线命中检测。仅接收主键，过滤移动超过 5px 的拖拽，避免旋转时误触。键盘「摸摸头」调用相同展示入口。
- 摸头事件局限于 Stage 的 React state，700ms 节流；不写 useLearningStore、usePetActions 或 localStorage。暗光或休眠时忽略摸头，原休眠优先级不变。
- `usePetAnimation.js` 增加约 1.1 秒的轻微起伏与点头，用 ref 和 useFrame 阻尼归位。`PetAffection.jsx` 在头部局部坐标 `[0, 1.95, 0]` 放置 Drei Html，以相机投影自动对齐头部移动、旋转和视口缩放，再由 Framer Motion 播放三枚 DOM 爱心/星星的上浮淡出。
- 特效不接收指针事件，1.3 秒后移除；关闭、后台暂停、进入休眠或组件卸载时清理。保持 demand 渲染；聚焦时小屏或低性能设备 DPR 固定为 1，其他设备上限 1.5，常驻恢复 DPR 1；减少动画时不点头、不上浮，仅静态淡入淡出。音效复用共享成功提示，遵守静音和无 AudioContext 的降级。

补验在已有独立开发服务上运行，URL 按实际空闲端口填写：

```powershell
$env:SPARKMATE_FOCUS_URL='http://127.0.0.1:5232'
node scripts/check-pet-focus.mjs
```

脚本通过实际头部屏幕投影坐标发送鼠标点击，检查旋转/缩放、拖拽过滤、同一 Canvas、焦点恢复、后台暂停、减少动画、静音、暗光优先、存档无写入以及聚焦中 WebGL 丢失回退；截图与报告输出到忽略提交的 `test-results/`。它独立于原 65 项 E2E，不调整原测试断言。

## 昼夜与情绪

`Companion` 将独立环境状态作为 props 传入 Stage。`EnvironmentLighting.jsx` 用自己的灯光引用做阻尼过渡，不重置沙盒指令、动作事件或模型实例；夜间的半闭眼和轻微低头只影响局部表情。闲置睡眠与原硬件/手动睡眠取并集，活动唤醒只清除闲置原因。连续摸头的晕圈由局部 `usePetAffection` 和头部 Y 轴动画实现，不改沙盒或学习存档。详见 [昼夜与情绪设计](environment.md)。

## 构建与开发实验入口

`vite.config.js` 恢复单 SPA HTML 入口，不再输出 `dist/lab/deskpet3d/index.html`。主界面不依赖独立路由，Vercel 原 SPA rewrite 未改，不要求线上独立实验路径可访问。

原 `lab/deskpet3d/index.html` 与隔离实验代码继续保留，仅供 Vite dev 环境的 `/lab/deskpet3d/` 使用。`DeskPet3DDemo` 单独组装展示、`DemoCodeRunner` 和仅在内存中的 `useDemoRuntime`，依旧不加载真实业务 store。其旧隔离验收可用 `SPARKMATE_DEMO_URL=http://127.0.0.1:5232 node scripts/check-deskpet3d.mjs`（PowerShell 请用 `$env:SPARKMATE_DEMO_URL=...`）检查，不要求生产提供此入口。

## 验收与边界

- `npm run build:local`：Windows 本机构建，标准 `npm run build` 不变。
- `$env:SPARKMATE_TEST_PORT='5231'; npx playwright test`：原 64 项 E2E；只将 code-runner.spec.js 中的常驻 2D 选择器换为 3D Canvas / data-testid，并增加真实 mesh 位移和材质断言，原业务断言不减。
- 原 Zustand 数据结构、路线数据、解析器、关卡、Debug、XP、迁移和音效实现未修改。
- React / React DOM 18.3.1、Fiber 8.18.0、Drei 9.122.0、three 0.170.0 版本未变，没有安装依赖。
- 本机 TEMP 权限问题继续使用既有 build:local 包装，仅设置构建子进程临时目录，不修改系统环境或线上构建。未验证 Linux/Vercel 等价构建。

参考：[Fiber useFrame / invalidate](https://r3f.docs.pmnd.rs/api/hooks)。
