# Assistant-UI 集成文档

## 概述

本项目使用 [assistant-ui](https://github.com/assistant-ui/assistant-ui) 组件库实现类似 ChatGPT 的聊天界面。

## 核心组件

### AssistantUIAdapter
消息转换适配器，将 WebSocket 消息转换为 assistant-ui 兼容格式。

位置: `frontend/src/components/AssistantUIAdapter/index.tsx`

### Message Converter
消息格式转换工具。

位置: `frontend/src/lib/messageConverter.ts`

### Thread & Message Components
聊天界面核心组件。

位置: `frontend/src/components/assistant-ui/`

## 数据流

```
WebSocket Message
  ↓
DisplayMessage (当前格式)
  ↓
convertToAssistantMessages()
  ↓
AssistantMessage (assistant-ui 格式)
  ↓
Thread/Message Components
  ↓
UI 渲染
```

## 消息类型映射

| DisplayMessage.type | AssistantMessagePart.type |
|---------------------|---------------------------|
| user                | role: "user"              |
| text                | type: "text"              |
| thinking            | type: "reasoning"         |
| tool_call           | type: "tool-use"          |
| tool_result         | type: "tool-result"       |
| error               | type: "text" (带错误信息)  |

## 自定义样式

### 消息气泡颜色

- 用户消息: `bg-blue-600 text-white`
- AI 消息: `bg-slate-100 text-slate-900`

修改位置: `frontend/src/components/assistant-ui/thread.tsx`

### Thinking 样式

修改位置: `frontend/src/components/assistant-ui/reasoning.tsx`

### Tool 样式

修改位置: `frontend/src/components/assistant-ui/tool-display.tsx`

## 调试

### 启用详细日志

在浏览器控制台:
```javascript
localStorage.setItem('debug', 'assistant-ui:*')
```

### 查看转换后的消息

在 CopilotPanel 中添加:
```tsx
console.log('Converted messages:', assistantMessages)
```

## 依赖版本

```json
{
  "@assistant-ui/react": "^0.11.56",
  "@assistant-ui/react-markdown": "^0.11.9",
  "remark-gfm": "^4.0.1"
}
```
