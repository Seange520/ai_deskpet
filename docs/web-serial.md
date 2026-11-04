# Phase 4 第一刀：Web Serial 只读连接

入口在主应用“代码魔改工坊”，位于代码沙盒上方。必须由用户点击“连接真实 ESP32”并在浏览器中选择 USB 串口，才调用 requestPort / open；没有自动申请权限或自动重连。默认 115200 baud，可选择 9600，需与设备配置一致。

支持能力按安全上下文和 navigator.serial.requestPort 检测，不按浏览器名字或手机 UA 判断。能力不存在时按钮禁用并提示“不支持硬件连接”；取消选择、拒绝授权、打开失败、读取中断和设备拔出均显示可恢复说明，不影响原课程与桌宠。

## 数据约定

设备发送 UTF-8、以换行结束的 JSON，例如：

```json
{ "temp": 25, "light": 300 }
```

要求 light 是有限数值；temp 可省略，提供时也必须为有限数值。新增虚拟光感支持仅发送 {"light":300}，省略 temp 时显示“—”；temp 按摄氏度展示，light 按设备原始读数展示，不假定已标定为 lux。支持分包、连续多行、UTF-8 字符跨包和 CRLF。空行忽略；启动日志、非法 JSON、字段类型错误和超过 8192 字符的行会被忽略并提示，下一个合法数据行可继续显示。仅保存最新合法读数及接收/坏行计数，不累积原始数据。

读取结果进入新增的 `useHardwareStore.hardwareData`（temp、light、receivedAt）。该独立 Zustand store 仅保留本次会话的串口状态和遥测，没有持久化，不修改 useLearningStore 的结构、存档、XP、关卡、路线或 3D runtime。断开后清空读数，重连清零计数；刷新不恢复设备连接或遥测。

连接器负责 reader.cancel → read loop 结束 → releaseLock → port.close，移除 disconnect 监听。离开代码工坊、切换导致组件卸载或 pagehide 时主动断开；晚于取消完成的串口选择/打开不会更新界面，已打开的迟到端口会关闭。pagehide 清理为浏览器页面生命周期中的尽力释放。

## 边界与虚拟串口

USB 路径仍仅完成串口选择、打开与接收，不执行烧录、设备身份验证、协议 ACK 或发送控制指令；可通过下方固件面板复制独立 Arduino 示例。本期增加只读光照到独立桌宠动作状态的联动，不改变真实沙盒 runtime。“串口已连接”表示 open 成功，不代表已经核验设备确为 ESP32；收到合法数据才显示数值。

`createSerialConnection` 接受可注入的 getSerial provider，预留与 navigator.serial 相同接口的虚拟串口。正式界面默认使用浏览器 API；用户也可明确选择“连接虚拟光感”，读取仅监听 127.0.0.1 的 Node 模拟器。两种连接互斥，均复用现有读取/清理链路；mock 仍只用于测试，不冒充真实设备。详见 [动作与手势控制](phase4-interaction.md)。

## ESP32 固件代码面板

在「连接真实 ESP32」下方展开「获取 ESP32 固件代码」。复制到 Arduino IDE，选择对应开发板与端口后烧录，接上 USB，再在网页上方以 115200 波特率连接；连接前关闭 IDE 串口监视器，避免占用同一端口。使用原生 USB 的开发板时，需按该板说明配置 USB CDC，让 Serial 输出到所连接的 USB 串口。

`esp32Firmware.js` 是纯前端 Arduino 字符串模板，只有 Arduino 核心依赖：通过 Serial 每秒输出一行 `{"light":300,"temp":25.0}`，没有 GPIO 读取或执行器控制；温度与光照均为模拟值。可把代码中的 light 改成 50，观察现有暗光休眠联动。示例与原遥测解码器兼容，不代表已在实体 ESP32 上编译或烧录验收。

面板默认折叠，只在点击复制时调用 Clipboard API；权限拒绝或 API 缺失时选中代码并提示手动复制。生成、展开和复制只使用组件本地状态，不请求串口权限、不发网络请求、不写入学习 Store 或 localStorage。

## 验证

- `node --test tests/serial.unit.mjs`：8 项分包解析、拒绝授权、EOF/断开、取消竞态、锁释放与关闭错误单测。
- `npm run dev -- --port 5242 --strictPort` 后执行 `node scripts/check-web-serial.mjs`：不支持、拒绝、取消、打开失败及虚拟数据流 UI 补验；可用 SPARKMATE_SERIAL_URL 指定本地主场服务。脚本验证学习状态和 localStorage 不变、无写串口、断开/离页清理，并生成明确标记为 mock 的截图。
- 设置 `SPARKMATE_FIRMWARE_URL` 为独立开发服务地址，运行 `node scripts/check-firmware-generator.mjs`：验证键盘折叠、完整代码复制、拒绝权限/API 缺失时手动选择、320px 布局，以及无串口申请和学习存档写入；报告与截图位于 `test-results/`。
- 原有 `npx playwright test` 保持 65 项，不改变任何既有用例或断言。
- `npm run build:local` 验证本机 Windows 构建。

