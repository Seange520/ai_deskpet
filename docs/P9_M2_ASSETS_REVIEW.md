# P9-M2 资产与 Toon 世界重塑（待审核）

日期：2026-11-08；唯一主仓库 D:\deepseek_file\ai_deskpet。基线 b942a1f8da48a9e214bb0da25f16d7489ee99e67，承接用户已验收的未提交 P9-M1。按本轮明确指令不暂存、不提交、不推送、不发版。

## Blender 实际执行与异常记录

本轮宿主工具列表未直接暴露 Blender 工具。按插件管理技能检查后未找到可连接插件；随后通过本机已配置的 mcp-for-blender stdio 服务，使用 Python MCP ClientSession 真正调用 execute_blender_code，连到 localhost:9876 的 Blender 4.5.10 LTS / addon 1.8 / protocol 15。首次工具执行成功，生成并导出石碑、水晶与岩石。

逐件检查 GLB JSON 后发现，首次导出混入用户先前连通性测试的 TestCube。第二次尝试限定 scene/view_layer 时，Blender 连接被重置且交互进程异常退出；没有将该次调用记为成功。最终使用同一份原创 bpy 建模代码，在独立 --background --factory-startup 进程中完成干净导出。三份最终 GLB 均无 TestCube，节点数分别 9/4/3。没有打开或覆盖用户 .blend 文件；交互 Blender 窗口的崩溃已告知用户，不声称窗口仍正常或原场景已恢复。

scripts/blender-world-m2.py 是最终可复跑后台导出脚本，带 bpy.app.background 检查，拒绝在用户交互场景中执行清理。scripts/run-blender-m2.py 现只做 MCP 只读连接检查，避免误用后台脚本。错误响应归档到截图目录 blender-mcp-error.json，不随生产 public 分发。

## 原创资产与实例化

| 文件 | 最终字节 | 作者/造型 | 场景实例 |
| --- | ---: | --- | ---: |
| public/assets/models/stone_tablet.glb | 18096 | 本轮原创，破损多边形轮廓、倒角、前后顶点微扰形成法线起伏、石座、七道青绿光纹 | 5（HUB + 每岛 1） |
| public/assets/models/crystals.glb | 6608 | 本轮原创，4 根不同高度与角度的五棱发光晶体 | 29 簇 |
| public/assets/models/rocks.glb | 9268 | 本轮原创，3 块低模扰动岩石 | 29 组 |

单位沿用 1 Three 单位=1m；Blender 导出 Y-up。useGLTF 缓存三份本地 GLB，复制并烘焙各节点 matrixWorld；按原材质合并几何，石碑 2 批、水晶 1 批、岩石 1 批，共 4 个 InstancedMesh。GLB 颜色与 emissive 接入现有 ToonMaterial，保留冷暖 RGB ramp、Rim 与稳定编译链。发光部分复用既有选择泛光机制。布局固定，无 Math.random、不改变学习存档。克隆/合并几何由组件释放，源 GLTF 保留在三文件加载缓存。

装饰主要位于岛缘与路径两侧，保留中央通路。每个实例的碰撞由同一份模型实际合并包围盒，经同一位置/旋转/缩放矩阵转为世界 AABB，构造固定 CuboidCollider；未给每份高面数视觉网格套三角碰撞。旋转后的 AABB 是保守简化，凹缺处可能提前挡住角色。

## 岛座、物理与环境

五个岛座复用 P8 IslandDeck / IslandRim，按 HUB 1.25、四岛 1.5 的水平比例适配 P9 尺度；不是仅把灰色 cylinder 改色。岛面延续 deck 解析纹路与 cliff 色阶；旧中央灰盒占位移除，避免挡住 TPS 弹簧臂。保留当前书页/芯片/数据幕/尖塔的基本轮廓，不称已完成正式建筑资产。

首次自动 trimesh 让角色落到岛座下层，实拍发现后改为简化地形碰撞：HUB/四岛用匹配顶面 Y=0.008 的圆柱，道路/环路分段用箱体；M1 坡阶用匹配几何的旋转箱体，建筑剪影用简化箱体。最终角色中心落地约 Y=0.673，含胶囊下半高 0.65 和接触间隙；测试明确断言 0.6<Y<0.8，避免只检查 grounded 而误收下层落地。

