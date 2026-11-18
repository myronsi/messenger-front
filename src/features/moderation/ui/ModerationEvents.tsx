import { useEffect } from 'react';
import { realtime } from '@/shared/api/realtime';
import { reportAccountRestricted, subscribeAccountRestricted } from '@/shared/api/accountRestriction';
import { useAppDispatch } from '@/shared/hooks/redux';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { toast } from '@/shared/ui/sonner';
import { moderationApi } from '../api/moderationApi';
import { restrictionToast } from '../model/accountStatus';

interface ModerationEventsProps {
  onOpenDetails: () => void;
}

export const ModerationEvents = ({ onOpenDetails }: ModerationEventsProps) => {
  const dispatch = useAppDispatch();
  const t = useLanguage().translations.moderation;

  useEffect(() => realtime.subscribe({ onEvent: (event) => {
    if (event.type === 'account_status') {
      void dispatch(moderationApi.util.upsertQueryData('getAccountStatus', undefined, event.data));
    } else if (event.type === 'error' && event.data.code === 'account_restricted') {
      reportAccountRestricted(event.data.restriction ?? null);
    }
  } }), [dispatch]);

  useEffect(() => subscribeAccountRestricted(({ restriction }) => {
    const { title, description } = restrictionToast(restriction, t);
    toast(title, { id: `account-restricted:${restriction ?? 'any'}`, description, action: { label: t.bannerAction, onClick: onOpenDetails } });
    dispatch(moderationApi.util.invalidateTags([{ type: 'Moderation', id: 'me' }]));
  }), [dispatch, onOpenDetails, t]);

  return null;
};
