import { PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, type LucideIcon } from 'lucide-react';
import type { ChatLastMessage } from '@/entities/message';

type SystemEvent = NonNullable<ChatLastMessage['system_event']>;

const pick = (event: SystemEvent, outgoing: boolean): { Icon: LucideIcon; alert: boolean } => {
  switch (event.call?.outcome) {
    case 'completed': return { Icon: outgoing ? PhoneOutgoing : PhoneIncoming, alert: false };
    case 'declined': return { Icon: PhoneOff, alert: false };
    case 'failed': return { Icon: PhoneOff, alert: true };
    default: return outgoing ? { Icon: PhoneOutgoing, alert: false } : { Icon: PhoneMissed, alert: true };
  }
};

interface CallPreviewIconProps {
  event: SystemEvent;
  outgoing: boolean;
  onAccent: boolean;
}

export const CallPreviewIcon = ({ event, outgoing, onAccent }: CallPreviewIconProps) => {
  const { Icon, alert } = pick(event, outgoing);
  const tone = alert ? `text-destructive ${onAccent ? 'md:text-primary-foreground' : ''}` : '';
  return <Icon data-testid="chat-call-icon" data-alert={alert || undefined} aria-hidden="true" className={`mr-1 inline h-3.5 w-3.5 shrink-0 align-[-2px] ${tone}`} />;
};
