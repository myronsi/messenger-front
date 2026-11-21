import { useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ImageIcon, Loader2, Music2 } from 'lucide-react';
import type { ProfileBackground, ProfileMusic } from '@/entities/user';
import { ProfileBackgroundEditor, ProfileMusicEditor, type MusicChoice, type SetBackgroundBody } from '@/features/profile';
import { EmojiAutocomplete } from '@/features/message-composer';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { ProfileBanner } from '@/shared/ui/profile/ProfileHero';
import type { ProfileExtrasDraft } from '../model/useProfileExtrasDraft';
import { useEditableAvatar } from './EditableAvatar';
import { ProfileExtrasFields } from './ProfileExtrasFields';
import { LeaveUnsavedDialog } from '@/shared/ui/UnsavedChanges';
import { BackToClose } from '@/shared/ui/BackToClose';

const BIO_MAX = 500;
const NAME_MAX = 50;

export interface EditProfilePageProps {
  username: string;
  avatarUrl: string;
  hasCustomAvatar: boolean;
  isUploadingAvatar: boolean;
  onPickAvatar: (file: File) => void;
  onOpenAvatar: (index: number) => void;
  name: string;
  nameInvalid: boolean;
  onNameChange: (value: string) => void;
  bio: string;
  onBioChange: (value: string) => void;
  extras: ProfileExtrasDraft;
  music: ProfileMusic | null;
  onMusicChange: (choice: MusicChoice | null) => void;
  background: ProfileBackground | null;
  onBackgroundChange: (body: SetBackgroundBody | null, preview: ProfileBackground | null) => Promise<unknown>;
  mediaVersion: number;
  hasChanges: boolean;
  canSave: boolean;
  isSaving: boolean;
  onSave: () => Promise<boolean>;
  onDiscard: () => void;
  onBack: () => void;
}

type OpenRow = 'music' | 'background' | null;

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <section data-morph-fade="" className="space-y-3 px-5 pt-6">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
    {children}
  </section>
);

