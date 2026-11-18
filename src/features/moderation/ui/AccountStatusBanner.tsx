import { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useGetAccountStatusQuery } from '../api/moderationApi';
import { showsBanner, statusLevel } from '../model/accountStatus';

interface AccountStatusBannerProps {
  onOpenDetails: () => void;
}

export const AccountStatusBanner = ({ onOpenDetails }: AccountStatusBannerProps) => {
  const t = useLanguage().translations.moderation;
  const { data } = useGetAccountStatusQuery();
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  if (!data || !showsBanner(data.status) || dismissedFor === data.status) return null;
  const level = statusLevel(data.status);
  if (level === 'good') return null;
  const severe = level === 'restricted' || level === 'suspended';
  return (
    <div role="status" data-testid="account-status-banner" data-level={level}
      className={`fixed left-1/2 top-[calc(0.5rem+env(safe-area-inset-top))] z-[60] flex w-[min(36rem,calc(100vw-1rem))] -translate-x-1/2 items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-lg ${
        severe ? 'border-destructive bg-destructive-soft text-destructive' : 'border-warning bg-warning-soft text-foreground'}`}>
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{t.banners[level]}</span>
      <button type="button" onClick={onOpenDetails} className="motion-press shrink-0 rounded-md px-2 py-1 font-medium underline-offset-2 hover:underline">
        {t.bannerAction}
      </button>
      <button type="button" onClick={() => setDismissedFor(data.status)} aria-label={t.bannerDismiss} title={t.bannerDismiss}
        className="motion-press shrink-0 rounded-full p-1 opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
