# P9-M1：双脚落地与自由探索（待用户审核）

日期：2026-11-08（新加坡时间）。主仓库 D:\deepseek_file\ai_deskpet，基线 main / b942a1f8da48a9e214bb0da25f16d7489ee99e67 / v0.9.6-beta。承接本工作区已获用户认可的 P0 灰盒。用户明确要求先写码、完成后截图/录屏审核、严禁擅自提交；本轮未暂存、提交、打标签、推送或发布。

## 入口与已实现行为

打开 http://127.0.0.1:15262/?quality=3&world=p9 ，点击「开始自由探索」。WASD/方向键移动、Shift 跑动、空格跳跃、鼠标按住画面拖动视角、V 双向切换 TPS/FPS、Esc 直接返回原教学。桌面可用「锁定鼠标」，浏览器拒绝时仍可拖动；真实锁定后的 Esc 释放与退出已验证。

触控设备挂载官方 EcctrlJoystick，左下摇杆移动、右半屏拖动视角，右下原生按钮跳跃，顶部按钮切视角或退出。移动端证据是 Chrome 触控模拟，不称实体手机验收。探索时原教学树保持挂载并 inert/隐藏，不改业务路由或学习存档；退出恢复原 TravelRig、导航与真实 CodeRunner。

## 物理架构与版本

| 项目 | 本轮选择 |
| --- | --- |
| 新直接依赖 | @react-three/rapier 1.5.0、ecctrl 1.0.90，精确锁定 |
| 原框架 | React 18.3.1 / Fiber 8.18.0 / Three 0.170.0，保留 |
| 物理 WASM | react-three-rapier 自身使用 @dimforge/rapier3d-compat 0.14.0，WASM 内联包；依赖树另有原 maath 类型链的 0.12.0，未作为本轮引擎 |
| 物理时钟 | Physics timeStep=1/60；原生 KCC 每固定子步一次，不按渲染 dt 直接减位置 |
| 角色主体 | Ecctrl 的 capsule/rigid-body 容器，kinematicPosition；半高 0.35、半径 0.30 |
| 重力与跳跃 | 维护垂直速度，按 9.81m/s² 积分；跳速 5m/s；短按空格锁存至下个物理步，避免丢键 |
| 坡度与台阶 | 45° 爬坡限值加 0.002 弧度数值容差；滑坡阈值约 45.6°；autostep 最大 0.51m（为真实 0.5m 台阶留 1cm 数值余量）、最小落脚宽 0.2m，不对动态物体 autostep |
| 地面 | 原灰盒可见几何自动生成静态 trimesh；桥、环路、四岛、建筑与新增坡阶具有真实碰撞，角色 capsule 经 KCC 校正后提交 next kinematic translation |
| 掉落 | 低于 Y=-12 回到枢纽出生点，属于产品恢复逻辑；演示没有触发，也没有测试传送/坐标注入 |

**ecctrl 1.x 是悬浮动态刚体控制器，不是 Rapier 原生 KCC 的别名。** 为同时满足用户要求的 Ecctrl 接入、真正 autostep 和固定步长，本切片复用 Ecctrl 角色容器和官方摇杆，显式 disableControl/disableFollowCam，由自定义适配层统一驱动原生 KCC 与相机，未叠加两套重力/移动。ecctrl 内部 camera listener 选择本版本源码中无监听的 none 分支，并清理其私有 pivot，避免其自带相机与新相机竞争。没有宣称使用了 ecctrl 原生浮力运动算法。

上坡课程位于枢纽到学习岛的现有桥上：2m 水平/2m 高差的真 45° 坡、2m 高平台、2.5m 高平台（台阶差 0.5m），再经坡面下降。几何表面和 collider 同源。录制以真实键盘输入穿过该课程，未跳跃跨过台阶、未改相机、未注入位置。

## 相机、输入与暂停

只有一个角色相机写入者。探索时 SurveyCamera 和原 space/TravelRig 均卸载。TPS 使用 4.2m 弹簧臂和场景射线遮挡缩臂；fpsBlend 用指数阻尼连续逼近 0/1，再用 lerpVectors 混合弹簧臂与头部视点，相机位置继续阻尼，FOV 从 65 平滑至 72。未切换 Camera 对象，接近 FPS 时隐藏角色以免穿头。

KeyboardControls 只绑定可聚焦的探索 DOM 表面，不绑定 window；角色移动同时检查焦点。切到按钮、表单或失焦会发送释放并清除摇杆和跳跃请求。模态/后台/窗口失焦暂停 Physics 与相机，清空输入，恢复后不按长墙钟补播。Esc、切档、故障、离开探索清理锁定和输入。

## renderer 与资源

