import { Wrench, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { ToolCallMessagePartProps } from '@assistant-ui/react';

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

  // 判断状态
  const getStatus = (): 'running' | 'complete' | 'error' => {
    if (status?.type === 'running') return 'running';
    if (status?.type === 'incomplete' && status.reason === 'error') return 'error';
    if (status?.type === 'requires-action') return 'running'; // 需要用户操作
    return 'complete';
  };

  const currentStatus = getStatus();

  return (
    <div className="my-2 rounded-lg border border-muted bg-muted/50 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Wrench className="h-4 w-4" />
        <span className="font-mono">{toolName}</span>
        {currentStatus === 'running' && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            执行中...
          </span>
        )}
        {currentStatus === 'complete' && <CheckCircle className="ml-auto h-4 w-4 text-green-600" />}
        {currentStatus === 'error' && <XCircle className="ml-auto h-4 w-4 text-red-600" />}
      </div>

      {args && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            输入参数
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-xs">
            {formatJson(args)}
          </pre>
        </details>
      )}

      {result !== undefined && (
        <details className="mt-2" open={currentStatus === 'error'}>
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            {currentStatus === 'error' ? '错误信息' : '输出结果'}
          </summary>
          <pre
            className={`mt-2 overflow-x-auto rounded p-2 text-xs ${
              currentStatus === 'error' ? 'bg-red-50 text-red-900' : 'bg-background'
            }`}
          >
            {formatJson(result)}
          </pre>
        </details>
      )}
    </div>
  );
};
