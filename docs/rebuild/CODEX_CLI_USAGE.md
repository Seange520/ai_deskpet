# Codex CLI 接入说明（DSH 会话直连）

## 已确认可用

- 可执行文件（按优先级）：
  1. `C:\Users\Senage\AppData\Local\OpenAI\Codex\bin\f71a721e0e6193a9\codex.exe`
  2. `C:\Users\Senage\.codex\.sandbox-bin\codex.exe`
- 版本：`codex-cli 0.167.0-alpha.3.2`；认证：ChatGPT 账号（默认模型 `gpt-6.1-sol`，config.toml）。
- 非交互模式：`codex exec`，支持 `--cd`、`-s workspace-write`、`--skip-git-repo-check`、`-o` 输出最后消息、`-` 从 stdin 读 prompt。

## 已验证边界

- **可读仓库 + 写仓库内文件**：`-s workspace-write` 下成功创建 `codex-write-test.txt`。
- **不能写仓库外路径**：写 `D:\deepseek_file\work\tmp` 被拒（workspace 限制）→ 验收产物必须落仓库内 `work/` 或 `.codex-artifacts/`，再由 DSH 复制归档。
- 读取/引用本机绝对路径需在 prompt 里明确说明，或让 Codex 用 `--add-dir`（未验证）。
- 不会自动推送；提交/推送由 DSH 验收后执行。

## DSH 派活方式（示例）

```powershell
$codex = 'C:\Users\Senage\AppData\Local\OpenAI\Codex\bin\f71a721e0e6193a9\codex.exe'
$prompt = @'
按任务卡 D:\deepseek_file\work\handoff\CODEX_TASKS\01-render-prototype.md 执行。
只允许改仓库内文件；验收截图存到仓库 work/acceptance/render-r1/。
不要 git commit/push。完成后回复：改了哪些文件 + 运行了哪些命令 + 结果。
'@
$prompt | & $codex exec --cd 'D:\deepseek_file\ai_deskpet' -s workspace-write --skip-git-repo-check - 2>&1 | Tee-Object D:\deepseek_file\work\tmp\codex-task-01.log
```

## 分工红线

- Codex：大块功能实现（渲染/UI/启动流/世界切片），按任务卡交付分支/文件+截图+测试结果。
- DSH：验收（五维闸门）、集成、提交与推送、文档、红线检查（不抄原神资产）。
- 主策划：方向拍板与真机反馈。
