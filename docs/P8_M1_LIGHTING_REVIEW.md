# P8-M1 光影与立体感调优（v0.9.5-alpha 封板）

本轮在 M0 POC 上局部迭代，开发起点为 `b05b80d83c557ded3748c69a45c6f32743a93c59`。总指挥已确认 M0/M1 视觉达标，并授权将全部改动提交、打标签 `v0.9.5-alpha` 及推送。README、npm 清单与锁文件根版本统一为 `0.9.5-alpha`；无依赖升级或外部资产引入。最新完整 commit hash 见仓库外《Codex 交接提示词 12.0》。

## 当前表现

- ToonPalette 使用三/四阶 RGB 线性色阶：冷靛阴影、灰蓝中间色、暖象牙白受光区。针对 Three 0.170 默认只读取 gradientMap.r 的实现，在各材质的 onBeforeCompile 中使用 RGB irradiance。所有材质仍为 MeshToonMaterial，并保留最近邻采样。
- EnvironmentLighting 保留独立昼夜、休眠与岛屿氛围逻辑。补足环境光与弱补光，保留有方向的主光。在材质直射光计算中增加受光方向约束的 Rim Light；桌宠外壳、身体和脚部增加小面积、克制的 Blinn 高光，不恢复清漆、金属或全场景 SSR。
- 桌宠外层表现根有约 9° 的静态侧转，显露头部厚度。命令根、头部命中、眼睛材质名和原动画根不变。DepthInk 按视空间深度连续改变线宽与浓度：近处更重，远处更细更淡，不改机位或航行状态机。
- Observatory 顶面增加轻微径向渐变、方向性色偏、内环与十字纹路，以及低强度表面高光；侧壁用垂直颜色分层和双层光环表现厚度。纹路为解析 shader，不额外加载纹理或建立反射 RT。
- 原直立发光杆改为半透明水晶外壳、有色内核和小伴生碎片：共三组 InstancedMesh，28 簇（Tier 1 为 12 簇）。位置、尺度、姿态不再等距等高，每个实例有独立的浮动相位与轻微旋转；透明外壳关闭 depthWrite，保持低成本透明方案。
- Bloom 强度从 0.65 降到 0.38，过渡区放宽，内核使用青绿/淡紫有色辐射替代旧白色灯泡。真实 LED 仍由 CodeRunner 控制，亮灭强度 2.2/0.15 原断言保持。
- 天空停止写深度；星空在天空之后、实体之前绘制，使用固定种子和稳定像素尺寸。远山加入分面方向光和距离雾色，远处线条更弱。云、极光、世界坐标、LOD 与导航结构沿用 M0。

## 验收证据

- E2E 67/67，原测试未修改。
- 既有画质/飞行单测 7/7。
- 原 NPR 专项 9/9，包含实际描边与真实 LED 泛光像素消融、四岛导航、镜头正常飞行与连续改向、切档、真实 WebGL 丢失和零 Canvas DOM。
- M1 补验 4/4：读取实际编译的 RGB 采样、高光与底盘程序；检查透明水晶与最多两个 Canvas；验证水晶各实例浮动而非整圈刚性移动；模态暂停/恢复、减少动态效果冻结；天空深度与真实 HUB 入口。浏览器错误 0。
- 生产构建成功，原 500 kB 分包提示仍在。

所有项目命令的工作目录为 `D:\deepseek_file\ai_deskpet`。

```powershell
$env:SPARKMATE_TEST_PORT='15261'
npm run test:e2e
node --test --test-isolation=none tests/m2-quality.unit.mjs tests/quality-tier.unit.mjs tests/travel-timeline.unit.mjs
npm run build:local
# 独立正常 Vite，端口先检查空闲
npm run dev -- --port 15262 --strictPort
# 在另一终端执行
$env:SPARKMATE_SPACE_URL='http://127.0.0.1:15262'
node scripts/check-toon-poc.mjs
node scripts/check-toon-m1.mjs
$env:SPARKMATE_CAPTURE_PHASE='m1'
node scripts/capture-toon-m1.mjs
```

## 截图审核

产物位于 `C:\Users\Senage\.codex\visualizations\2026\11\07\01a1b568-23d3-7450-9b50-f707be65c0fd\sparkmate-p8-m1`：

- `comparison-m0-m1-world.png`：本轮重点，左 M0，右 M1，真实 HUB 全景。
- `comparison-m0-m1-pet.png`：同机位桌宠与底盘近景补充。
- `m1-world.png`、`m1-world-ui.png`：当前完整全景及含 DOM 热点的界面。
- `m0-capture.json`、`m1-capture.json`：实测相机与采样条件。
- `comparison-metadata.json`：截图来源、相机姿态、SHA256 和拼接说明。
- `m1-checks.json`、`regression/toon-poc-results.json`：本轮专项结果。

M0 图片在改码前拍摄，双方均为 1728×1080、DPR 1、Tier 3、day 环境、减少动画；全景相机位置 `[23,21,29]`、FOV 56°，四元数一致。以 UI 的「返回大世界」进入 HUB 并核对 idle 相态，未手动摆相机。纯场景截图只在取证时隐藏 DOM，产品教学界面保留。对比图只在顶部添加标题和横向拼接，不缩放原截图像素、不调色。

## 限制

半透明实例按批次排序，尚非物理折射或逐实例透明排序。底盘纹路与陶瓷高光为风格化着色，并非实时水面反射；本轮按用户要求选择轻渐变和光纹路线。DepthInk 对透明标签附近仍可能有轮廓叠加。星空是固定种子新表现，M0 使用旧随机星点，因此星点逐个位置不作为像素差异指标。未进行实体移动设备帧率、长时显存；总指挥已完成本轮视觉验收。教学存档、XP、运行器、USB/虚拟桥接业务链未修改。
