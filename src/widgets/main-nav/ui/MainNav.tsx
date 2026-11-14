import type React from 'react';
import { MessageCircle, Phone, Settings } from 'lucide-react';
import { useGetCurrentUserQuery } from '@/features/profile';
import { useGetApprovalRequestInboxQuery } from '@/entities/chat';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import type { MainTab } from '../model/mainTab';

interface MainNavProps {
  active: MainTab;
  onSelect: (tab: MainTab) => void;
  variant: 'bar' | 'rail';
  className?: string;
}

const MainNav: React.FC<MainNavProps> = ({ active, onSelect, variant, className = '' }) => {
  const { translations } = useLanguage();
  const t = translations.mainNav;
  const { data: me } = useGetCurrentUserQuery();
  const { data: inbox } = useGetApprovalRequestInboxQuery();
  const requests = inbox?.unread_count || 0;
  const rail = variant === 'rail';
  const iconClass = 'h-6 w-6';
  const items: { key: MainTab; label: string; icon: React.ReactNode; badge?: string; count?: number }[] = [
    { key: 'chats', label: t.chats, icon: <MessageCircle className={iconClass} /> },
    { key: 'calls', label: t.calls, icon: <Phone className={iconClass} />, badge: t.soon },
    { key: 'settings', label: t.settings, icon: <Settings className={iconClass} />, count: requests },
    {
      key: 'profile', label: t.profile,
      icon: <AuthenticatedImage src={resolveMediaUrl(me?.avatar_url)} initialsFrom={me?.display_name || me?.username || '?'} alt=""
        className={`h-6 w-6 rounded-full object-cover ring-2 ${active === 'profile' ? 'ring-primary' : 'ring-transparent'}`} />,
    },
  ];

  return (
    <nav aria-label={t.label}
      className={rail
        ? `flex w-[76px] shrink-0 flex-col items-center gap-1 border-r border-border bg-background py-4 ${className}`
        : `grid grid-cols-4 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur ${className}`}>
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <button key={item.key} type="button" onClick={() => onSelect(item.key)} aria-current={isActive ? 'page' : undefined}
            className={`motion-press relative flex flex-col items-center justify-center gap-1 font-medium transition-colors ${
              rail ? 'min-h-16 w-16 rounded-2xl py-2 text-[11px]' : 'h-14 text-[11px]'
            } ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'} ${rail && isActive ? 'bg-primary/10' : ''} ${rail && !isActive ? 'hover:bg-accent' : ''}`}>
            <span className="relative flex">
              {item.icon}
              {!!item.count && (
                <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                  {item.count > 99 ? '99+' : item.count}
                </span>
              )}
              {item.badge && !rail && (
                <span className="absolute -right-4 -top-1.5 rounded-full bg-muted px-1.5 py-px text-[9px] font-semibold uppercase leading-tight text-muted-foreground">
                  {item.badge}
                </span>
              )}
            </span>
            <span className="max-w-full truncate px-1">{item.label}</span>
            {item.badge && rail && (
              <span className="-mt-0.5 rounded-full bg-muted px-1.5 py-px text-[8px] font-semibold uppercase leading-tight text-muted-foreground">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default MainNav;
