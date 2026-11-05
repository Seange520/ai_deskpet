# SparkMate v0.9.3-beta · 幻影星穹 (Phantom Nebula)

- 发布日期：2026-11-05
- 发布类型：测试版（Beta）
- Git 标签：`v0.9.3-beta`
- 上一版本：`v0.9.2-beta`，代码基线 `dd2f77fd919fa51f1162ccda90eaff0f143eb7ea`。
- 项目包版本与锁文件根版本同步为 0.9.3-beta；依赖和既有历史标签保持不变。

## 幻化维度：Aurora Field 星云背景

- 自研 WebGL2 单 Canvas、单 pass 片元着色器，使用 GLSL 300 es、3 octave fbm 与 domain warp，色彩采用暖杏、柔粉和暮紫。
- DPR 上限 1.5、45fps 绘制节流；IntersectionObserver、visibilitychange 与业务弹窗门控负责暂停／恢复。
- 宽屏精细指针桌面启用动态星云，保留原 12 颗 Canvas2D 微光粒子。
- 小于 768px、粗指针、无悬停能力、已报告低 CPU／低内存或省流量设备使用 CSS 渐变与纹理，不创建新增装饰 Canvas。
- 经用户确认，桌面减少动画时仅绘制静态极光帧，不运行持续绘制循环。尺寸变化时可重绘静态帧。
- WebGL2 不可用、着色器编译失败或上下文丢失时回退 CSS；卸载清理资源，仅在 Canvas 真正离开 DOM 后释放自己的 WebGL 上下文，兼容 React StrictMode。

## 镜头语言：View Transitions 空间跃迁

- 使用 document.startViewTransition 与 flushSync 包装原页面状态导航，保留单 SPA、URL、按钮语义和原学习逻辑。
- 首页／详情共享 camera-art 画面；在一次导航中动态分配名称，防止同页重名导致浏览器跳过快照。
- 通过前进／返回方向、点击位置、模糊缩放与圆形揭示形成镜头效果；导航栏、弹窗和常驻桌宠不参与页面快照。
- 不支持或拒绝 API 时使用 300ms CSS 淡入；减少动画时使用 150ms CSS 透明度切换，不启用原生快照，避免即时拖线和坐标命中受冻结影响。
- 快速连续导航保留最新目标，并清理旧转场与临时共享名称。

## 物理质感：CSS 玻璃扫光

- 原三张关卡卡片增加独立玻璃材质层，使用 blur(18px) saturate(1.2)，不拍平原卡片景深。
- ::after 实现单次 900ms 斜向伪折射扫光；减少动画、移动端与粗指针禁用，低端设备停用新增昂贵材质。

## 工程底线与验收

- 零新增第三方依赖：无 GSAP、无新 WebGL 库；主学习 Store、localStorage 规则、串口解码及原 2D 核心不改。
- 原 65 项 E2E 的用例、选择器与断言均未改；固化前再次运行 `npm run test:e2e`，要求 65 通过 / 0 失败 / 0 跳过。
- 固化前执行 `npm run build:local`。保留既有 858.07 kB 3D 分包提示，未新增超过 500 kB 的 JS 分包。
- 正常环境独立端口 5262，无 regression 参数：11 组星云／镜头／扫光专项已通过；包含真实 WebGL2 像素变化、单 pass、45fps 节流、暂停恢复、静态帧、共享插图双快照、API 回退、快速导航及上下文失败回退。
- 低端能力与页面隐藏部分场景采用浏览器事件／能力模拟；抽样 45 次绘制／秒验证节流上限，不构成所有设备持续 60fps 或实体手机性能保证。

专项命令：先在独立空闲端口启动正常开发服务，再设置 SPARKMATE_AURORA_URL 并执行 `node scripts/check-aurora-camera.mjs`。截图与报告位于忽略提交的 test-results。
