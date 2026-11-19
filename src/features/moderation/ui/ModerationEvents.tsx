import { useEffect, useRef } from 'react';
import { realtime } from '@/shared/api/realtime';
import { reportAccountRestricted, subscribeAccountRestricted } from '@/shared/api/accountRestriction';
import { useAppDispatch } from '@/shared/hooks/redux';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { toast } from '@/shared/ui/sonner';
import { moderationApi, useListReportOutcomesQuery, useMarkReportOutcomeReadMutation } from '../api/moderationApi';
import { outcomeNotice, restrictionToast } from '../model/accountStatus';

interface ModerationEventsProps {
  onOpenDetails: () => void;
}

export const ModerationEvents = ({ onOpenDetails }: ModerationEventsProps) => {
  const dispatch = useAppDispatch();
  const t = useLanguage().translations.moderation;
  const { data: outcomes } = useListReportOutcomesQuery();
  const [markRead] = useMarkReportOutcomeReadMutation();
  const announced = useRef(new Set<string>());

  useEffect(() => {
    outcomes?.items.filter((item) => !item.read && !announced.current.has(item.id)).forEach((item) => {
      announced.current.add(item.id);
      const { title, description } = outcomeNotice(item, t);
      toast(title, { id: `report-outcome:${item.id}`, description });
      void markRead(item.id);
    });
  }, [outcomes, markRead, t]);

  useEffect(() => realtime.subscribe({ onEvent: (event) => {
    if (event.type === 'account_status') {
      void dispatch(moderationApi.util.upsertQueryData('getAccountStatus', undefined, event.data));
    } else if (event.type === 'report_outcome') {
      const outcome = event.data;
      dispatch(moderationApi.util.updateQueryData('listReportOutcomes', undefined, (draft) => {
        if (!draft.items.some((item) => item.id === outcome.id)) draft.items.unshift(outcome);
      }));
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
