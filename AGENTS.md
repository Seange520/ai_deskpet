# SparkMate 协作与版本管理约定

- 使用 React、Tailwind CSS、Framer Motion、Lucide React。所有视觉素材由 CSS、SVG 或 React 绘制。
- 完成阶段功能或严重 Bug 修复后主动提醒用户测试；测试通过后自动暂存并提交相关代码。
- 提交遵守 Conventional Commits：feat、fix、docs、style；初始化与工具配置可用 chore。
- 核心功能完成后维护 README：Shield 徽章、项目简介、技术栈、运行指南、Roadmap。
- 用户提供空 GitHub 仓库后再配置远程与推送，优先已有授权或 GitHub CLI 浏览器授权。不要在文件中保存凭据。
- 后续用 Issues 管理想法，版本稳定且用户确认发布时再发布 v1.0.0。
- 不主动发布、推送或创建远程仓库。保留用户已有改动，禁止未经授权重写 Git 历史。