Stage renderer 沿用，新增物理不创建 renderer。EcctrlJoystick 本版本自带 Canvas，因此 buttonNumber=0，只使用其一个摇杆 Canvas，跳跃用 DOM。探索期间常驻伙伴 Canvas 卸载。核对 Fiber 8 源码后确认旧根延迟 500ms 释放，进入摇杆与退出恢复伙伴均等待 600ms。暂停时摇杆仅隐藏，不反复创建 context。实测进入/退出各约 1.2 秒、每 50ms 读取 Fiber 根，最高为两个，包含尚未延迟退休的根。

KCC 由 world.removeCharacterController 清理；相机元数据、私有 pivot、DOM 事件、MutationObserver、延时、指针锁定和摇杆 geometry/material 有明确释放路径。未修改 runtime、USB、学习 Store、XP、奖励、关卡或持久化键。

## 降级与加载

不带 world=p9 的默认入口保留 v0.9.6-beta。Tier 0 零 Canvas，Tier 1/2 继续原场景；P9 物理、Ecctrl 及 WASM 只在显式进入探索后懒加载。Tier 1 首次请求列表明确未出现 exploration/rapier/ecctrl。模块中断会由既有边界回退到零 Canvas 教学。

新增探索共享块约 2.35MB / gzip 862kB（包含物理 WASM 与封装），不是首屏主包；仍有大 chunk 提示。灰盒使用完整静态 trimesh，尚未针对大型地图做碰撞分块/简化，不能据此宣称 P9 极质 60 FPS、长时显存或实体移动端性能已验证。PBR 混合画质、正式模型、传送升级和地图未包含在 M1。

## 验证与证据

- M1 专项 8/8，正常页面 pageerror=0：真实键盘跑动、45° 上坡与 0.5m 自动跨阶；V 正反向中间 fpsBlend/FOV；真实短按跳跃；鼠标拖动实际 yaw；模态固定步冻结与恢复；焦点隔离/Esc/同 Canvas/教学与存档；EcctrlJoystick 真触摸和同时右拖实际 yaw；低档不加载物理与模块失败教学回退。
- 额外生命周期实测：指针锁定成功，Esc 释放并恢复教学；进入/退出时 Fiber roots 最高 2，见 lifecycle.json。
- 原 E2E 完整复跑 67/67（约 3.0 分钟），原 tests 未修改；既有画质/飞行单测 7/7。首次并行回归为 66/67，其中原 320px 弹窗点击后 dialog 未出现；独立原用例通过，再完整复跑 67/67。未改断言或业务代码规避。
- 最后的 600ms renderer 交接改动后，补跑原 Stage 与 CodeRunner 用例；结果见最终附记。
- 生产构建成功，2842 modules；最终复跑结果见附记。

证据目录：
C:\Users\Senage\.codex\visualizations\2026\11\07\01a1b693-ded6-7e71-9e57-3be30f4fe3f6\sparkmate-p9-m1

m1-exploration-10s.webm 为约 10.1 秒真实 Stage Canvas captureStream/MediaRecorder 录制。视频不含 DOM HUD；frame-000.png 至 frame-040.png 是同一次操作的 41 张完整界面连续帧，计划间隔 250ms，实际时间在 m1-checks.json。review.html 同时展示视频、完整截图和采样时间。无重绘、手调机位、测试传送或后期调色。

录制约 0–0.5s Shift+W 起跑，随后 W 上坡和跨阶，4.5s 松开移动，6s 按 V 切到 FPS，8s 空格跳跃。角色中心落地约 Y=0.665，上层平台约 Y=2.665，台阶后约 Y=3.165；台阶落脚数据并非假 y 字段。

## 复跑与参考

所有命令 workdir 显式为 D:\deepseek_file\ai_deskpet，15262 已核对为该主仓库 Vite，15261 给 E2E 独立服务。

```powershell
$env:SPARKMATE_TEST_PORT='15261'
npm run test:e2e
node --test --test-isolation=none tests/m2-quality.unit.mjs tests/quality-tier.unit.mjs tests/travel-timeline.unit.mjs
node scripts/check-world-m1.mjs
npm run build:local
```

官方参考与本地版本源码交叉核对：
- https://github.com/pmndrs/react-three-rapier ：React 18 / Fiber 8 使用 v1。
- https://github.com/pmndrs/ecctrl ：实际安装 1.0.90 的 package.json/src 为行为依据，未套用当前 v2 文档。
- https://rapier.rs/docs/user_guides/javascript/character_controller/ ：KCC 位移校正、台阶、坡度与手动重力；实际方法签名另核对安装的 0.14.0 declarations。

## 最终附记

最后的 renderer 交接改动后，M1 专项仍为 8/8、pageerror=0；原 Stage + CodeRunner 定向 7/7。生命周期采样锁定成功且根数最高 2。最终生产构建 2842 modules / 11.38s，主入口 481.97kB / gzip 162.47kB，探索共享块 2353.11kB / gzip 862.25kB。HEAD 仍是 b942a1f8da48a9e214bb0da25f16d7489ee99e67。
