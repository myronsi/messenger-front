import React, { useId, type ReactNode } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useGetUserAvatarHistoryQuery } from '@/entities/user';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { cn } from '@/shared/lib/utils';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { buildAvatarList } from '../avatarHistoryList';

const STRIP_SIZE = 3;

interface ProfileHeroProps {
  username: string;
  displayName: string;
  avatarUrl: string;
  hasCustomAvatar: boolean;
  isUploadingAvatar: boolean;
  onPickAvatar: (file: File) => void;
  onOpenAvatar: (index: number) => void;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const useAvatarHistory = (username: string, avatarUrl: string, skip: boolean) => {
  const { data } = useGetUserAvatarHistoryQuery(username, { skip });
  const list = skip ? [] : buildAvatarList(data?.avatars ?? [], avatarUrl);
  const isCurrent = (item: (typeof list)[number]) => item.is_current || item.fullUrl === avatarUrl;
  const currentIndex = Math.max(list.findIndex(isCurrent), 0);
  const earlier = list.map((item, index) => ({ item, index })).filter(({ item }) => !isCurrent(item));
  return { total: Math.max(list.length, 1), currentIndex, earlier };
};

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  username, displayName, avatarUrl, hasCustomAvatar, isUploadingAvatar, onPickAvatar, onOpenAvatar, subtitle, children, className,
}) => {
  const { translations } = useLanguage();
  const t = translations.appShell;
  const inputId = useId();
  const { total, currentIndex, earlier } = useAvatarHistory(username, avatarUrl, !hasCustomAvatar);
  const shown = earlier.slice(0, STRIP_SIZE);
  const more = earlier.length - shown.length;
  const avatar = <AuthenticatedImage src={avatarUrl} alt={displayName} initialsFrom={displayName}
    className="h-28 w-28 rounded-full border border-gray-200 object-cover ring-4 ring-white" />;
  const pickLabel = hasCustomAvatar ? translations.changeAvatar : t.addPhoto;

  return (
    <section className={cn('flex flex-col items-center gap-3 text-center', className)}>
      <div className="relative h-28 w-28 shrink-0">
        {hasCustomAvatar ? (
          <button type="button" onClick={() => onOpenAvatar(currentIndex)} aria-label={fillTemplate(t.openPhotos, { count: String(total) })}
            className="block rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {avatar}
          </button>
        ) : <label htmlFor={inputId} className="block cursor-pointer rounded-full">{avatar}</label>}
        {isUploadingAvatar && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white">
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
          </span>
        )}
        <input id={inputId} type="file" accept="image/*" className="peer sr-only" disabled={isUploadingAvatar} aria-label={pickLabel} onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onPickAvatar(file);
        }} />
        <label htmlFor={inputId} title={pickLabel}
          className="absolute -bottom-0.5 -right-0.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-primary text-primary-foreground transition-colors hover:bg-primary/90 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
          <Camera className="h-4 w-4" aria-hidden="true" />
        </label>
      </div>
      {!hasCustomAvatar && (
        <label htmlFor={inputId} className="cursor-pointer text-[13px] font-medium text-primary hover:underline">{t.addPhoto}</label>
      )}
      {shown.length > 0 && (
        <div className="flex items-center gap-2">
          {shown.map(({ item, index }) => (
            <button key={`${item.id}:${index}`} type="button" onClick={() => onOpenAvatar(index)}
              aria-label={fillTemplate(t.earlierPhoto, { index: String(index + 1), total: String(total) })}
              className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white ring-1 ring-gray-200 transition-transform hover:scale-105">
              <AuthenticatedImage src={item.fullUrl} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
          {more > 0 && (
            <button type="button" onClick={() => onOpenAvatar(earlier[STRIP_SIZE].index)} aria-label={fillTemplate(t.morePhotos, { count: String(more) })}
              className="flex h-10 min-w-10 items-center justify-center rounded-full bg-gray-100 px-2 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-200">
              +{more}
            </button>
          )}
          <span className="pl-0.5 text-xs text-gray-600">{t.earlierPhotos}</span>
        </div>
      )}
      <div className="flex min-w-0 max-w-full flex-col items-center gap-0.5">
        <span className="max-w-full truncate text-[22px] font-semibold text-gray-950">{displayName}</span>
        {subtitle}
      </div>
      {children}
    </section>
  );
};
