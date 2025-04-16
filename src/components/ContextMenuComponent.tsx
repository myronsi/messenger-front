
import React, { forwardRef } from 'react';
import { Edit, Trash2, Copy, Reply } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  isMine: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onReply: () => void;
}

const ContextMenuComponent = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ x, y, isMine, onEdit, onDelete, onCopy, onReply }, ref) => {
    return (
      <div
        ref={ref}
        className="fixed bg-popover border border-border shadow-lg rounded-md py-1 z-50 animate-fade-in"
        style={{ top: y, left: x }}
      >
        {isMine && (
          <>
            <button
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              Редактировать
            </button>
            <button
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </button>
          </>
        )}
        <button
          className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={onCopy}
        >
          <Copy className="w-4 h-4 mr-2" />
          Скопировать
        </button>
        <button
          className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={onReply}
        >
          <Reply className="w-4 h-4 mr-2" />
          Ответить
        </button>
      </div>
    );
  }
);

export default ContextMenuComponent;
