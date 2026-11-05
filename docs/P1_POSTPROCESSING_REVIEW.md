# SparkMate v0.9.4-beta P1 审核报告

日期：2026-11-05。主场 `D:\deepseek_file\ai_deskpet`。实现叠加在已验收、尚未提交的 P0 工作区上；HEAD 仍为 `0e46b4929f792bb6aa3f9de73519962d5318eb7e`。本报告记录 P1 审核时的工作区，审核时的包版本为 0.9.3-beta。

## 最终效果与结构

- `StageEffects.jsx` 仅在 Tier >= 2 挂载。Tier 2 为 Bloom → ACES Filmic ToneMapping → Vignette → FXAA，Tier 3 再追加 DepthOfField。Bloom、暗角、景深使用任务指定参数；关闭默认 MSAA 和 normal pass，不引入 SSAO、SMAA、N8AO 等效果。
- Stage Canvas 在高档使用 flat，HDR 颜色仅由后期 ACES 处理；降回 Tier 1 卸载 composer 并恢复基础 ACES，避免双重或遗漏 ToneMapping。
- 为避免 Drei View 的原始绘制覆盖后期输出，改为固定 Stage 外壳 + 跟随 Hero DOM 边界的 Canvas 窗口。Canvas 在导航时始终保持同一节点，隐藏时保留最后尺寸并暂停。后期缓冲区仅覆盖 Hero 艺术区，沿用 DPR 上限 1 / 1.25 / 1.5，不额外扩大到整个浏览器视口。
- `StageAtmosphere.jsx` 使用原 Aurora 的 3 octave fbm / domain warp 逻辑，迁移为场景里的全屏 ShaderMaterial 平面，写入 HDR 管线；没有独立 Aurora WebGL context。
- 同一场景中使用单组 Points、12 个顶点，漂移由顶点 shader 与 time uniform 在 GPU 上计算，不逐帧更新 React state。HDR 粒子参与 Bloom 和景深。
- 外壳 MeshPhysicalMaterial clearcoat=1、roughness=0.18、clearcoatRoughness=0.12；高档 Stage 增加 emissiveIntensity=3.2 的底座光环。眼睛仍由真实 runtime 控制 LED 强度，原 2.2 / 0.15 断言未改。
- CameraRig 监听 HUD 上冒泡到 window 的 pointermove，最大偏移为 X ±0.12、Y ±0.07，按 delta 阻尼。减少动画、粗指针与暂停时不注册微视差输入；减少动画下极光、粒子和相机保持静态。
- Stage / 原常驻与聚焦伙伴仍最多两个 renderer/context；未新增 renderer。HUD 继续在 DOM 中，原按钮、导航和 View Transitions 代码未修改。

## 固定版本兼容处理

当前 `postprocessing@6.39.6` 将 DoF 的 focusDistance / focalLength 对应范围解释为世界单位。保留任务要求的 focusDistance=0.02、focalLength=0.055、bokehScale=2.2、resolutionScale=0.5，并添加 target=[0,0.75,0.61]，由现有 React 包装器对焦眼部，避免把焦点放在相机前 0.02 单位而让模型整体失焦。

`@react-three/postprocessing@2.19.1` 会移除替换的 pass，但没有完整销毁 composer 的生命周期。新增 ComposerResources：清理退休 pass 的 GPU 材质，保留仍被新 pass 共享的 effect；真正卸载后释放缓冲区、深度纹理和 composer。微任务延后清理并检查实例，兼容 StrictMode effect 重放。DPR 改变时使用 CSS 尺寸触发 composer 重新分配，由库自身应用 DPR，避免重复放大缓冲区。

## 验收

- 冻结实现后的 `npm run test:e2e`：**66 通过 / 0 失败 / 0 跳过**，约 1.7 分钟。原 65 项 + P0 Stage 冒烟测试保留，本轮未修改这些用例或断言。
- `npm run build:local`：成功，2717 modules，约 6.43 秒。
- 主入口 JS 457.24 kB（gzip 152.95），与 P0 相同；Stage JS 120.72 kB（gzip 31.90），相比 P0 增加 97.37 kB（gzip 增加 22.52）。共享 3D chunk 901.36 kB（gzip 248.97），原有 >500 kB 告警仍存在。
- 本轮无 npm install、无新包、无依赖升级。沿用 P0 固定的 React 18.3.1、Fiber 8.18.0、Drei 9.122.0、Three 0.170.0、react-postprocessing 2.19.1 / postprocessing 6.39.6。
- 正常环境独立端口 15262，无 regression 参数，`scripts/check-stage-postprocessing.mjs` **7/7 通过**：实际 effect 对象与 Tier 0/1 门控、12 个 GPU Points、NoToneMapping、真实 CodeRunner 点亮后的三档截图、减少动画静止、重复导航同 Canvas 和存档不变、真实 context loss、HUD 相机微动、极光动画、模态暂停，以及 4 轮 Tier 2/3 切换的资源稳定抽样与 Tier 1 调色恢复。
- Bloom 同场景对照：只将实际 BloomEffect.intensity 从 0.9 临时设为 0 后截图；RGB 平均绝对像素差约 **6.868**，证明最终输出包含可见泛光。该开关仅存在于独立检查脚本，不写入应用业务状态。
- 主学习 Store、真实 CodeRunner、共享串口和硬件 Store 无改动；无新增 localStorage 持久化。专项仅精确放行原液态玻璃依赖的 lighting-color / lightingColor 告警。

## 截图与复跑

当前聊天 visualizations/sparkmate-p1 保存 Tier 3、Tier 2、Tier 0 整屏截图、同尺寸艺术区截图、Tier 2 无 Bloom 对照图、专项 JSON 结果。截图通过真实 CodeRunner 执行 move("stop"); light("on"); 后返回首页，眼睛发光来自真实运行态，未奖励 XP。

所有项目命令显式 workdir 为唯一主场。独立端口先确认空闲：

```powershell
$env:SPARKMATE_TEST_PORT='15261'
npm run test:e2e
npm run build:local
# 另起无 regression 的正常开发服务后：
$env:SPARKMATE_STAGE_URL='http://127.0.0.1:15262'
node scripts/check-stage-postprocessing.mjs
```

P0 历史架构与截图记录保留；当前 Stage 裁切与后期架构以本报告为准。资源数据属于短时浏览器抽样，不代表真实手机、所有 GPU、长时温度或无泄漏保证；本轮也未接入 GLTF 模型或实体设备验收。
