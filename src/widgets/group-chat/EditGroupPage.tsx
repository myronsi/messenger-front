import { useEffect, useId, useRef, useState } from 'react';
import { Camera, ChevronDown, ImageIcon, ImageMinus, Loader2 } from 'lucide-react';
import type { ProfileBackground } from '@/entities/user';
import { ProfileBackgroundEditor, type SetBackgroundBody } from '@/features/profile';
import { EmojiAutocomplete } from '@/features/message-composer';
import { GROUP_DESCRIPTION_MAX_LENGTH, GROUP_NAME_MAX_LENGTH } from '@/features/groups';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import { isDefaultAvatar } from '@/shared/lib/letterAvatar';
import { DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { Button } from '@/shared/ui/button';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import AvatarCropModal from '@/shared/ui/AvatarCropModal';
import { BackToClose } from '@/shared/ui/BackToClose';
import { ProfileBanner } from '@/shared/ui/profile/ProfileHero';
import { LeaveUnsavedDialog } from '@/shared/ui/UnsavedChanges';
import { windowSlide } from '@/shared/ui/windowMotion';
import type { GroupEdits } from './GroupProfileTypes';
import type { GroupTranslations } from './groupChatTypes';

interface Props {
  name: string;
  description: string;
  avatarUrl: string;
  background: ProfileBackground | null;
  isSaving: boolean;
  onSave: (edits: GroupEdits) => Promise<boolean>;
  onBack: () => void;
  closing?: boolean;
}

type BackgroundDraft = { body: SetBackgroundBody | null; preview: ProfileBackground | null };

const EditGroupPage = ({ name: initialName, description: initialDescription, avatarUrl, background, isSaving, onSave, onBack, closing = false }: Props) => {
  const { translations: raw } = useLanguage();
  const g = raw as unknown as GroupTranslations;
  const t = raw.profileExtras;
  const inputId = useId();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [avatar, setAvatar] = useState<{ file: File; url: string } | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [cropping, setCropping] = useState<{ file: File; url: string } | null>(null);
  const [backgroundDraft, setBackgroundDraft] = useState<BackgroundDraft | undefined>(undefined);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [backRound, setBackRound] = useState(0);
  const [leftByBack, setLeftByBack] = useState(false);
  const [entered, setEntered] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const avatarPreview = avatar?.url;
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  const infoChanged = name !== initialName || description !== initialDescription;
  const hasChanges = infoChanged || !!avatar || removeAvatar || backgroundDraft !== undefined;
  const hasPhoto = !!avatar || (!removeAvatar && !!avatarUrl && !isDefaultAvatar(avatarUrl));
  const canSave = !!name.trim();
  const shownBackground = backgroundDraft ? backgroundDraft.preview : background;
  const backgroundValue = !shownBackground ? t.noBackground
    : shownBackground.kind === 'preset' ? t.backgroundPresetLabel
      : shownBackground.kind === 'color' ? t.backgroundColorLabel : t.backgroundMediaLabel;

  const save = async () => {
    const saved = await onSave({
      ...(infoChanged ? { info: { name, description } } : {}),
      ...(avatar ? { avatar: avatar.file } : removeAvatar ? { avatar: null } : {}),
      ...(backgroundDraft !== undefined ? { background: backgroundDraft.body } : {}),
    });
    if (saved) {
      setConfirmLeave(false);
      onBack();
    }
  };
  const cancel = () => (hasChanges ? setConfirmLeave(true) : onBack());
  const backPressed = () => {
    if (!hasChanges) return onBack();
    setLeftByBack(true);
    setConfirmLeave(true);
  };
  const stay = () => {
    setConfirmLeave(false);
    if (!leftByBack) return;
    setLeftByBack(false);
    setBackRound((round) => round + 1);
  };
  const pick = (file: File | undefined) => {
    if (file) setCropping({ file, url: URL.createObjectURL(file) });
  };
  const closeCrop = () => {
    if (cropping) URL.revokeObjectURL(cropping.url);
    setCropping(null);
  };

  const avatarImage = avatar
    ? <img src={avatar.url} alt={g.groupPicture} className="h-full w-full object-cover" />
    : <AuthenticatedImage src={removeAvatar ? DEFAULT_GROUP_AVATAR : avatarUrl} alt={g.groupPicture} initialsFrom={name || initialName} className="h-full w-full object-cover" />;
  const avatarOverlay = (
    <label htmlFor={inputId} aria-label={g.groupPicture}
      className="absolute inset-1 flex cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/50">
      <Camera className="h-7 w-7" aria-hidden="true" />
    </label>
  );

  return (
    <section aria-label={g.editGroup} data-testid="edit-group-page" data-closing={closing || undefined}
      className={`absolute inset-0 z-20 flex flex-col bg-background text-foreground shadow-xl ${windowSlide(entered && !closing)}`}>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        <Button type="button" variant="ghost" onClick={cancel} disabled={isSaving}>{t.editCancel}</Button>
        <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold">{g.editGroup}</h2>
        <Button type="button" onClick={() => void save()} disabled={!hasChanges || !canSave || isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{t.editSave}
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <input id={inputId} type="file" accept="image/*" className="hidden"
          onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ''; }} />
        <ProfileBanner
          seed={name || initialName}
          background={shownBackground}
          avatar={avatarImage}
          avatarOverlay={avatarOverlay}
          actions={(
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setBackgroundOpen(true)}>
                <ImageIcon className="h-4 w-4" />{t.changeBackground}
              </Button>
              {hasPhoto && (
                <Button type="button" variant="outline" size="sm" onClick={() => { if (avatar) setAvatar(null); else setRemoveAvatar(true); }}>
                  <ImageMinus className="h-4 w-4" />{raw.groupPhoto.remove}
                </Button>
              )}
            </div>
          )}
          title={(
            <div className="relative">
              <input ref={nameRef} type="text" value={name} maxLength={GROUP_NAME_MAX_LENGTH} aria-label={g.groupName}
                placeholder={g.groupName} onChange={(event) => setName(event.target.value)}
                className="-mx-1 w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-2xl font-bold tracking-tight text-foreground outline-none transition-colors hover:border-border focus:border-ring" />
              <EmojiAutocomplete inputRef={nameRef} value={name} onChange={setName} className="top-full bottom-auto mt-1 mb-0" />
            </div>
          )}
        />
        {!canSave && <p className="px-5 pt-1 text-sm text-destructive">{g.groupNameRequired}</p>}
        <section className="space-y-2 px-5 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.groupAbout}</h3>
          <div className="relative">
            <textarea ref={descriptionRef} value={description} maxLength={GROUP_DESCRIPTION_MAX_LENGTH} aria-label={g.groupAbout}
              placeholder={g.groupDescriptionPlaceholder} onChange={(event) => setDescription(event.target.value)}
              className="h-28 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring" />
            <EmojiAutocomplete inputRef={descriptionRef} value={description} onChange={setDescription} className="top-full bottom-auto mt-1 mb-0" />
          </div>
          <p className="text-right text-xs text-muted-foreground">{description.length}/{GROUP_DESCRIPTION_MAX_LENGTH}</p>
        </section>
        <section className="space-y-3 px-5 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.groupAppearance}</h3>
          <label htmlFor={inputId}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:bg-accent">
            <Camera className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">{g.groupPicture}</span>
            <span className="ml-auto text-sm font-medium text-primary">{t.changeItem}</span>
          </label>
          <div className="overflow-hidden rounded-xl border border-border">
            <button type="button" onClick={() => setBackgroundOpen((value) => !value)} aria-expanded={backgroundOpen}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent">
              <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">{t.background}</span>
              <span className="min-w-0 flex-1 truncate text-right text-sm text-muted-foreground">{backgroundValue}</span>
              <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                {shownBackground ? t.changeItem : t.addItem}
                <ChevronDown className={cn('h-4 w-4 transition-transform', backgroundOpen && 'rotate-180')} aria-hidden="true" />
              </span>
            </button>
            {backgroundOpen && (
              <div className="border-t border-border p-4">
                <ProfileBackgroundEditor embedded background={shownBackground}
                  onSave={async (body, preview) => { setBackgroundDraft({ body, preview }); }} />
              </div>
            )}
          </div>
        </section>
      </div>
      {cropping && (
        <AvatarCropModal file={cropping.file} imageUrl={cropping.url} title={g.groupPicture} onCancel={closeCrop}
          onConfirm={(file) => {
            setAvatar({ file, url: URL.createObjectURL(file) });
            setRemoveAvatar(false);
            closeCrop();
          }} />
      )}
      <BackToClose key={backRound} flag="editGroup" onClose={backPressed} />
      <LeaveUnsavedDialog
        open={confirmLeave} text={g.leaveGroupEditText} isSaving={isSaving} canSave={canSave} onSave={() => void save()}
        onDiscard={() => { setConfirmLeave(false); onBack(); }} onStay={stay}
      />
    </section>
  );
};

export default EditGroupPage;
