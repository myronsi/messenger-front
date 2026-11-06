import type { ConnectionStatus } from '@/shared/api/realtime';

export const shouldShowConnectionNotice = (status: ConnectionStatus, hasOpened: boolean) => (
  status === 'rejected' || (hasOpened && (status === 'connecting' || status === 'reconnecting'))
);
