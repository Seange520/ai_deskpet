# Codex 派活与验收手册 V1

> 主策划拍板后，按本文派发 4 张任务卡。所有命令在 `D:\deepseek_file\ai_deskpet` 下执行。

## 一、派活前置检查

```powershell
# 1) 仓库干净
git status --porcelain    # 应为空

# 2) 记录基线
git log --oneline -1

# 3) Codex 可用
& "C:\Users\Senage\AppData\Local\OpenAI\Codex\bin\f71a721e0e6193a9\codex.exe" --version
# codex-cli 0.167.0-alpha.3.2
```

## 二、派活命令

```powershell
cd D:\deepseek_file\ai_deskpet
pwsh -File D:\deepseek_file\work\handoff\RUN_CODEX_TASK.ps1 -Task 01-render-prototype   # 或 02-ui-system / 03-boot-no-entry / 04-world-slice
```

- Codex 在 `-s workspace-write` 下**只能写仓库内文件**；所有证据必须落 `D:\deepseek_file\ai_deskpet\work\acceptance\<task>\`。
- 每次只派一张卡；完成→我们验收→合并→再派下一张（避免并发冲突）。

## 三、Codex 任务卡通用要求（已写入各卡）

1. 改动文件清单（新增/修改/删除）。
2. 截图或录屏：至少 4 张，覆盖白天/夜晚、桌面/手机（如适用）。
3. 性能数据：draw call、三角面、fps（桌面 full quality）、内存。
4. `0 console error`；`npm run build` 通过；E2E 67 不破；单测 457 不破。
5. 不改旧入口兼容性（`?quality=` 旧路径仍可用，直到验收通过后由我们删除）。

## 四、验收流程（我执行）

```powershell
# 1) 构建
$env:TEMP='D:\deepseek_file\work\tmp'; $env:TMP='D:\deepseek_file\work\tmp'
cmd /d /c "D:\Node\npm.cmd run build"

# 2) 单测 + E2E
node --test "tests/*.unit.mjs"
cmd /d /c "D:\Node\npx.cmd playwright test --reporter=list"

# 3) 独立验收脚本（每次任务新增一个 check-<task>.mjs）
node scripts/check-<task>.mjs

# 4) 人工看截图 + 五维评分（视觉/叙事/性能/教学/可接受性，每项 ≥4.5 才通过）
```

## 五、合并策略

- Codex 产物在 feature 分支或工作区；验收通过后由我提交（`git -c user.name="SparkMate Automation" ...`），推送用代理 `-c http.proxy=http://127.0.0.1:7897`。
- 不通过：退回 Codex，附「失败证据 + 具体断言/截图位置 + 修复方向」，不重跑整卡。

## 六、每张卡的重点验收（摘要）

| 卡 | 必看 | 一句话通过标准 |
| --- | --- | --- |
| 01 渲染原型 | 4 张对比截图 + 性能表 | 白天/夜晚都「像一款幻想游戏」，手机 ≥25fps |
| 02 UI 系统 | HUD 布局 + 5 面板 + 键位 | 1920/1440/768/390 无溢出，全键盘可达 |
| 03 无按钮启动 | 启动录屏 + 离线兜底 | 8s 内落地可操作，无「进入」按钮 |
| 04 世界切片 | 主城/野外/秘境截图 + 1 委托闭环 | 可完成 1 节课，往返无卡顿 |

## 七、风险预案

- Codex 卡住/超时：中断（`Ctrl+C`），保留其改动到 stash，人工接手关键部分。
- 产物污染旧代码：`git diff --stat` 超出任务卡范围即退回。
- 性能不达标：要求 Codex 先出「低配档」参数，再迭代。
