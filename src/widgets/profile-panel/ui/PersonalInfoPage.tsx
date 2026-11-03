import React, { useState } from 'react';
import { Camera, Check, Loader2, UserRound } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { LeaveUnsavedDialog, UnsavedChangesBar } from './UnsavedChanges';

interface PersonalInfoPageProps {
  avatarUrl: string;
  displayName: string;
  isUploadingAvatar: boolean;
  onPickAvatar: (file: File) => void;
  newDisplayName: string;
  displayNameChanged: boolean;
  displayNameInvalid: boolean;
  isUpdatingDisplayName: boolean;
  onDisplayNameChange: (value: string) => void;
  onSaveDisplayName: () => void;
  bio: string;
  newBio: string;
  isUpdatingBio: boolean;
  onBioChange: (value: string) => void;
  onSaveBio: () => void;
  onSaveAll: () => Promise<boolean>;
  onDiscard: () => void;
  onBack: () => void;
}

const PersonalInfoPage: React.FC<PersonalInfoPageProps> = ({
  avatarUrl, displayName, isUploadingAvatar, onPickAvatar, newDisplayName, displayNameChanged, displayNameInvalid, isUpdatingDisplayName, onDisplayNameChange,
  onSaveDisplayName, bio, newBio, isUpdatingBio, onBioChange, onSaveBio, onSaveAll, onDiscard, onBack,
}) => {
  const { translations } = useLanguage();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const hasUnsavedChanges = displayNameChanged || newBio !== bio;
  const isSaving = isUpdatingDisplayName || isUpdatingBio;
  const requestBack = () => (hasUnsavedChanges ? setConfirmLeave(true) : onBack());
  const saveAll = async () => {
    const saved = await onSaveAll();
    if (saved && confirmLeave) {
      setConfirmLeave(false);
      onBack();
    }
  };
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-border px-5 py-4">
        <nav className="flex items-center gap-2 text-sm">
          <button type="button" onClick={requestBack}>{translations.profile || 'Profile'}</button>
          <span>/</span>
          <button type="button" onClick={requestBack}>{translations.settings || 'Settings'}</button>
          <span>/</span>
          <span className="inline-flex items-center gap-2 font-medium"><UserRound className="h-4 w-4 text-muted-foreground" />{translations.personalInfo || 'Personal info'}</span>
        </nav>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <p className="text-sm text-muted-foreground">{translations.editProfile || 'Edit how other people see you.'}</p>
        <section className="rounded-lg border border-border p-4">
          <label className="group flex cursor-pointer flex-col items-center gap-3">
            <span className="relative h-24 w-24 rounded-full">
              <AuthenticatedImage src={avatarUrl} alt={displayName} className="h-24 w-24 rounded-full border border-gray-200 object-cover" />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white transition-colors group-hover:bg-black/35">
                {isUploadingAvatar ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100" />}
              </span>
            </span>
            <span className="text-sm font-medium text-primary group-hover:underline">{translations.changeAvatar}</span>
            <input type="file" accept="image/*" className="sr-only" disabled={isUploadingAvatar} aria-label={translations.changeAvatar} onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) onPickAvatar(file);
            }} />
          </label>
        </section>
        <section className="rounded-lg border border-border p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{translations.displayName || 'Display name'}</label>
            <div className="relative">
              <input type="text" value={newDisplayName} onChange={(event) => onDisplayNameChange(event.target.value)} maxLength={50} className="w-full rounded-md border border-input bg-background px-3 py-2 pr-12 text-foreground outline-none focus:ring-2 focus:ring-ring" placeholder={translations.displayNameHint || 'Display name (3-50 characters)'} />
              {displayNameChanged && (
                <button type="button" onClick={onSaveDisplayName} disabled={isUpdatingDisplayName || displayNameInvalid} className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent" aria-label={translations.saveDisplayName || 'Save display name'} title={translations.saveDisplayName || 'Save display name'}>
                  {isUpdatingDisplayName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
              )}
            </div>
            {displayNameInvalid && <p className="text-sm text-destructive">{translations.displayNameError || 'Display name must be between 3 and 50 characters'}</p>}
          </div>
        </section>
        <section className="rounded-lg border border-border p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-foreground">{translations.bio}</label>
              <span className="shrink-0 text-xs text-muted-foreground">{newBio.length}/500</span>
            </div>
            <div className="relative">
              <textarea value={newBio} onChange={(event) => onBioChange(event.target.value)} maxLength={500} className="h-28 w-full resize-none rounded-md border border-input bg-background px-3 py-2 pr-12 text-foreground outline-none focus:ring-2 focus:ring-ring" placeholder={translations.bio} />
              {newBio !== bio && (
                <button type="button" onClick={onSaveBio} disabled={isUpdatingBio} className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent" aria-label={translations.saveBio || 'Save bio'} title={translations.saveBio || 'Save bio'}>
                  {isUpdatingBio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
      {hasUnsavedChanges && (
        <UnsavedChangesBar isSaving={isSaving} canSave={!displayNameInvalid} onSave={() => void saveAll()} onDiscard={onDiscard} />
      )}
      <LeaveUnsavedDialog
        open={confirmLeave} text={translations.leaveUnsavedText} isSaving={isSaving} canSave={!displayNameInvalid} onSave={() => void saveAll()}
        onDiscard={() => { setConfirmLeave(false); onDiscard(); onBack(); }} onStay={() => setConfirmLeave(false)}
      />
    </div>
  );
};

export default PersonalInfoPage;
