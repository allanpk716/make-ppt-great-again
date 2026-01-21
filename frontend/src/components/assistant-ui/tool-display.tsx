import { Wrench, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { ToolCallMessagePartProps } from '@assistant-ui/react';
import { cn } from '@/lib/utils';

/**
 * ToolCall 显示组件
 * 用于展示工具调用的信息，包括工具名称、输入参数和执行结果
 */
export const ToolDisplay = <TArgs = any, TResult = unknown>({
  toolName,
  args,
  result,
  status,
}: ToolCallMessagePartProps<TArgs, TResult>) => {
  const formatJson = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  // 改进状态判断
  const getStatus = (): 'running' | 'complete' | 'error' => {
    if (status?.type === 'running') return 'running';
    if (status?.type === 'incomplete' && status.reason === 'error') return 'error';
    if (status?.type === 'requires-action') return 'running';
    return 'complete';
  };

  const currentStatus = getStatus();

  // 状态样式映射
  const statusConfig = {
    running: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: '执行中...',
      className: 'text-blue-600',
      bgClassName: 'bg-blue-50',
    },
    complete: {
      icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      text: '完成',
      className: 'text-green-600',
      bgClassName: 'bg-green-50',
    },
    error: {
      icon: <XCircle className="h-4 w-4 text-red-600" />,
      text: '失败',
      className: 'text-red-600',
      bgClassName: 'bg-red-50',
    },
  };

  const config = statusConfig[currentStatus];

  return (
    <div className="my-2 rounded-lg border border-muted bg-muted/50 p-3 transition-colors hover:bg-muted/70">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Wrench className="h-4 w-4" />
        <span className="font-mono">{toolName}</span>

        {/* 状态指示器 */}
        {currentStatus === 'running' && (
          <div className={cn('ml-auto flex items-center gap-1 text-xs', config.className)}>
            {config.icon}
            <span>{config.text}</span>
          </div>
        )}

        {currentStatus !== 'running' && (
          <div className="ml-auto">
            {config.icon}
          </div>
        )}
      </div>

      {/* 输入参数 */}
      {args && (
        <details className="mt-2 group/details">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
            输入参数
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-xs">
            {formatJson(args)}
          </pre>
        </details>
      )}

      {/* 输出结果 */}
      {result !== undefined && (
        <details className="mt-2 group/details" open={currentStatus === 'error'}>
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
            {currentStatus === 'error' ? '错误信息' : '输出结果'}
          </summary>
          <pre
            className={cn(
              'mt-2 overflow-x-auto rounded p-2 text-xs',
              currentStatus === 'error'
                ? 'bg-red-50 text-red-900'
                : 'bg-background'
            )}
          >
            {formatJson(result)}
          </pre>
        </details>
      )}
    </div>
  );
};
