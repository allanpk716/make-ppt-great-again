# Assistant-UI 集成 - 发布说明

## 新功能

- ✨ ChatGPT 风格聊天界面
- ✨ 流式回复实时显示
- ✨ Thinking 过程可折叠展示
- ✨ Tool Calling 可视化
- ✨ Markdown 格式支持（代码高亮、GFM）

## 改进

- 🎨 用户消息右对齐，蓝色背景
- 🎨 AI 消息左对齐，灰色背景
- 🎨 平滑的流式打字效果
- 🔧 代码块支持复制功能
- 🔧 工具调用状态指示器

## 技术变更

### 新增依赖

```json
{
  "@assistant-ui/react": "^0.11.56",
  "@assistant-ui/react-markdown": "^0.11.9",
  "remark-gfm": "^4.0.1"
}
```

### 新增组件

- `frontend/src/components/assistant-ui/` - assistant-ui 核心组件
- `frontend/src/components/AssistantUIAdapter/` - 消息转换适配器
- `frontend/src/lib/messageConverter.ts` - 消息格式转换工具

### 移除组件

- `frontend/src/components/CopilotPanel/StreamMessageList.tsx` → `.backup/`
- `frontend/src/components/CopilotPanel/ThinkingView.tsx` → `.backup/`
- `frontend/src/components/CopilotPanel/ToolCallView.tsx` → `.backup/`

## Bug 修复

- 🐛 修复 system 消息被错误显示为 JSON 文本的问题
- 🐛 修复 TypeScript 类型错误 (parseRaw 返回 null 处理)

## 文档

- 📚 新增 `docs/assistant-ui-integration.md` 集成文档
- 📚 更新 `CLAUDE.md` 添加 UI 组件库说明

## 测试

- ✅ WebSocket 连接测试通过
- ✅ 用户消息发送和显示测试通过
- ✅ AI 流式响应测试通过
- ✅ Tool Calling 显示测试通过

## 构建信息

- 构建状态: ✅ 成功
- Bundle 大小: 791.86 kB (gzip: 236.85 kB)
- CSS 大小: 15.58 kB (gzip: 3.87 kB)

## 未来优化方向

- 消息虚拟化（大量历史消息时）
- 消息防抖（频繁更新时）
- 代码分割优化
