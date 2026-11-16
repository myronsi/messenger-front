import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';
import { cn } from '@/shared/lib/utils';
import { backgroundStyle, prefersStillBackground, type ProfileBackgroundValue } from './backgroundPresets';

interface Props {
  background: ProfileBackgroundValue;
  className?: string;
}

type Attachment = NonNullable<ProfileBackgroundValue['attachment']>;

const MediaFill = ({ attachment, className }: { attachment: Attachment; className?: string }) => {
  const video = attachment.kind === 'video';
  const still = video && prefersStillBackground();
  const imageSource = video ? attachment.thumbnail_url || undefined : attachment.display_url || attachment.url;
  const image = useAuthenticatedMedia(imageSource);
  const clip = useAuthenticatedMedia(video && !still ? attachment.url : undefined);
  if (video && !still && clip) {
    return (
      <video data-testid="profile-background-video" className={cn('object-cover', className)} src={clip} poster={image}
        autoPlay muted loop playsInline aria-hidden="true" />
    );
  }
  if (!image) return <div className={cn('bg-muted', className)} />;
  return <img data-testid="profile-background-image" className={cn('object-cover', className)} src={image} alt="" aria-hidden="true" />;
};

export const ProfileBackgroundFill = ({ background, className }: Props) => {
  if (background.kind === 'media') {
    return background.attachment ? <MediaFill attachment={background.attachment} className={className} /> : null;
  }
  const style = backgroundStyle(background);
  return style ? <div data-testid="profile-background-fill" className={className} style={style} aria-hidden="true" /> : null;
};

export const ProfilePageBackdrop = ({ background }: { background?: ProfileBackgroundValue | null }) => {
  if (!background) return null;
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <ProfileBackgroundFill background={background} className="h-full w-full scale-110 opacity-25 blur-2xl dark:opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
    </div>
  );
};
