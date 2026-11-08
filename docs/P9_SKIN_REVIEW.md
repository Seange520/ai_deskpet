# P9 视觉换装审核记录（未提交）

日期：2026-11-08。主仓库：D:\deepseek_file\ai_deskpet。保留既有 M3 工作；HEAD 仍为 M2 封板 e507effc08cb153392c7a1429e7b8eb19756a3cd。未暂存、未提交、未推送。

## 视觉资产与管线

通过本机 Blender MCP 的 execute_blender_code 实际执行 scripts/blender-skin.py，在独立、无用户文件的 Blender 4.5.10 LTS 实例中生成资产。未下载第三方模型或纹理。岩石/金属贴图是原创程序纹理，并非照片扫描。

- island_skin.glb：Blender 源网格共 9,600 顶点，192 段岛面、分层断裂岩壁、金属环。HUB 和四岛共用几何，分别适配原有 3.98m / 4.78m 半径。
- companion_skin.glb：Blender 源网格共 3,770 顶点，六段倒角、加权法线、陶瓷 clearcoat、金属靴、发光核心与屏幕眼睛。
- 1024² 岩石颜色/法线/粗糙度和拉丝金属纹理；512×256 原创屏幕贴图。
- 29 石碑、320 水晶簇、208 岩石簇，以 InstancedMesh 批量绘制；额外密集实例独立于原始物理布局。
- 1,613 个随风发光草叶/崖缘藤蔓实例，仅影响视觉，支持暂停和减少动态效果。

岛面采用 PBR 岩石，岩壁/遗迹保留 Toon 冷暖色阶与描边；建筑桥面补充岩石/金属材质。保持原有可行走平面 Y=.008m，视觉地形细节集中于纹理、岩壁和崖缘，岛面只有约 2mm 视觉起伏。

最高画质为 P9 单独的唯一 composer：GTAO 24 样本、2m 半径、0.95 混合、最长边最高 2048；全局 Bloom 强度 2.8、mipmap 半径 .85；Toon 描边、ACES、FXAA。新增 RoomEnvironment PMREM 陶瓷反射、2048² 软阴影、四向 24 步 raymarch 体积云，保留深渊星空、极光、光轨与光带。P9 星空启用前景深度遮挡。原教学渲染默认值保持独立。

## 物理边界

仅替换角色模型的子网格，Ecctrl/KCC 胶囊体和 TerrainColliders 未变。原石碑/水晶/岩石的 ASSET_LAYOUT、GLB 原文件、模型包围盒计算及 Collider 生成保持不变。为遗迹补充 UV 只影响着色，不移动顶点或修改法线/边界。

本轮开始时与已接受 M3 快照做过 7 项分段原文比对，全部一致；另保存基于 M2 HEAD 的物理参数和原始 GLB 校验。45° 斜坡、0.5m autostep、重力、固定 1/60s、2.5/4.2m/s 和 5m/s 跳跃初速保持原值。

传送仍由原 M3 的蓄力→冲刺→落位控制，复用 960 粒子与同一相机。未修改 teleportRig.js。

## 小地图

Canvas2D 绘制原创岩石纹理、岛体明暗/投影、金属环、建筑与水晶缩略图；SVG 仅叠加实时玩家箭头。坐标与朝向仍使用原 M3 数据流。没有新增 WebGL renderer。大地图保留键盘可访问锚点与原教学导航。

Tier 0 沿用 SVG 小地图且零 Canvas；Tier 1/2 保留原教学导航与不加载物理/GLB 的边界。新版专项将 Canvas 总数断言改为 data-engine WebGL 数量，仍只允许原 Stage 与 EcctrlJoystick 两个 renderer；独立检查新增 Canvas2D 存在。

## 验证

- 原 E2E：67/67，独立端口 15261，2.6 分钟。
- M1 物理探索：8/8；实测坡面 Y=2.20m、0.5m 台阶 Y=3.165m 且 grounded=true，键鼠/触摸、跳跃、视角、Esc 和异常回退均通过。
- M2 资产专项：5/5；原石碑碰撞仍在 Z≈2.085m 阻止前进，Tier 1 不请求物理/GLB。
- M3 地图传送：6/6，包含 TPS/FPS 保留、相机复用、重复目的地、原存档和降级。
- 最终视觉实机专项：3/3，1920×1200，pageerror 与着色器错误均为零。
- 质量/原飞行/三段传送单测：8/8。
- Windows 生产构建使用 npm run build:local（项目既有临时目录兼容入口）。系统 TEMP 的原始 npm run build 曾遇到 esbuild 清理权限错误，兼容入口构建正常。

## 审核截图

截图均来自实际运行页面及真实键鼠操作，无替换画布、离线重建或后期合成。TPS 在学习岛原地落地后侧移并拖动相机；FPS 用 V 和鼠标观察原 HUB 石碑；飞行从 M 地图选择学习岛截取 dash 中间帧。

证据目录：
C:\Users\Senage\.codex\visualizations\2026\11\07\01a1b693-ded6-7e71-9e57-3be30f4fe3f6\sparkmate-p9-skin

文件：skin-tps-panorama.png、skin-fps-tablet.png、skin-flight-mid.png、skin-checks.json，以及归档的 M1/M2/M3 回归结果。入口 http://127.0.0.1:15262/?quality=3&world=p9，点击「开始自由探索」。

请在本机测试移动、跳跃、V、M 和 Esc 并审核视觉。本轮按用户要求保持未提交。