真实 USB ESP32 与实体固件尚未验证。参考：[Chrome 官方 Web Serial 指南](https://developer.chrome.com/docs/capabilities/serial)。

## 浏览器光感演示（第一阶段）

代码工坊的“浏览器光感演示”无需 USB、Node 或网络请求，用户点击后创建内存字节流，经原串口读取器与 JSON 解码器进入硬件遥测。界面持续标注“浏览器模拟数据”；初始光照 300，每秒一包，温度未提供时显示“—”。遮住光感立即发送 `{"light":50}`，恢复光照发送 `{"light":300}`，由 Companion 原光照逻辑驱动暗光休眠/恢复，不直接写桌宠动作或学习 runtime。

演示使用独立 `source: 'demo'`，与真实串口、原 Node 虚拟光感互斥。初始化可取消，断开、离页和 pagehide 统一释放字节流、计时器及可见性监听；后台暂停采样，回到前台发送最新读数，不补发积压样本。慢读取时最多保留一块待消费数据。接收灯仅在新合法读数到达时短闪，弱动画下保持静态。

不持久化，不申请 USB/摄像头权限，不写串口、不新增后端；本阶段不含波形、日志或异常场景控制。

补验：`node --test tests/browser-demo-serial.unit.mjs tests/serial.unit.mjs tests/interaction.unit.mjs`；正常开发服务（不设置 regression 参数）下，用 `SPARKMATE_DEMO_URL` 指定独立服务地址后执行 `node scripts/check-browser-demo.mjs`。脚本验证 1440/320px 的明暗闭环、原 Node 桥接、互斥、学习/存档不变及多轮取消/连接/离页后的演示资源清理；截图与报告位于 `test-results`。这属于有限轮次清理验证，不代表所有设备长期堆内存验收。

## 浏览器演示可视化（第二阶段）

浏览器演示连接期间显示 SVG 光照折线与事件日志；真实 USB、Node 桥接及演示结束后不显示。曲线按采样顺序展示最近 60 个已解析样本，标注“原始读数”，没有 lux 标定含义；相同读数的不同包也逐包保留，波形直接更新，不延迟真实读数。

日志最新在前，最多 40 行，区分“模拟器事件”“已解析遥测”“异常提示”。模拟按钮事件只表示本地模拟发送，解析数据不称为原始字节。默认新行短暂淡入，弱动画时取消入场动画；SVG 折线始终即时静态更新。第二阶段没有新增异常场景控制。

`useSerialDemoSession` 独占会话观察器；样本、日志和订阅均不写全局 Store 或 localStorage。结束、离页、切换来源会清空历史并退订，重新连接开始新会话。单测：`node --test tests/serial-demo-session.unit.mjs`。正常环境下指定 `SPARKMATE_DEMO_URL` 后运行 `node scripts/check-browser-demo-insights.mjs`，覆盖 1440/320px、十轮明暗切换、100 包压力更新、60/40 上限、弱动画、Node 来源隔离、重新连接与退订清理；这属于有限轮次资源验证，不代表所有设备长期堆内存结论。

## 浏览器演示场景（第三阶段）

仅浏览器演示连接时出现默认折叠的“演示场景”。暂停上报停止演示采样，状态仍为 connected，遥测与波形保留最后值；明暗及脏行控制在暂停时禁用，恢复上报立即发送当前合法样本。暂停不会被页面可见性切换解除。

模拟拔线调用既有统一 disconnect，经共享连接器取消读取、关闭端口并清空遥测/波形/日志，显示重新连接入口。重新连接创建全新演示流和历史。非法数据操作将 `error\n` 注入字节流，原 JSON 解码器拒绝并增加坏行计数，UI 显示“已忽略非法数据”；下一次正常采样清除 notice 并显示恢复。恢复等待复用原采样计时器，拔线/离页后不会迟到补发。

无真实串口控制，不修改共享解码规则或学习存档。单测 `node --test tests/browser-demo-scenarios.unit.mjs`；正常环境中指定 `SPARKMATE_DEMO_URL` 后运行 `node scripts/check-browser-demo-scenarios.mjs`，覆盖 1440/320px、暂停保值、脏行拦截恢复、恢复中拔线、重连、来源互斥及演示计时器/监听/订阅回收。这是有限轮次清理验证，不代表所有设备长期堆内存验收。
