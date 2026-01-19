# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Claude 协作规则

## 语言与交互

请始终使用中文回答问题和进行沟通。

## 开发环境

当前开发系统为 Windows。在执行命令、编写路径引用时需考虑 Windows 环境的特性（如使用反斜杠作为路径分隔符、注意命令格式的差异等）。

## 脚本开发规范

编辑 BAT 脚本时，脚本内容中不要包含中文字符。这可以避免编码问题导致的脚本执行失败。

当需要修复脚本时，优先在原有脚本基础上进行修改，除非必要，不要创建新的脚本文件。

## 开发调试命令

- **调试启动后端**: `npm run dev:backend`
- **调试启动前端**: `npm run dev:frontend`

## 前后端测试

对于前后端分离开发的项目，请使用浏览器（dev-browser 技能）进行测试，验证前后端的通信和交互操作。

调试前端 web 页面时，必须使用 dev-browser 技能。

## 图片处理

使用 MCP 或 Agent 的截图识别能力时，在提交到识别服务之前，请确保图片尺寸小于 1000x1000 像素。

## 项目文档

项目的计划文件应放置在 `docs\plans` 目录中。

---

## 项目信息

这是一个新创建的项目，具体架构和开发命令将在项目开发过程中补充。

- **远程仓库**: `git@github.com:allanpk716/make-ppt-great-again.git`
- **已启用插件**: dev-browser（用于前后端交互测试）
