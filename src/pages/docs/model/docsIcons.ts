import { Bell, Download, Fingerprint, KeyRound, Mail, MessageCircle, MessagesSquare, MonitorSmartphone, Paperclip, Search, Shield, ShieldCheck, Sparkles, UserPlus, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Keyed by the section and upcoming-feature ids in shared/lang/*/docs.ts.
const DOCS_ICONS: Record<string, LucideIcon> = {
  'getting-started': UserPlus,
  chats: MessageCircle,
  messages: MessagesSquare,
  groups: Users,
  profile: Shield,
  recovery: KeyRound,
  security: ShieldCheck,
  notifications: Bell,
  install: Download,
  search: Search,
  attachments: Paperclip,
  passkeys: Fingerprint,
  'device-approval': MonitorSmartphone,
  'email-recovery': Mail,
  'security-settings': ShieldCheck,
};

export const getDocsIcon = (id: string): LucideIcon => DOCS_ICONS[id] ?? Sparkles;
