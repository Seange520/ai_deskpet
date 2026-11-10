# V1.0 单机版冻结清单与验收口径（2026-11-10）

> 定位：v1.0 是**单机离线版**，只做「一条街 + 一套课 + 一份档案」。4v1 设计保留，代码不预留联机接口。

## 一、必须有的内容（冻结项）

1. **晴光街抢修**：三单（A 熄灯的晚餐 / B 发烫的接头 / C 不能熄灭的灯），故障确认→记录→修复→合闸演出→计分卡→回流学习枢纽；进度持久化；手机 Tier2 可玩；ESC 退出。
2. **教学**：36 节可玩课（AD 18 + K 18），七段任务制；「街上的现场课」桥接卡；诊断 12 题；星图；档案。
3. **3D 全零件说明书**：8 零件、分离滑杆、装配顺序、点选说明；AD-01 与街坊工坊双入口。
4. **档案/成长**：维护者档案（铭牌/外观/数据）、等级/XP、修亮灯数与掌握课节；无排行榜。
5. **外观**：A 基线（纸/墨/黄铜 + 晴光街实景）；四模块名（校验册/街坊工坊/誊写房/委托板）；纸面主题默认。
6. **小说切片**：22 章大版本作为游戏内「档案/阅读」可选内容（只读，不联网）。
7. **双端包**：Web（主）、Android APK v16（32,801,374B SHA `27CF1228…`）、Windows x64 zip（137,694,107B SHA `95570970…`）；版本号 v0.9.8-alpha 对外标注「单机版」。
8. **官网**：`public/site/index.html` 落地页 + 下载区（SHA 校验、内测说明）+ 路线图（v1.0 单机 / v2.0 4v1）。

## 二、技术冻结项

- 不引入服务端依赖；不接账号/UID 后端；不写联机代码。
- 资源包下载器保留但 v1.0 不强制（Web 按需加载）。
- 移动端目标：≥120fps（Tier2 已测 125–165fps headless）；桌面 Tier3 2× DPR/4096 阴影。
- 存档键不再改名（`sparkmate.checksum.profile.v1`、`sparkmate.checksum.mission.v1`、`sparkmate.ui.theme.v1`）。
- 教学数据 schema 冻结：新增课节只加数据，不改 runner 协议。

## 三、上线前仍缺（阻断项）

1. 10–20 人封闭试玩与反馈表（用户侧）。
2. APK v16 / 桌面包本机双击实测记录（用户侧）。
3. ~~A 版胶囊 7 张 + 截图 7 张定稿~~ 已完成：`work/deliverables/store-a/`（14 文件 + MANIFEST + README）。
4. ~~预告片 v4~~ 已完成：`work/deliverables/trailer-v4/` 中英双版（49s，1080p30，SHA 已记）。
5. 关闭/隐藏所有「BETA」标记的时机与文案（保留内测标识至试玩结束）。
6. 主界面入口 → 三单 → 返回全流程回归：**已完成**（`scripts/check-r1-flow.mjs`，5 图证据，入口回显 3/3）。

## 四、下一版本（v2.0 4v1，不在本冻结范围）

四校验员 vs 空页；校筑/地形/读改/销名；先 AI 教学局再真人联机；服务端权威地形与镜头矩阵（见 `CORE_GAMEPLAY_V3_REGISTRATION_WAR.md`、`TERRAIN_BUILDING_AND_CAMERA_RISK_V1.md`）。

## 五、验收命令

- `node scripts/check-r1-mission.mjs`（13/13）
- `node scripts/check-r1-flow.mjs`（全流程 1/1，含入口与返回）
- `node scripts/check-r1-tier2.mjs`（手机门槛）
- `node --test tests/mission-r1.unit.mjs`（21/21）
- `npx playwright test`（67/67）
- `npm run build`（含 `dist/site/index.html`）

## 冒烟审计（第 121 轮）

- 路由矩阵：`?mission=r1&quality=3`、`?quality=3&boot=0`、`?exploded=1`、`/site/index.html` 四路由 1440×900 networkidle+1.5s，**0 console error / 0 pageerror / 0 失败请求**。
- 修复：hero 玻璃由 `@khvicha/react-liquid-glass` 改为纯 CSS `.hero-glass`（消除 React `lighting-color` 警告、去掉一个运行时依赖）；补 `public/favicon.svg` 并在 `index.html` / `site/index.html` 声明 icon（清除浏览器默认 favicon 404）。
- 站点下载块版本号校准：APK 标注 v16 · 32.8MB（与 SHA 27CF1228… 一致）。
- 仍待用户侧：APK/桌面安装实测、10–20 人试玩。

## 小说切片（第 121 轮补）

- 新增离线阅读页 `public/novel/index.html`：读取 `public/assets/novel/v1.md`（22 章全稿 100,418 字，416,075B），左侧章节目录、上一章/下一章、←/→ 键翻章、`sparkmate.checksum.novel.v1` 记住章节位置；纸/墨/黄铜样式与游戏一致。
- 入口：官网导航「阅读档案」+ 游戏页脚「档案阅读」。
- 验证：目录 22 条、切章标题正确、localStorage 记录 index、0 console error；截图 `work/acceptance/v1-smoke/novel2.png`。

## Web 离线壳（第 121 轮）

- `public/sw.js`（v1.0.2）+ `scripts/gen-sw-manifest.mjs`：首次打开后预缓存 244 个文件（8.7MB，代码/文本/GLB/小图），`package.json` build 自动生成 `dist/sw-manifest.json`；生产构建才注册 SW。
- 实测（`npx vite preview --port 15265`，Chromium）：在线首访 → 等待 SW ready → `context.setOffline(true)` → reload，主页/委托三单/档案阅读页均可离线渲染，0 console error；缓存策略 cache-first + ignoreVary（Vite preview 的 Vary 头会导致默认匹配失败）。
- 产物：`work/acceptance/v1-offline/offline4.png`（离线主页）、novel/mission 路由文字校验通过。
