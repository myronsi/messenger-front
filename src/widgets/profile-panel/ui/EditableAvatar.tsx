import { useId } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useGetUserAvatarHistoryQuery } from '@/entities/user';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { buildAvatarList } from '../avatarHistoryList';

interface EditableAvatarProps {
  username: string;
  displayName: string;
  avatarUrl: string;
  hasCustomAvatar: boolean;
  isUploading: boolean;
  onPick: (file: File) => void;
  onOpen: (index: number) => void;
}

const useCurrentAvatarIndex = (username: string, avatarUrl: string, skip: boolean) => {
  const { data } = useGetUserAvatarHistoryQuery(username, { skip });
  const list = skip ? [] : buildAvatarList(data?.avatars ?? [], avatarUrl);
  const index = list.findIndex((item) => item.is_current || item.fullUrl === avatarUrl);
  return { total: Math.max(list.length, 1), current: Math.max(index, 0) };
};

export const useEditableAvatar = ({ username, displayName, avatarUrl, hasCustomAvatar, isUploading, onPick, onOpen }: EditableAvatarProps) => {
  const { translations } = useLanguage();
  const t = translations.appShell;
  const inputId = useId();
  const { total, current } = useCurrentAvatarIndex(username, avatarUrl, !hasCustomAvatar);
  const pickLabel = hasCustomAvatar ? translations.changeAvatar : t.addPhoto;
  const image = <AuthenticatedImage src={avatarUrl} alt={displayName} initialsFrom={displayName} className="h-full w-full object-cover" />;

  const avatar = (
    <div className="relative h-full w-full">
      {hasCustomAvatar ? (
        <button type="button" onClick={() => onOpen(current)} aria-label={fillTemplate(t.openPhotos, { count: String(total) })}
          className="block h-full w-full transition-opacity hover:opacity-90">
          {image}
        </button>
      ) : <label htmlFor={inputId} className="block h-full w-full cursor-pointer">{image}</label>}
      {isUploading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
          <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
        </span>
      )}
    </div>
  );

  const overlay = (
    <>
      <input id={inputId} type="file" accept="image/*" className="peer sr-only" disabled={isUploading} aria-label={pickLabel} onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) onPick(file);
      }} />
      <label htmlFor={inputId} title={pickLabel}
        className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[3px] border-background bg-primary text-primary-foreground transition-colors hover:bg-primary/90 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
        <Camera className="h-4 w-4" aria-hidden="true" />
      </label>
    </>
  );

  return { avatar, overlay };
};