WorldAmbience 接回 P8 EnvironmentLighting、NightValley（星空/极光/远山/塔群）、EnergyRail、AbyssRibbons 与同一个 StageEffects composer（DepthInk/选择泛光/ACES/FXAA）。没有增加 Stage renderer 或第二个 Stage composer，继续最多 Stage+摇杆两个 Canvas。深渊带下移 2.8m，减少脚平面遮挡。减少动画/暂停沿用原组件机制。

## 隔离与回退

P9 功能仍限定 world=p9 且 Tier 3。原默认教学与 Tier 1/2 沿用 P8 降级底座；不进入探索时不加载 Rapier/Ecctrl。实测 Tier 3 先等三份 GLB 完成显示，再核对请求列表没有物理模块，随后才点击探索。Tier 1 首次加载无 GLB、Rapier 或 Ecctrl 请求，并实际操作原代码工坊。GLB 请求中断会由既有边界回退到零 Canvas DOM 教学，未以空场景代替可用教学。

未改学习/硬件 Store、真实 CodeRunner、XP/奖励/存档键、原 tests 或依赖版本。M2 无新 npm 包。原 P9 物理依赖和大包提示保留。

## 验证

- 原 E2E 67/67，约 3.0 分钟，失败/跳过 0。该轮跑在 M2 初版；随后只修改 P9 探索碰撞与取景，默认教学入口未变。
- 最终 M2 专项 5/5，正常页面 pageerror=0：三 GLB 的 5/29/29 实例与落地高度、真实侧移/V 切 FPS、向前撞石碑后停在约 Z=2.085、Esc/学习存档不变/岛屿按钮机位、Tier 1 无物理或 GLB、Tier 3 静态预览无物理、GLB 失败后零 Canvas 教学。
- 更换碰撞后原 M1 专项 8/8，pageerror=0；复验实际 45° 坡、0.5m 台阶、跳跃、正反 FPS/TPS、触控摇杆与右拖、模态/焦点隔离和退出。
- 最终生产构建 2844 modules，12.99s 成功；入口 481.98kB / gzip 162.47kB。三份 GLB 合计 33972 字节，不依赖外部纹理。原 500kB 提示保留。
- 不将 composer 最后一次 render.info.calls=1 当作全帧 draw 预算；这里只报告可直接数出的四个模型实例批次。没有新做实体移动端、长期显存或 60FPS 保证。

## 截图审核

目录 C:\Users\Senage\.codex\visualizations\2026\11\07\01a1b693-ded6-7e71-9e57-3be30f4fe3f6\sparkmate-p9-m2

1. m2-tps.png：真实出生点落地后第三人称，P8 Toon 岛面、石碑、岩石、水晶与大世界背景同屏。
2. m2-fps-tablet.png：通过实际 A 侧移、S 后退、V 切 FPS、鼠标抬头观察 Blender 石碑，没有给相机/角色注入位置。
3. m2-island.png：点击产品「学习岛全貌」的整体画面。该按钮机位是本轮正式新增的产品观察位。
   
1728×1080 / DPR 1，完整 DOM 界面，无重绘、调色或后期加工。review.html 展示三图，m2-checks.json、m1-regression/m1-checks.json 与 review-manifest.json 保存结果和哈希。

所有项目命令 workdir 均为唯一主仓库；15262 正常服务本轮重新启动，15261 给独立 E2E。复跑：

```powershell
& 'C:\Program Files\Blender Foundation\Blender 4.5\blender.exe' --background --factory-startup --python scripts/blender-world-m2.py
$env:SPARKMATE_TEST_PORT='15261'
npm run test:e2e
node scripts/check-world-m2.mjs
node scripts/check-world-m1.mjs
npm run build:local
```

## 封板授权

2026-11-08，用户确认 M2 资产接入与视觉恢复验收通过，授权以 v0.9.7-alpha 封板提交当前所有改动，指定提交正文。README 与 npm/锁文件根版本统一更新；暂不推送，随后进入 M3。上文待审核与未提交描述保留为开发时记录，以本节授权为最新状态。
