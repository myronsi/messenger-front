import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface DeleteMessageChoiceModalProps {
  isMessageSender: boolean;
  onDeleteForMe: () => void | Promise<void>;
  onDeleteForAll: () => void;
  onCancel: () => void;
}

const DeleteMessageChoiceModal: React.FC<DeleteMessageChoiceModalProps> = ({
  isMessageSender,
  onDeleteForMe,
  onDeleteForAll,
  onCancel,
}) => {
  const { translations } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteForMe = async () => {
    setIsLoading(true);
    try {
      await onDeleteForMe();
    } catch (error) {
      console.error('Error in handleDeleteForMe:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteForAll = () => {
    setIsLoading(true);
    try {
      onDeleteForAll();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-lg p-6 w-96 max-w-[90%] animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {translations.deleteMessage || 'Delete Message'}
          </h2>
          <button
            onClick={onCancel}
            aria-label={translations.close || 'Close'}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          {translations.chooseDeleteOption || 'Choose how you would like to delete this message'}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleDeleteForMe}
            disabled={isLoading}
            className="flex items-center justify-start px-4 py-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <Trash2 className="w-4 h-4 mr-3 text-destructive flex-shrink-0" />
            <div>
              <div className="text-sm font-medium">
                {translations.deleteForMe || 'Delete for me'}
              </div>
              <div className="text-xs text-muted-foreground">
                {translations.onlyYouWillSeeRemoved || 'Only you will see it removed'}
              </div>
            </div>
          </button>

          {isMessageSender && (
            <button
              onClick={handleDeleteForAll}
              disabled={isLoading}
              className="flex items-center justify-start px-4 py-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <Trash2 className="w-4 h-4 mr-3 text-destructive flex-shrink-0" />
              <div>
                <div className="text-sm font-medium">
                  {translations.deleteForEveryone || 'Delete for everyone'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {translations.everyoneWillSeeRemoved || 'Everyone will see it removed'}
                </div>
              </div>
            </button>
          )}
        </div>

        <button
          onClick={onCancel}
          disabled={isLoading}
          className="w-full mt-4 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {translations.cancel || 'Cancel'}
        </button>
      </div>
    </div>
  );
};

export default DeleteMessageChoiceModal;
