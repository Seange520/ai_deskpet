/**
 * 软著申报材料生成：源程序样本 + 用户说明书（A4 PDF）。
 * 用法：node scripts/build-copyright.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = 'D:/deepseek_file/ai_deskpet';
const OUT = 'D:/deepseek_file/work/deliverables/copyright';
const SHOTS = 'D:/deepseek_file/work/acceptance/ui-v2';
mkdirSync(OUT, { recursive: true });

const SOFTWARE = '第七校验游戏软件';
const VERSION = 'V0.9.8';

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const EXTS = new Set(['.js', '.jsx', '.mjs', '.css', '.json', '.cjs']);
const files = walk(join(ROOT, 'src'))
  .filter((f) => EXTS.has(extname(f)))
  .sort((a, b) => a.localeCompare(b));

const linesPerPage = 50;
const pages = [];
for (const file of files) {
  const rel = relative(ROOT, file).replaceAll('\\', '/');
  const raw = readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  let block = [`// ${rel}`];
  for (const line of raw) {
    if (block.length >= linesPerPage) {
      pages.push(block);
      block = [];
    }
    block.push(line.replace(/\t/g, '  '));
  }
  if (block.length) pages.push(block);
}
if (pages.length < 2) throw new Error('source too short');

const head = pages.slice(0, 30);
const tail = pages.slice(-30);
const total = head.length + tail.length;
const esc = (s) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function codePageBlock(blocks, offset) {
  return blocks
    .map((block, i) => {
      const no = offset + i + 1;
      const body = block.map((l, k) => `<span class="ln">${String(k + 1).padStart(2, ' ')}</span> ${esc(l) || ' '}`).join('\n');
      return `<section class="page"><header>${SOFTWARE} ${VERSION} · 源程序</header><pre>${body}</pre><footer>第 ${no} / ${total} 页</footer></section>`;
    })
    .join('\n');
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 14mm 12mm 14mm 12mm; }
  html, body { margin: 0; padding: 0; }
  .page { page-break-after: always; padding: 2mm 0; }
  header { font: 9px/1.4 'Microsoft YaHei', sans-serif; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; }
  footer { position: fixed; bottom: 2mm; left: 0; right: 0; text-align: center; font: 8px/1.4 'Microsoft YaHei', sans-serif; color: #666; }
  pre { margin: 0; font: 7.4px/11.2px Consolas, monospace; color: #111; white-space: pre-wrap; word-break: break-all; }
  .ln { display: inline-block; width: 2.4em; color: #aaa; user-select: none; }
  section:last-child { page-break-after: auto; }
</style></head><body>
${codePageBlock(head, 0)}
${codePageBlock(tail, head.length)}
</body></html>`;

const sourceHtml = join(OUT, '_source.html');
writeFileSync(sourceHtml, html);

/* ── 用户说明书 ── */
function shot(file) {
  for (const dir of [SHOTS, 'D:/deepseek_file/work/acceptance/ui-v2b']) {
    const p = join(dir, file);
    try {
      const b = readFileSync(p);
      return `data:image/png;base64,${b.toString('base64')}`;
    } catch {
      /* try next */
    }
  }
  throw new Error('screenshot not found: ' + file);
}

