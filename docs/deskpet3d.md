# Phase 3：主线 3D 伙伴与独立实验

## 主界面

原 App 中的常驻 `Companion` 挂载点保持不变，组件内部默认渲染 `DeskPet3DStage`。它通过现有 `useLearningStore(state => state.runtime)` 读取真实沙盒结果，再以 props 传给纯展示的 3D 组件。没有替换业务运行器，原 `CodeRunner` 的解析、通关、音效、复位和保存行为保持原样；代码工坊内原有教学预览也保留。

3D 不导入学习 store、demo store 或运行器，不调用 action、音效或持久化函数。主应用不加载 `DemoCodeRunner`、`useDemoRuntime`、demo 页面或全局展台样式。默认主页面右下角是实际 Canvas 与几何模型，保留悬停消息、键盘收起/展开、庆祝反馈、弹窗隐藏和原 z-index 层级。

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
