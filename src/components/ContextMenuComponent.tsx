import React, { forwardRef, useState, useEffect } from 'react';
import { Edit, Trash2, Copy, Reply } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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
    const { translations } = useLanguage();
    const [adjustedX, setAdjustedX] = useState(x);
    const [adjustedY, setAdjustedY] = useState(y);
    const [isAnimated, setIsAnimated] = useState(false);
    const [transformOrigin, setTransformOrigin] = useState('top left');

    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        const menu = ref.current;
        const menuWidth = menu.clientWidth;
        const menuHeight = menu.clientHeight;

        // Координаты углов меню
        const corners = {
          topLeft: { x: adjustedX, y: adjustedY },
          topRight: { x: adjustedX + menuWidth, y: adjustedY },
          bottomLeft: { x: adjustedX, y: adjustedY + menuHeight },
          bottomRight: { x: adjustedX + menuWidth, y: adjustedY + menuHeight },
        };

        // Функция для вычисления расстояния
        const distance = (point1: { x: number; y: number }, point2: { x: number; y: number }) => {
          return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);
        };

        // Точка клика
        const clickPoint = { x, y };

        // Вычисление расстояний до каждого угла
        const distances = {
          topLeft: distance(clickPoint, corners.topLeft),
          topRight: distance(clickPoint, corners.topRight),
          bottomLeft: distance(clickPoint, corners.bottomLeft),
          bottomRight: distance(clickPoint, corners.bottomRight),
        };

        // Нахождение ближайшего угла
        const nearestCorner = Object.entries(distances).reduce((a, b) => (a[1] < b[1] ? a : b))[0];

        // Установка transformOrigin
        switch (nearestCorner) {
          case 'topLeft':
            setTransformOrigin('top left');
            break;
          case 'topRight':
            setTransformOrigin('top right');
            break;
          case 'bottomLeft':
            setTransformOrigin('bottom left');
            break;
          case 'bottomRight':
            setTransformOrigin('bottom right');
            break;
        }

        // Корректировка позиции меню
        let newX = x;
        let newY = y;

        if (x + menuWidth > window.innerWidth) {
          newX = Math.max(0, x - menuWidth);
        }
        if (y + menuHeight > window.innerHeight) {
          newY = Math.max(0, y - menuHeight);
        }

        setAdjustedX(newX);
        setAdjustedY(newY);
      }
    }, [x, y, ref]);

    useEffect(() => {
      setTimeout(() => setIsAnimated(true), 0);
    }, []);

    return (
      <div
        ref={ref}
        className="fixed bg-popover border border-border shadow-lg rounded-md py-1 z-50"
        style={{
          top: adjustedY,
          left: adjustedX,
          minWidth: '200px',
          width: '200px',
          transform: isAnimated ? 'scale(1)' : 'scale(0)',
          opacity: isAnimated ? 1 : 0,
          transition: 'transform 0.2s, opacity 0.2s',
          transformOrigin: transformOrigin,
        }}
      >
        {isMine && (
          <>
            <button
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              <span className="truncate">{translations.editMessage}</span>
            </button>
            <button
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span className="truncate">{translations.deleteMessage}</span>
            </button>
          </>
        )}
        <button
          className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={onCopy}
        >
          <Copy className="w-4 h-4 mr-2" />
          <span className="truncate">{translations.copy}</span>
        </button>
        <button
          className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={onReply}
        >
          <Reply className="w-4 h-4 mr-2" />
          <span className="truncate">{translations.replyToMessage}</span>
        </button>
      </div>
    );
  }
);

ContextMenuComponent.displayName = 'ContextMenuComponent';

export default ContextMenuComponent;
