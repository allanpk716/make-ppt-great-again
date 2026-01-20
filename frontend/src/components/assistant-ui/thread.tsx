"use client";

import { ThreadPrimitive } from "@assistant-ui/react";
import { MessagePrimitive } from "@assistant-ui/react";
import { Reasoning, ReasoningGroup } from "./reasoning";
import { MarkdownText } from "./markdown-text";
import { ToolDisplay } from "./tool-display";

export const AssistantThread = () => {
  return (
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Viewport>
        <ThreadPrimitive.Messages
          components={{
            UserMessage: () => (
              <MessagePrimitive.Root className="flex justify-end">
                <div className="max-w-[75%] rounded-lg bg-blue-600 p-3 text-white">
                  <MessagePrimitive.Parts
                    components={{
                      Reasoning: Reasoning,
                      ReasoningGroup: ReasoningGroup,
                      Text: MarkdownText,
                    }}
                  />
                </div>
              </MessagePrimitive.Root>
            ),
            AssistantMessage: () => (
              <MessagePrimitive.Root className="flex justify-start">
                <div className="max-w-[75%] rounded-lg bg-slate-100 p-3 text-slate-900">
                  <MessagePrimitive.Parts
                    components={{
                      Reasoning: Reasoning,
                      ReasoningGroup: ReasoningGroup,
                      Text: MarkdownText,
                      tools: {
                        Fallback: ToolDisplay,
                      },
                    }}
                  />
                </div>
              </MessagePrimitive.Root>
            ),
          }}
        />
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};
