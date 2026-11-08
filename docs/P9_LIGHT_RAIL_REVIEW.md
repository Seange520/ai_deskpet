# P9 轻盈光轨与远景精修（待审核）

日期：2026-11-08。主仓库 D:\deepseek_file\ai_deskpet。HEAD 保持 e507effc08cb153392c7a1429e7b8eb19756a3cd；未暂存、未提交、未推送。

## 光轨

P9 WorldAmbience 移除旧 EnergyRail 挂载，使用独立 FluidEnergyRail。实机确认场景中无 rail-tube 和旧球形 rail-beads。旧教学场景的渲染默认值独立保留。

- CatmullRom 闭合弧线，384 段、核心半径 .012m（原粗管半径 .095m），顶点随时间产生轻微垂直呼吸。
- 半透明自定义发光 ShaderMaterial，AdditiveBlending、depthWrite=false，流动脉冲替代实体 Toon 色阶/描边。
- 420 个流动 Points，使用软圆光斑与亮度呼吸，无球体几何灯珠。
- 96 个光雨采样点分散在 8 秒周期中，每点仅短暂出现，形成稀疏下落能量；不做持续粗光帘。
- 暂停与减少动态效果偏好会冻结动画时间。

## 场景精细化

Blender MCP 实际 execute_blender_code 生成 broken_steps.glb：三层崩边石阶和五块脱落碎屑，共 8 个对象，带 UV 与侵蚀倒角。四岛原 12 个无用途几何小底座替换为石阶，继续复用原创石材与 2048² 沙砾法线。

原环形步道和连接桥保留原碰撞边界，表面改为哑光石质。环形铺面增加径向/环向接缝；降低非金属石面的掠射高光，以细腻漫反射为主，避免看成另一条白亮光带。

P9 替换旧方柱远景，84 座巨构使用退台主体、八棱上层、侧翼支撑、横向连接、分叉尖顶和下悬结构组合剪影。7,800 个独立明暗窗格以 instancing 绘制，避免只剩几条横杠。远景山脊改为平滑法线并收暗层次；极光对比参数提升到 1.5，保留原星空。

四岛光柱改为透明局部体积代理：16 步径向密度积分、视角散射、加法混合、无深度写入。散射强度克制，不渲染实体圆柱表面。原神殿、桌宠、折射水晶、沙砾地面、云海和三段传送保留。

## 验证

- 最终原 E2E：67/67（1.7 分钟）。首次在编辑期间出现一次 DOM.describeNode 上下文失效；冻结源码后完整复跑通过，未修改测试断言。
- 视觉专项 scripts/check-world-rail.mjs：3/3；页面错误与着色器错误均为零。
- 实机断言：旧粗管/旧方柱不存在，核心 .012m，流点 420、光雨 96、窗格 7800、体积散射光柱 4，动画时间正常推进；正常落地、TPS/FPS 与传送继续工作。
- 质量与传送单测：8/8。
- 生产构建 npm run build:local：通过，2871 模块。
- 角色控制源码与此前接受版本比对一致（排除此前已加入的视觉阴影挂载）；本轮未修改 Exploration.jsx 或物理胶囊/Collider。

## 实机证据

C:\Users\Senage\.codex\visualizations\2026\11\07\01a1b693-ded6-7e71-9e57-3be30f4fe3f6\sparkmate-light-rail

rail-tps-panorama.png 为本轮第三人称全景，1920×1200，实际 Tier 3 页面键鼠操作拍摄。rail-checks.json、blender-result.json、physics-audit.json 与 e2e-last-run.json 可核验实现和测试事实。未重建离线画布或后期合成。

入口：http://127.0.0.1:15262/?quality=3&world=p9。请审核新光轨和整体视觉，按用户要求等待通过后再封板。
