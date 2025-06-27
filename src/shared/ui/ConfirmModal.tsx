
import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isError?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  isError = false,
}) => {
  const { translations } = useLanguage();

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="relative bg-card w-full max-w-lg p-6 rounded-lg shadow-lg border border-border">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{translations.close}</span>
        </button>
        <h3 className="text-lg font-semibold leading-none tracking-tight mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{message}</p>
        <div className="flex justify-end space-x-2">
          {!isError && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors"
            >
              {cancelText || translations.cancel}
            </button>
          )}
          <button
            onClick={isError ? onCancel : onConfirm}
            className={`px-4 py-2 rounded-md transition-colors ${
              isError
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isError ? translations.close : confirmText || translations.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
