"use client";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import {
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import { cn } from "@/lib/utils";

const MarkdownTextImpl = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm max-w-none dark:prose-invert"
      components={defaultComponents}
    />
  );
};

export const MarkdownText = () => <MarkdownTextImpl />;

// 默认 Markdown 组件
const defaultComponents = memoizeMarkdownComponents({
  p: ({ className, ...props }) => (
    <p className={cn("mb-2 last:mb-0", className)} {...props} />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(
          !isCodeBlock && "rounded bg-muted px-1 py-0.5 font-mono text-sm",
          className
        )}
        {...props}
      />
    );
  },
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "mb-2 overflow-x-auto rounded-lg bg-muted p-4",
        className
      )}
      {...props}
    />
  ),
});
