import React from 'react';
import { Wrench, CheckCircle } from 'lucide-react';

interface ToolCallViewProps {
  name: string;
  input?: any;
  result?: any;
}

export const ToolCallView: React.FC<ToolCallViewProps> = ({ name, input, result }) => (
  <div className="border rounded-lg overflow-hidden">
    <div className="flex items-center gap-2 p-2 bg-slate-100">
      {result ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : (
        <Wrench className="w-4 h-4 text-slate-600" />
      )}
      <span className="text-sm font-medium">{name}</span>
    </div>
    {input && (
      <div className="p-2 bg-blue-50">
        <div className="text-xs text-blue-600 mb-1">输入</div>
        <pre className="text-xs text-blue-900 overflow-auto max-h-32">
          {JSON.stringify(input, null, 2)}
        </pre>
      </div>
    )}
    {result && (
      <div className="p-2 bg-green-50">
        <div className="text-xs text-green-600 mb-1">结果</div>
        <pre className="text-xs text-green-900 overflow-auto max-h-32">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    )}
  </div>
);
