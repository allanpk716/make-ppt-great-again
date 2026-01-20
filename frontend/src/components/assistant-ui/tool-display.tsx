import { Wrench, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolDisplayProps {
  name: string;
  input?: any;
  output?: any;
  status?: "running" | "complete" | "error";
}

export const ToolDisplay: React.FC<ToolDisplayProps> = ({
  name,
  input,
  output,
  status = "complete",
}) => {
  const formatJson = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <div className="my-2 rounded-lg border border-muted bg-muted/50 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Wrench className="h-4 w-4" />
        <span className="font-mono">{name}</span>
        {status === "running" && (
          <span className="ml-auto text-xs text-muted-foreground">
            执行中...
          </span>
        )}
        {status === "complete" && (
          <CheckCircle className="ml-auto h-4 w-4 text-green-600" />
        )}
        {status === "error" && (
          <XCircle className="ml-auto h-4 w-4 text-red-600" />
        )}
      </div>

      {input && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            输入参数
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-xs">
            {formatJson(input)}
          </pre>
        </details>
      )}

      {output && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            输出结果
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-xs">
            {formatJson(output)}
          </pre>
        </details>
      )}
    </div>
  );
};
