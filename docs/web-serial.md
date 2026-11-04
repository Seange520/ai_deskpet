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
