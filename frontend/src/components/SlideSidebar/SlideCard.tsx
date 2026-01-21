import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePPTStore } from '@/stores/pptStore';

interface SlideCardProps {
  slide: {
    id: string;
    displayIndex: number;
    meta: {
      summary: string;
      displayIndex: number;
      createdAt: string;
      updatedAt: string;
    };
  };
  onClick?: (id: string) => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
}

export const SlideCard: React.FC<SlideCardProps> = ({
  slide,
  onClick,
  onDelete,
  isSelected = false,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setTimeout(() => {
      onDelete?.(slide.id);
      setIsDeleting(false);
    }, 200);
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        border rounded-lg p-3 transition-all duration-200 cursor-move
        ${
          isSelected
            ? 'bg-blue-50 border-blue-400 border-2'
            : 'bg-white border-gray-200 hover:bg-gray-50'
        }
        ${isDragging ? 'shadow-md' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 mr-2">
          <div
            {...attributes}
            {...listeners}
            className="drag-handle text-gray-400 hover:text-gray-600"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-2 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-14a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-2 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm2 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
            </svg>
          </div>
          <span
            className={`ml-2 flex-1 text-sm cursor-pointer ${
              isSelected
                ? 'font-semibold text-blue-600'
                : 'font-normal text-gray-700 hover:text-blue-500'
            }`}
            onClick={() => onClick?.(slide.id)}
          >
            {slide.meta.summary || `幻灯片 ${slide.displayIndex + 1}`}
          </span>
        </div>
        <div className="flex items-center">
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 transition-opacity cursor-pointer"
            style={{ opacity: isDeleting ? 0.5 : 1 }}
            aria-label="删除幻灯片"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
