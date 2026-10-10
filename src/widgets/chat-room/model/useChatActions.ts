import { apiUrl } from '@/shared/api/apiUrl';
import type { Translations } from '@/shared/contexts/LanguageContext';
import type { ModalState } from '@/entities/message';
import { authFetch } from '@/shared/auth/session';
import type { Id } from '@/shared/lib/ids';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface DeleteChatActionOptions {
  chatId: Id;
  translations: Translations;
  onBack: () => void;
  setModal: (modal: ModalState | null) => void;
}

// One-to-one specific: group chats are deleted through the group management hook instead.
export const createDeleteChatAction = ({ chatId, translations, onBack, setModal }: DeleteChatActionOptions) => () => {
  setModal({
    type: 'deleteChat',
    message: translations.deleteChatConfirmMessage || translations.deleteChatConfirm,
    consequences: translations.deleteChatConsequences || [
      'This chat will be removed from your chat list.',
      'You will lose access to this conversation history in the app.',
      'This does not block the user or change your privacy settings.',
    ],
    onConfirm: async () => {
      try {
        const response = await authFetch(apiUrl(`/chats/${encodeURIComponent(chatId)}`), { method: 'DELETE' });
        if (response.ok) onBack();
        else throw new Error(translations.errorDeleting);
      } catch {
        setModal({ type: 'error', message: translations.errorDeletingChat });
      }
    },
  });
};