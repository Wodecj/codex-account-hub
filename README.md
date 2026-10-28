# Codex Account Hub

Windows 下用于创建和启动独立 Codex CLI 账号环境的桌面工具。独立开发，未复制 Cockpit Tools 源码；与 OpenAI 无官方关联。

## 功能与限制
创建独立 CODEX_HOME，调用本机 Codex CLI 进行登录、查看登录状态和启动。每个账号在各自终端运行；不会切换 Codex 桌面应用或 IDE 扩展，也不提供配额展示、自动切换或同步设置。凭据由 Codex 管理，可能存放在系统凭据存储或目录中；不要分享或提交数据目录。删除本软件不会自动删除用户数据。

## 使用
安装 Node.js LTS 和官方 Codex CLI：`npm install -g @openai/codex`。安装软件，添加账号，点击登录并在终端完成授权，再点击启动。终端默认工作目录取决于启动环境；运行 Codex 前可在终端使用 `cd` 切换项目目录。登录状态以终端输出为准。

## 开发和打包
安装 Node.js LTS 和 Git，打开 PowerShell：
```powershell
cd D:\aproject\codex-account-hub
npm install
npm start
npm run dist
```
安装包位于 release 文件夹。需要联网下载依赖；若 PowerShell 禁止脚本运行，可用 `npm.cmd`。在另一台 Windows 电脑上验证安装、登录和卸载。

## 发布
创建 GitHub 仓库并推送源码（不要提交 node_modules、release、账号数据或密钥），在 Releases 新建版本并上传安装包，写清系统要求、安装说明和版本变更。检查依赖的许可和安全更新。代码签名可帮助验证发布者，但未签名或新签名的安装程序可能触发 Windows SmartScreen。

## 许可证
本项目原创代码采用 MIT；Electron、electron-builder 和其他依赖遵循各自许可证。Cockpit Tools 的默认许可为 CC BY-NC-SA 4.0，商业使用需联系作者；此项目没有复制其源码或资源。Codex CLI 和 OpenAI 服务受各自条款约束。

## 自动更新准备
在 update-source.json 中填写自己的公开 GitHub 仓库 owner 和 repo。每次发布提高 package.json 的 version，运行 npm run dist，并将安装包和 release/latest.yml 以及生成的 blockmap 上传到对应 GitHub Release。未配置仓库时不检查更新。首次安装有更新功能的版本仍需运行安装包；后续版本会在启动时提示。自动更新前应测试全流程并配置 Windows 代码签名。不要上传账号数据或凭据。
