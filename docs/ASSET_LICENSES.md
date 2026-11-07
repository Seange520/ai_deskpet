# P8-M2 环境资产记录

## P8-M3 新增资产（v0.9.6-beta 已验收）

Kernel 形态（圆角外壳、悬浮手臂、腿部与核心环）、残响议会接收器、循环残骸、记忆鱼群及流星均为 SparkMate 原创 React/Three 程序化资产。没有第三方下载、模型、贴图、字体或新依赖。粒子重组复用现有 PetDissolve 的表面采样与 shader，并保留 Toon 编译链。鱼群为合并球体/三角尾鳍的单个 InstancedMesh；流星为单平面解析 shader。世界观以用户授权的 DSH 报告为参考，公开文本不使用参考游戏的专有名词或资产。

本切片选择总指挥允许的「程序化 + Toon 材质生成」路线，无第三方模型、贴图、VRM 或下载资产，无新增依赖。未接入 GLTF 加载器；后续导入外部 GLB 时须逐资产补充原始下载页、作者、许可证原文和修改记录。

| 资产 | 来源/作者 | 使用与修改 | 几何/纹理 |
| --- | --- | --- | --- |
| 双层六瓣水晶花 | SparkMate 本轮原创程序化生成，ObservatoryEcology.jsx | 随项目源码管理；无第三方授权要求 | 每朵 168 三角形，实例化透明花瓣、不透明发光花心 |
| 垂丝叶藤 | 同上 | 同上 | 每株 146 三角形，实例化；共享顶点风摆 shader |
| 维护者残缺校验碑 | SparkMate 原创，MaintainerRelic.jsx | 同上 | 石座、残片、七道刻痕；无外部贴图 |
| 深渊环状光带 | SparkMate 原创，AbyssRibbons.jsx | 同项目源码管理，无第三方资产 | 三个平面与解析片元 shader，无贴图/RT |
| 巡检无人机 | SparkMate 原创，ToonDrones.jsx | 同上 | 合并机翼、机体、尾翼，8 个实例 |

植物在 Tier 2 每岛 16 簇、Tier 3 每岛 28 簇，Tier 1 整体剔除；只为当前详细 LOD 挂载。植物几何、纹理与材质的生命周期分别由组件与 R3F 管理。不将程序化资产称为已加载的外部高精 GLTF。

## P9 P0 灰盒（待视觉审核）

world/WorldScene.jsx 的书页、芯片、数据幕、尖塔、四岛底盘、桥面、环形道路、标柱、遗迹块与远景山脊均为本轮原创 React/Three 基础几何占位，复用原 ToonMaterial。无第三方资产、下载贴图、字体或新依赖；不作为正式高精环境资产。

## P9-M1 自由探索（待审核）

角色占位（胶囊身体、方形面屏、双脚）、45° 坡、平台与 0.5m 台阶为本轮原创 React/Three 基础几何，无外部模型或贴图。新增开源代码依赖 @react-three/rapier@1.5.0（MIT）、ecctrl@1.0.90（MIT，Erdong Chen），运行时物理 @dimforge/rapier3d-compat@0.14.0（Apache-2.0，Dimforge）。许可原文随 node_modules 对应包分发；lock 文件固定版本。摇杆视觉使用 ecctrl 官方组件，无下载游戏资产。

## P9-M2 原创 Blender 资产（待审核）

stone_tablet.glb、crystals.glb、rocks.glb 均由本轮原创 bpy 脚本生成，无下载第三方模型或贴图。石碑含破损轮廓、倒角和顶点微扰；水晶为五棱锥簇，岩石为低模二十面体扰动。首次通过本机 Blender MCP execute_blender_code 生成；MCP 第二次导出导致 Blender 异常退出后，最终干净资产由同一脚本在隔离后台 Blender 4.5.10 LTS 导出。详见 P9_M2_ASSETS_REVIEW.md。复用 P8 ToonPalette/IslandDeck/NightValley/EnergyRail/AbyssRibbons 的项目资产，未引入新的外部视觉资产。