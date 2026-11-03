# Phase 3：独立只读 3D 展台

入口：本地运行 npm run dev 后访问 /lab/deskpet3d/。单独 HTML 页面及 React root，不导入原 App、Zustand store、音效或任何学习业务模块；主流程也不导入这个展台。没有默认导航入口。Vite 多页面构建输出 lab/deskpet3d/index.html，Vercel 部署配置已恢复原样，不新增重写；当前 demo 入口只在本地开发/预览验证，线上路径待单独确认。

## 固定版本

- React / React DOM：沿用现有 18.3.1，不升级。
- @react-three/fiber：8.18.0（peer React >=18 <19）。
- @react-three/drei：9.122.0（peer React ^18、Fiber ^8）。
- three：0.170.0。

安装使用 --save-exact，未使用 --force 或 --legacy-peer-deps。npm 安装成功，没有 peer 依赖冲突，audit 为 0 vulnerabilities。安装时出现传递依赖 three-mesh-bvh@0.7.8 的弃用提示；本展台不使用 BVH 或网格拾取相关功能。

## 这一刀的范围

使用 box、sphere、cylinder、torus 拼出头、屏幕、眼睛、身体、脚、天线与展台底座。灯光为 ambient 与 directional，无图片、远程模型、HDR 或 API Key。Canvas 使用 demand 渲染；没有 useFrame、自动旋转、桌宠动作动画或状态绑定。

OrbitControls 仅旋转/缩放观察相机，禁用平移，距离限制为 4.8–11，限制极角避免看到底座下方。「重置视角」只还原本页相机。WebGL 无法初始化时显示本页降级说明和返回入口。

## 验收方式

- npm run build，检查主页面与独立 demo 均输出。
- 原有 npx playwright test 保持 64 项，不修改既有断言。
- 单独访问 demo，观察完整模型，拖拽旋转、滚轮缩放至两个边界，再重置视角。
- 主流程应没有 canvas 和 3D 页面代码请求；访问 demo 不应读写学习 localStorage。
- git diff --name-only -- src/ 应为空：现有 src 文件均未修改，仅新增 features/deskpet3d/。
- 这是静态几何展台，不是 3D 动作绑定或 2D 桌宠替换。验收后停下，不自动提交或推送。

参考：[Fiber React 版本对应](https://r3f.docs.pmnd.rs/getting-started/installation)、[Drei Controls](https://drei.docs.pmnd.rs/controls/introduction)。

## Windows 构建环境

本机系统 TEMP 出现 esbuild 临时文件清理 Access is denied。默认 npm run build 保持原生 vite build，不使用包装。仅显式 npm run build:local 由 scripts/build.mjs 转交给 Vite build；仅 Windows 子进程把 TEMP/TMP 指向被忽略的 node_modules/.cache/sparkmate-build-tmp，参数原样传递。Linux/Vercel 不改环境。没有修改业务入口、系统环境或权限。
