import React from 'react';
import { BrainCircuit } from 'lucide-react';

interface ThinkingViewProps {
  content: string;
}

export const ThinkingView: React.FC<ThinkingViewProps> = ({ content }) => (
  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
    <BrainCircuit className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-amber-700 mb-1">思考中</div>
      <div className="text-sm text-amber-900 break-words">{content}</div>
    </div>
  </div>
);
