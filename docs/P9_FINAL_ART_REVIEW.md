# P9 最终资产精修（待视觉验收）

日期：2026-11-08。保留此前所有工作，本轮未暂存、未提交、未推送。

## 原创 Blender 资产

实际通过本机 Blender MCP 的 execute_blender_code 执行 scripts/blender-refine.py，生成到 public/assets/skins/。MCP 返回记录归档于最终截图目录的 blender-result.json。

- companion_refined.glb：23 个部件；圆润陶瓷盔甲、深色玻璃屏幕、发光眼睛/微笑、橙色天线与肩甲、金属腿部连接件、深色靴底、背包散热片。
- temple_refined.glb：73 个部件；四根凹槽石柱、青铜雕花与柱头、真实体积的破损三角山墙、阶梯基座、符文祭坛和悬浮核心。替换四岛原有书本/芯片/数据柱/尖塔灰盒视觉；移除过细的宏观直杆。
- crystal_refined.glb：五根具有不同高度/倾斜角的六棱伴生晶体；以 InstancedMesh 复用到原水晶布局及装饰布局。MeshPhysicalMaterial transmission=.72、IOR=1.46、thickness=.38、roughness=.12；发光强度 .28，避免原先的强亮“钉子”轮廓。
- sand_micro_normal.png：原创无缝 2048² 多尺度沙砾微法线，接入地面、石碑和神殿。石碑主体采用 PBR 微表面，保留原独立发光符文；新增柔和冷色补光，让正面颗粒细节可见。

原发光草叶收细到 .035m、缩短到原高度的 .42，尖端亮度下降，保留随风运动和崖缘藤蔓。原 Bloom/GTAO、极光、云海、光轨、星空与传送重组继续保留。

## 接触阴影与物理隔离

PlayerContactShadow 通过真实地形向下射线取得接触点和世界法线，用柔边径向贴花贴合水平地面或斜坡；跳跃时淡出，第一人称和传送时隐藏。机器人靴底模型最低点为角色原点下方约 .661m，对应原落地中心约 .673m，靴底接近原地面 .008m。

本轮之前保存的 Exploration.jsx 与最终文件逐字比对，仅新增 PlayerContactShadow 的导入和挂载。KCC、胶囊体、键鼠/触屏、跳跃、相机和传送控制未改动。原 ASSET_LAYOUT 和原 GLB 包围盒 Collider 生成段保持一致；新水晶只替换绘制几何，碰撞继续使用旧模型边界。结果见 physical-invariants.json。

## 实测

- 原 E2E：67/67（本轮 1.8 分钟）。
- M1 物理探索：8/8，含 45° 斜坡、.5m 台阶、跳跃、视角切换、触摸与返回教学。
- 最终实机视觉脚本：3/3，包含 FPS 石碑、传送和 TPS 神殿/机器人；页面错误及着色器错误为零。
- npm run build:local：通过，2868 模块。
- 全部截图使用 1920×1200、Tier 3、真实键鼠与实际页面；未离线重建或合成。全景选择数据岛，避免枢纽训练坡道遮挡神殿。

证据目录：C:\Users\Senage\.codex\visualizations\2026\11\07\01a1b693-ded6-7e71-9e57-3be30f4fe3f6\sparkmate-final

最终审核图片：final-fps-tablet.png、final-tps-panorama.png。
运行入口：http://127.0.0.1:15262/?quality=3&world=p9，点击「开始自由探索」。请测试并审核最终视觉；按用户指令不提交。
