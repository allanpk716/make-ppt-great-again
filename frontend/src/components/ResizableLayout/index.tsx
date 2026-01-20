import React from 'react';
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext';
import { Workspace } from '@/components/Workspace';
import { ResizableHandle } from './ResizableHandle';
import { CopilotPanel } from '@/components/CopilotPanel';

const ResizableContent: React.FC = () => {
  const { chatWidth } = useLayout();

  return (
    <div className="flex-1 flex overflow-hidden">
      <Workspace />
      <ResizableHandle />
      <CopilotPanel style={{ width: `${chatWidth}px` }} />
    </div>
  );
};

export const ResizableLayout: React.FC = () => {
  return (
    <LayoutProvider>
      <ResizableContent />
    </LayoutProvider>
  );
};