const manualPages = [
  { h: '一、软件概述', body: `
    <p><b>软件全称：</b>${SOFTWARE}（The Seventh Checksum）。</p>
    <p><b>版本号：</b>${VERSION}。</p>
    <p><b>运行环境：</b>Windows 10/11（桌面版）、Android 10+（移动版）、现代浏览器（Web 版，Chrome/Edge 最新版）。</p>
    <p><b>软件用途：</b>面向电子工程初学者的游戏化教学软件。玩家在虚构城市「流明域」中担任检修员：使用万用表、示波器、力反馈等虚拟仪器测量电路，通过真实工程判断完成修复谜题；课程体系覆盖用电安全、万用表、面包板、单片机、通信、嵌入式，以及集成电路专业支线（PN 结、MOS、CMOS、逻辑门、时序、EDA、版图、流片）。</p>
    <p><b>设计原则：</b>教学结论必须由玩家亲手测量与验证得出；不设付费变强；所有功能离线可用。</p>` },
  { h: '二、安装与启动', body: `
    <p><b>桌面版：</b>解压安装包到任意目录，双击 <code>TheSeventhChecksum.exe</code>。首次启动如出现 Windows SmartScreen 提示，选择「更多信息 → 仍要运行」。软件为完整离线包，无需联网。</p>
    <p><b>安卓版：</b>安装 APK 后首次进入会下载章节资源包（约 9MB 示例），可在设置-资源包中查看进度。</p>
    <p><b>Web 版：</b>访问官网 www.seange.cn，点击「免费开始 Web 体验」，无需注册即可游玩第一章。</p>
    <p><b>存档：</b>进度保存在本机（localStorage 与本地文件），不依赖账号，清理浏览器数据会清除本地存档。</p>` },
  { h: '三、主界面', img: '01-hub.png', cap: '图 1 主界面：中央为城市枢纽，右上为教学入口。', body: `
    <p>主界面顶部为品牌栏、学习等级与经验值、音效开关、教学入口与「维护者档案」。屏幕中央为三座岛屿枢纽：<b>校验册</b>（教学）、<b>街坊工坊</b>（自由探索）、<b>代码魔法工坊</b>（代码挑战）。</p>
    <p>画面左下为当前事件胶囊，右下为桌宠「零」与聚焦按钮。</p>` },
  { h: '四、教学入口', img: '02-teaching-panel.png', cap: '图 2 「校验之径」教学面板。', body: `
    <p>点击「校验之径」打开教学面板，内含三个页签：<b>课节</b>、<b>星图</b>、<b>档案</b>。</p>
    <p>课节页提供起点诊断（12 题、约 15 分钟，答题结果决定推荐路径）、今日建议与任务链。章节以紧凑行展示进度，课节卡片按层级配色，锁定课节不可进入。</p>` },
  { h: '五、课节结构', img: '05-lesson-mission.png', cap: '图 3 课节任务简报（第 1/7 段）。', body: `
    <p>每个课节固定七段：<b>任务简报 → 观察现象 → 学习原理 → 动手演练 → 校验证据 → 迁移应用 → 提交档案</b>。右上显示当前段号、建议用时与场景。</p>
    <p>任务简报给出短剧情与目标；旁白可点「朗读本段」播放语音。</p>` },
  { h: '六、观察与学习', img: '06-lesson-seg2.png', cap: '图 4 观察段：原理可视化与零件图。', body: `
    <p>学习段包含原理可视化（SVG 示意图/组图）、自测题与仿真组件。所有示意图为原创资产，可离线显示。</p>
    <p>答题即时反馈：正确写入证据，错误给出原因与重试入口。</p>` },
  { h: '七、动手演练与校验', img: '06-lesson-seg3.png', cap: '图 5 动手演练：仿真组件（万用表/电路/工序）。', body: `
    <p>演练段以教学仿真呈现真实仪器操作：选档、接线、读数、记录。仿真会检查档位、量程、接线顺序与读数，错误给出具体原因。</p>
    <p>校验通过后系统记录证据条数与分数；证据不足无法提交档案。</p>` },
  { h: '八、星图与档案', img: '03-starmap.png', cap: '图 6 星图：七柱九层与星点详情。', body: `
    <p>星图按「层带 × 七柱」展示全部知识节点，悬停查看详情、点击可开始课节；灰色为未解锁。</p>
    <p>档案页展示学习统计、证据记录与本地身份编号。</p>` },
  { h: '九、自由探索', img: '05-street.png', cap: '图 7 自由探索：街景 HUD 与任务提示。', body: `
    <p>主界面选择「开始自由探索」进入流明域街区。左侧为任务与仪表提示，右侧为万用表；可切换第一/第三人称视角，按 V 切换视角、按 M 打开大地图。</p>
    <p>靠近可测点时出现测量提示，进入鹰眼透视后点击测点读数；修复完成后街区灯光恢复。</p>` },
  { h: '十、起点诊断', img: '04-diagnostic.png', cap: '图 8 起点诊断：12 题分层作答。', body: `
    <p>诊断共 12 题，覆盖 L0–L4；答对跳层、答错按最小路径补齐。提交后给出 A/B/C 路径建议，并生成推荐课节。</p>` },
  { h: '十一、常见问题', body: `
    <p><b>Q1：没有声音？</b>浏览器需先点击页面一次才会启动音频；桌面版首次进入后已自动初始化。</p>
    <p><b>Q2：课节按钮是灰的？</b>前置课节未完成，查看星图详情中的「前置」。</p>
    <p><b>Q3：进度会丢吗？</b>进度保存在本机；换设备不会同步。可在档案页导出记录。</p>
    <p><b>Q4：需要真实硬件吗？</b>游戏内全部使用虚拟仿真；实体桌宠套件为可选进阶，不影响主线。</p>
    <p><b>Q5：如何反馈问题？</b>官网「关于本作」页留有反馈入口；桌面版附带安装说明文档。</p>` },
  { h: '十二、世界观与叙事', body: `
    <p>故事发生在名为「流明域」的架空城市。城市依靠一套名为「第七校验」的检修协议维持运转：每一次读数都会被记录，每一处故障都必须留下证据。玩家扮演新到任的检修员，从修好第一盏路灯开始，逐步接触冷库、街道网络、共鸣体与城市底层的秘密。</p>
    <p>叙事采用「单元案 + 主线伏笔」结构：每个课节是一个可独立完成的检修委托，委托之间由角色关系与城市事件串联；主线信息按教学进度解锁，未解锁内容不会提前剧透。</p>
    <p>主要角色：<b>贺非</b>（维修间负责人，严厉但护短）、<b>娄赞</b>（街头情报贩子）、<b>零</b>（玩家亲手组装的桌面伙伴，AI 助手）、<b>巡线工</b>（主线关键人物）。</p>` },
  { h: '十三、教学体系与知识图谱', body: `
    <p>知识体系采用「七柱 × 九层」二维结构。七柱对应工程能力方向：<b>基石</b>（安全与工具）、<b>熔炉</b>（模拟电路）、<b>织网</b>（数字与通信）、<b>回声</b>（嵌入式与系统）、<b>共生</b>（AI 与交互）、<b>匠臣</b>（工程素养）、<b>回响塔</b>（综合项目）。九层由 L0 到 L8 逐层加深。</p>
    <p>每个知识点（KP）包含：一句话目标、前置关系、课节、证据类型与掌握判定。图谱当前包含 70 个知识点、69 条前置边，覆盖主线八章、桌宠实验室十八节与集成电路支线十二节。</p>
    <p>课节完成判定采用「校验分 × 迁移分 + 证据条数」：只完成操作不得满分，必须通过迁移题证明理解，而且证据达到阈值才记为掌握。</p>` },
  { h: '十四、AI 伙伴「零」与边界', body: `
    <p>「零」是玩家在桌宠实验室中亲手装配的桌面伙伴。对话由本地规则与可选的大模型接口共同驱动；默认离线、零网络请求，不采集个人信息。</p>
    <p>边界规则：不代替玩家做安全判断、不提前剧透后续剧情、不修改学习证据与分数、不诱导付费。拒绝时会给出可执行的下一步建议。</p>
    <p>记忆只保存在本机（偏好、约定与已确认事实），可查看、修改、删除；敏感信息不落盘。玩家可随时关闭 AI 功能，不影响主线完成。</p>` },
  { h: '十五、桌面版与移动版', body: `
    <p><b>桌面版：</b>包含完整渲染管线（NPR+PBR）、全章节与高清材质，画质档位默认「极致」，支持键鼠操作。</p>
    <p><b>安卓版：</b>基础包 + 章节资源包按需下载；触屏为左摇杆/右视角/跳跃，HUD 自适应竖屏与横屏。</p>
    <p><b>Web 版：</b>用于官网宣传与轻量试玩，画质自适应；完整剧情与教学可达，资源按需加载。</p>
    <p>三个平台共用同一份知识图谱与课节数据，学习进度默认不跨设备同步。</p>` },
  { h: '十六、进度、存档与导出', body: `
    <p>进度结构包含：知识点状态（locked/available/partial/mastered）、证据记录、诊断结果、章节进度、维护者档案（铭牌/外观/数据）。</p>
    <p>存档键：<code>sparkmate.checksum.profile.v1</code>（学习）、<code>sparkmate.checksum.profile.v2</code>（学习 v2 扩展）、<code>sparkmate.ai.memory.v1</code>（零的记忆）。</p>
    <p>档案页支持查看证据与导出记录副本（JSON），便于课堂或比赛核验；导出的文件不包含身份凭证。</p>` },
  { h: '十七、性能与设备要求', body: `
    <p><b>桌面最低配置：</b>Windows 10 64 位、双核 2.0GHz、4GB 内存、集成显卡（支持 WebGL2）、300MB 可用空间。</p>
    <p><b>推荐配置：</b>四核 3.0GHz、8GB 内存、独立显卡、500MB 可用空间。</p>
    <p><b>安卓：</b>Android 10+、4GB 内存、支持 WebGL2 的 GPU；低端设备可切换「流畅」画质。</p>
    <p>渲染异常时可在设置中切换画质档位或关闭部分后期效果；教学面板不依赖 3D 渲染，可独立使用。</p>` },
  { h: '十八、常见术语', body: `
    <p><b>校验分：</b>课节内检查项的通过率，反映操作是否正确。</p>
    <p><b>迁移分：</b>迁移应用题得分，反映能否把结论用到新场景。</p>
    <p><b>证据（evidence）：</b>玩家在课节中留下的一条可复核记录，含类型、分数与上下文。</p>
    <p><b>知识点（KP）：</b>图谱中的最小教学单元，具有层级、柱、前置与状态。</p>
    <p><b>七柱九层：</b>知识图谱的二维坐标，横轴为能力方向，纵轴为难度层带。</p>
    <p><b>检修协议：</b>世界观中「先测量、再结论」的工作规范，也是本作的教学原则。</p>` },
  { h: '十九、版本记录与反馈', body: `
    <p><b>V0.9.8-alpha：</b>新增桌宠实验室 18 节、集成电路支线 12 节、起点诊断与星图、桌面版打包、视觉 v2、资源包下载器；完成章节一至三教学线。</p>
    <p><b>V0.9.x：</b>逐步加入街道大世界、万用表鹰眼、共鸣链、潜行等玩法与质量改进。</p>
    <p><b>反馈渠道：</b>官网「关于本作」页面；桌面版随包附安装说明与问题排查章节。</p>
    <p>本说明书用于软件著作权登记材料，内容与交付版本一致。</p>` },
  { h: '二十、桌面端安装细节', body: `
    <p><b>步骤 1：</b>解压压缩包到不含中文与空格的路径，例如 <code>D:\\Games\\TheSeventhChecksum</code>。</p>
    <p><b>步骤 2：</b>双击 <code>TheSeventhChecksum.exe</code>；如被 SmartScreen 拦截，点「更多信息」→「仍要运行」。</p>
    <p><b>步骤 3：</b>首次启动约 5–15 秒完成渲染管线预热，期间显示启动画面与进度。</p>
    <p><b>步骤 4：</b>进入主界面后可先打开「校验之径」做起点诊断，或直接开始第一章。</p>
    <p><b>卸载：</b>删除解压目录即可；存档位于用户数据目录，不随卸载自动清除。</p>` },
  { h: '二十一、安卓安装与资源包', body: `
    <p><b>步骤 1：</b>安装 APK；首次启动会校验完整性与版本号。</p>
    <p><b>步骤 2：</b>进入后首页显示「资源包」入口，可查看章节资源大小与下载状态。</p>
    <p><b>步骤 3：</b>首次进入章节时自动下载对应资源包（需网络）；已下载资源离线可用。</p>
    <p><b>提示：</b>移动端建议预留 500MB 空间；下载中断后重新进入会续传并校验哈希。</p>` },
  { h: '二十二、Web 版与官网', body: `
    <p>访问 <code>www.seange.cn</code> 可查看官网介绍、玩法说明、更新记录与下载入口。</p>
    <p>点击「免费开始 Web 体验」进入网页版：无需注册、无需安装，完整第一章可玩；画质会按设备自动下调。</p>
    <p>网页版与桌面版共用课节数据，但不读取本地桌面存档。</p>` },
  { h: '二十三、操作与键位', body: `
    <p><b>移动：</b>WASD；<b>奔跑：</b>Shift；<b>跳跃：</b>空格。</p>
    <p><b>视角：</b>鼠标拖动；<b>切换视角：</b>V（第一/第三人称）；<b>大地图：</b>M；<b>返回教学：</b>Esc。</p>
    <p><b>任务与仪表：</b>[ 任务、] 仪表；<b>鹰眼透视：</b>街区内点击对应按钮。</p>
    <p>教学面板内可全程使用键盘 Tab 切换控件、Enter 确认，答题支持数字键 1–3 选择。</p>` },
  { h: '二十四、课节七段：任务与观察', body: `
    <p><b>任务简报：</b>展示本课目标、场景与一段短剧情；可点「朗读本段」播放语音。</p>
    <p><b>观察现象：</b>给出原理示意图与自测题。示意图为原创 SVG，含标注与数值，离线可显示。</p>
    <p>观察段的答题用于建立直觉，不要求计算；答错会给出原因并允许重试。</p>` },
  { h: '二十五、课节七段：学习与演练', body: `
    <p><b>学习原理：</b>文字讲解 + 公式 + 仿真组件入口（如万用表、串联回路、PWM、IDE）。</p>
    <p><b>动手演练：</b>仿真检查档位、接线、量程与读数；提交后给出逐项通过/失败原因。</p>
    <p>仿真为教学等效模型，数值可解释、可复核；真实接线仍需断电并核对开发板资料。</p>` },
  { h: '二十六、课节七段：校验与档案', body: `
    <p><b>校验证据：</b>汇总检查项与证据条数；未达阈值时提示补做。</p>
    <p><b>迁移应用：</b>用新场景检验结论（数值或选择），防止只背答案。</p>
    <p><b>提交档案：</b>写入知识点状态与证据记录；完成后显示掌握、经验与下一步建议。</p>` },
  { h: '二十七、故障排查清单', body: `
    <p><b>画面黑屏/卡住：</b>确认显卡驱动与 WebGL2 支持；桌面版可尝试窗口模式启动。</p>
    <p><b>启动画面停住：</b>关闭其他占用显卡的程序；首次启动需要编译着色器。</p>
    <p><b>没有声音：</b>Web 版需先点击页面；检查系统输出设备与游戏内静音开关。</p>
    <p><b>课节无法开始：</b>查看星图详情中的前置课节是否完成；诊断结果也可能影响推荐顺序。</p>
    <p><b>进度异常：</b>确认未清理浏览器数据；可在档案页导出记录后反馈。</p>` },
  { h: '二十八、开发与验证说明', body: `
    <p>本软件基于 Web 技术栈构建，桌面版使用 Electron 封装，移动版使用 Capacitor 封装。</p>
    <p>开发流程包含：单元测试（400+ 项）、端到端测试（67 项）、构建校验与课节验收脚本（每节 6/6 检查）。所有课节在上线前需通过：解锁链、渲染、仿真、证明、完成、刷新六项检查。</p>
    <p>教学数据（知识图谱、课节 JSON）有独立 schema 校验，避免内容与代码不一致。</p>` },
  { h: '二十九、版权与使用范围', body: `
    <p>本软件及附带美术、文本、课程内容版权归开发者所有。未经许可，不得用于商业再发行、二次售卖或声称自主开发。</p>
    <p>课节知识内容参考公开教材与厂商数据手册，数值为教学等效简化，实际工程以厂商 PDK 与规范为准。</p>
    <p>本软件不含付费抽卡、付费变强与随机概率商品；如未来加入外观类付费，将在游戏内明确公示概率与价格。</p>
    <p>联系与授权：通过官网「关于本作」页面联系开发者。</p>` },
];

const manualHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 20mm 18mm; }
  body { font: 12px/1.9 'Microsoft YaHei', sans-serif; color: #1a1a1a; }
  h1 { font-size: 22px; letter-spacing: 2px; margin: 0 0 6px; }
  h2 { font-size: 15px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ccc; }
  .cover { page-break-after: always; padding-top: 60mm; text-align: center; }
  .cover p { color: #444; font-size: 13px; }
  .cover .meta { margin-top: 40mm; font-size: 12px; color: #555; }
  figure { margin: 8px 0 12px; page-break-inside: avoid; }
  figure img { width: 100%; border: 1px solid #ddd; border-radius: 4px; }
  figcaption { font-size: 11px; color: #666; margin-top: 4px; text-align: center; }
  p { margin: 6px 0; }
  code { background: #f2f2f2; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
</style></head><body>
<div class="cover">
  <h1>${SOFTWARE}</h1>
  <p>用户说明书</p>
  <p>（The Seventh Checksum）</p>
  <div class="meta">
    <p>软件版本：${VERSION}</p>
    <p>开发完成日期：2026 年 11 月 9 日</p>
    <p>文档版本：1.0</p>
  </div>
</div>
${manualPages
  .map(
    (p, i) => `<section class="page"><h2>${p.h}</h2>
  ${p.img ? `<figure><img src="${shot(p.img)}" alt="${p.cap}"><figcaption>${p.cap}</figcaption></figure>` : ''}
  ${p.body}
  <p style="color:#888;font-size:10px;margin-top:16px">${SOFTWARE} ${VERSION} · 用户说明书 · 第 ${i + 2} 页</p>
</section>`,
  )
  .join('\n')}
</body></html>`;

const manualHtmlPath = join(OUT, '_manual.html');
writeFileSync(manualHtmlPath, manualHtml);

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.goto('file:///' + sourceHtml.replaceAll('\\', '/'));
await page.pdf({ path: join(OUT, 'source-code-sample.pdf'), format: 'A4', printBackground: true });
await page.goto('file:///' + manualHtmlPath.replaceAll('\\', '/'));
await page.pdf({ path: join(OUT, 'user-manual.pdf'), format: 'A4', printBackground: true });
await browser.close();

const stat = (p) => statSync(join(OUT, p)).size;
console.log(JSON.stringify({ out: OUT, sourcePages: total, sourceBytes: stat('source-code-sample.pdf'), manualBytes: stat('user-manual.pdf') }));
