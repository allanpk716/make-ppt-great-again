'use client';

import { memo, type FC, type PropsWithChildren } from 'react';
import {
  useAssistantState,
  type ReasoningMessagePartComponent,
  type ReasoningGroupComponent,
} from '@assistant-ui/react';
import { Brain, ChevronDown } from 'lucide-react';
import { MarkdownText } from './markdown-text';
import { cn } from '@/lib/utils';

const ReasoningRoot: FC<PropsWithChildren<{ className?: string }>> = ({ className, children }) => {
  return <details className={cn('mb-4 w-full', className)}>{children}</details>;
};

const ReasoningTrigger: FC<{ active: boolean; className?: string }> = ({ active, className }) => (
  <summary
    className={cn(
      'group/trigger -mb-2 flex cursor-pointer items-center gap-2 py-2 text-muted-foreground text-sm transition-colors hover:text-foreground',
      'select-none',
      className
    )}
  >
    <Brain className="h-4 w-4 shrink-0" />
    <span className="relative inline-block leading-none">
      <span>思考过程</span>
      {active && (
        <span
          className="absolute inset-0 animate-pulse opacity-70"
          aria-hidden
        >
          思考过程
        </span>
      )}
    </span>
    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
  </summary>
);

const ReasoningContent: FC<
  PropsWithChildren<{
    className?: string;
    'aria-busy'?: boolean;
  }>
> = ({ className, children, 'aria-busy': ariaBusy }) => (
  <div
    className={cn(
      'relative overflow-hidden text-muted-foreground text-sm pl-6 leading-relaxed',
      className
    )}
    aria-busy={ariaBusy}
  >
    {children}
  </div>
);

const ReasoningImpl: ReasoningMessagePartComponent = () => <MarkdownText />;

const ReasoningGroupImpl: ReasoningGroupComponent = ({ children, startIndex, endIndex }) => {
  const isReasoningStreaming = useAssistantState(({ message }) => {
    if (message.status?.type !== 'running') return false;
    const lastIndex = message.parts.length - 1;
    if (lastIndex < 0) return false;
    // ReasoningGroup 组件只包含 reasoning 类型的 parts，无需额外类型检查
    return lastIndex >= startIndex && lastIndex <= endIndex;
  });

  return (
    <ReasoningRoot>
      <ReasoningTrigger active={isReasoningStreaming} />
      <ReasoningContent aria-busy={isReasoningStreaming}>{children}</ReasoningContent>
    </ReasoningRoot>
  );
};

export const Reasoning = memo(ReasoningImpl);
Reasoning.displayName = 'Reasoning';

export const ReasoningGroup = memo(ReasoningGroupImpl);
ReasoningGroup.displayName = 'ReasoningGroup';
