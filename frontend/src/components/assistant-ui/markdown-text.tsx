"use client";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import {
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
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

// 复制功能 hook
const useCopyToClipboard = ({ copiedDuration = 2000 } = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };

  return { isCopied, copyToClipboard };
};

// 代码头部组件
const CodeHeader = ({ language, code }: { language?: string; code?: string }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  if (!code) return null;

  return (
    <div className="flex items-center justify-between rounded-t-lg bg-muted px-4 py-2">
      <span className="text-xs text-muted-foreground">
        {language || "code"}
      </span>
      <button
        onClick={onCopy}
        className="rounded p-1 hover:bg-muted-foreground/20"
      >
        {isCopied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};

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
  pre: ({ className, children, ...props }) => {
    // 从子元素中提取代码
    const codeElement = (children as React.ReactElement)?.props?.children;
    const codeContent = typeof codeElement === 'string' ? codeElement : '';
    const language = (children as React.ReactElement)?.props?.className?.replace('language-', '') || 'code';

    return (
      <div className="mb-2">
        <CodeHeader code={codeContent} language={language} />
        <pre
          className={cn(
            "overflow-x-auto rounded-lg bg-muted p-4 rounded-t-none",
            className
          )}
          {...props}
        >
          {children}
        </pre>
      </div>
    );
  },
});
