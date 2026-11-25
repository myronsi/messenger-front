import { useCallback } from 'react';
import { AccountStatusBanner, ContentReportHost, ModerationEvents } from '@/features/moderation';
import { useUrlOverlay } from '@/shared/lib/useUrlOverlay';
import { ImportActionHost } from '@/features/chat-import';

export const AccountStatusHost = () => {
  const { open } = useUrlOverlay();
  const openDetails = useCallback(() => open({ kind: 'settings', page: 'account-status' }), [open]);
  return (
    <>
      <ModerationEvents onOpenDetails={openDetails} />
      <AccountStatusBanner onOpenDetails={openDetails} />
      <ContentReportHost />
      <ImportActionHost />
    </>
  );
};
