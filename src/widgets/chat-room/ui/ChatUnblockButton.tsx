import { asApiError } from '@/shared/lib/apiError';
import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useUnblockUserMutation } from '@/entities/user';

interface ChatUnblockButtonProps {
  username: string;
  onError: (message: string) => void;
}

const ChatUnblockButton: React.FC<ChatUnblockButtonProps> = ({ username, onError }) => {
  const { translations } = useLanguage();
  const [unblockUser, { isLoading }] = useUnblockUserMutation();
  const handleUnblock = async () => {
    if (isLoading) return;
    try {
      await unblockUser({ username }).unwrap();
    } catch (caught) {
      const error = asApiError(caught);
      onError(error?.data?.detail || 'Failed to unblock user');
    }
  };

  return (
    <div className="p-4 border-t border-border">
      <button
        onClick={handleUnblock}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary p-3 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {translations.unblock || 'Unblock'}
      </button>
    </div>
  );
};

export default ChatUnblockButton;
