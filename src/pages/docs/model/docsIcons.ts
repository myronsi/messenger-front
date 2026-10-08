import { Bell, Download, KeyRound, Mail, MessageCircle, MessagesSquare, Shield, Smartphone, Sparkles, UserPlus, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Keyed by the section and upcoming-feature ids in shared/lang/*/docs.ts.
const DOCS_ICONS: Record<string, LucideIcon> = {
  'getting-started': UserPlus,
  chats: MessageCircle,
  messages: MessagesSquare,
  groups: Users,
  profile: Shield,
  recovery: KeyRound,
  install: Download,
  notifications: Bell,
  'email-recovery': Mail,
  'mobile-apps': Smartphone,
};

export const getDocsIcon = (id: string): LucideIcon => DOCS_ICONS[id] ?? Sparkles;