interface RowProps {
  icon: ReactNode;
  label: string;
  value: string;
  action: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

const Row = ({ icon, label, value, action, open, onToggle, children }: RowProps) => (
  <div className="overflow-hidden rounded-xl border border-border">
    <button type="button" onClick={onToggle} aria-expanded={open}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-sm text-muted-foreground">{value}</span>
      <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
        {action}<ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </span>
    </button>
    {open && <div className="border-t border-border p-4">{children}</div>}
  </div>
);

export const EditProfilePage = (props: EditProfilePageProps) => {
  const { translations } = useLanguage();
  const t = translations.profileExtras;
  const [open, setOpen] = useState<OpenRow>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [backRound, setBackRound] = useState(0);
  const [leftByBack, setLeftByBack] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const backgroundRow = useRef<HTMLDivElement>(null);
  const { avatar, overlay } = useEditableAvatar({
    username: props.username, displayName: props.name, avatarUrl: props.avatarUrl, hasCustomAvatar: props.hasCustomAvatar,
    isUploading: props.isUploadingAvatar, onPick: props.onPickAvatar, onOpen: props.onOpenAvatar,
  });
  const toggle = (row: Exclude<OpenRow, null>) => setOpen((current) => (current === row ? null : row));
  const openBackground = () => {
    setOpen('background');
    requestAnimationFrame(() => backgroundRow.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };
  const cancel = () => (props.hasChanges ? setConfirmLeave(true) : props.onBack());
  const backPressed = () => {
    if (!props.hasChanges) return props.onBack();
    setLeftByBack(true);
    setConfirmLeave(true);
  };
  const stay = () => {
    setConfirmLeave(false);
    if (!leftByBack) return;
    setLeftByBack(false);
    setBackRound((round) => round + 1);
  };
  const save = async () => {
    const saved = await props.onSave();
    if (saved) setConfirmLeave(false);
  };
  const musicValue = props.music ? [props.music.artist, props.music.title].filter(Boolean).join(' – ') || t.music : t.noMusic;
  const backgroundValue = !props.background ? t.noBackground
    : props.background.kind === 'preset' ? t.backgroundPresetLabel
      : props.background.kind === 'color' ? t.backgroundColorLabel : t.backgroundMediaLabel;

  return (
    <div className="flex h-full flex-col bg-background">
      <header data-morph-fade="" className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        <Button type="button" variant="ghost" onClick={cancel} disabled={props.isSaving}>{t.editCancel}</Button>
        <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold">{translations.editProfileAction}</h2>
        <Button type="button" onClick={() => void save()} disabled={!props.hasChanges || !props.canSave || props.isSaving}>
          {props.isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{t.editSave}
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <ProfileBanner
          seed={props.username}
          background={props.background}
          avatar={avatar}
          avatarOverlay={overlay}
          actions={(
            <Button type="button" variant="outline" size="sm" onClick={openBackground}>
              <ImageIcon className="h-4 w-4" />{t.changeBackground}
            </Button>
          )}
          title={(
            <div className="relative">
              <input ref={nameRef} type="text" value={props.name} maxLength={NAME_MAX} aria-label={t.nameLabel}
                placeholder={translations.displayNameHint || t.nameLabel} onChange={(event) => props.onNameChange(event.target.value)}
                className="w-full rounded-md border border-transparent bg-transparent px-1 -mx-1 py-0.5 text-2xl font-bold tracking-tight text-foreground outline-none transition-colors hover:border-border focus:border-ring" />
              <EmojiAutocomplete inputRef={nameRef} value={props.name} onChange={props.onNameChange} className="top-full bottom-auto mt-1 mb-0" />
            </div>
          )}
          subtitle={<span data-morph="username" data-morph-mode="move" className="font-medium text-primary">@{props.username}</span>}
        />
        {props.nameInvalid && <p className="px-5 pt-1 text-sm text-destructive">{translations.displayNameError}</p>}
        <div data-morph-fade="" className="px-5 pt-4">
          <div className="relative">
            <textarea ref={bioRef} value={props.bio} maxLength={BIO_MAX} aria-label={translations.bio} placeholder={translations.bio}
              onChange={(event) => props.onBioChange(event.target.value)}
              className="h-24 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring" />
            <EmojiAutocomplete inputRef={bioRef} value={props.bio} onChange={props.onBioChange} className="top-full bottom-auto mt-1 mb-0" />
          </div>
          <p className="mt-1 text-right text-xs text-muted-foreground">{props.bio.length}/{BIO_MAX}</p>
        </div>
        <Group title={t.aboutYou}>
          <ProfileExtrasFields extras={props.extras} />
        </Group>
        <Group title={t.onYourProfile}>
          <Row icon={<Music2 className="h-4 w-4" />} label={t.music} value={musicValue} action={props.music ? t.changeItem : t.addItem}
            open={open === 'music'} onToggle={() => toggle('music')}>
            <ProfileMusicEditor key={props.mediaVersion} music={props.music} onChange={props.onMusicChange} />
          </Row>
          <div ref={backgroundRow}>
            <Row icon={<ImageIcon className="h-4 w-4" />} label={t.background} value={backgroundValue} action={props.background ? t.changeItem : t.addItem}
              open={open === 'background'} onToggle={() => toggle('background')}>
              <ProfileBackgroundEditor key={props.mediaVersion} embedded background={props.background} onSave={props.onBackgroundChange} />
            </Row>
          </div>
        </Group>
      </div>
      <BackToClose key={backRound} flag="editProfile" onClose={backPressed} />
      <LeaveUnsavedDialog
        open={confirmLeave} text={translations.leaveUnsavedText} isSaving={props.isSaving} canSave={props.canSave} onSave={() => void save()}
        onDiscard={() => { setConfirmLeave(false); props.onDiscard(); props.onBack(); }} onStay={stay}
      />
    </div>
  );
};
