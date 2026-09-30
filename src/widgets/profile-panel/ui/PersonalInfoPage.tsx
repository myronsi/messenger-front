import React from 'react';
import { Check, Loader2, UserRound } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface PersonalInfoPageProps {
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
  onBack: () => void;
}

const PersonalInfoPage: React.FC<PersonalInfoPageProps> = ({
  newDisplayName, displayNameChanged, displayNameInvalid, isUpdatingDisplayName, onDisplayNameChange,
  onSaveDisplayName, bio, newBio, isUpdatingBio, onBioChange, onSaveBio, onBack,
}) => {
  const { translations } = useLanguage();
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-border px-5 py-4">
        <nav className="flex items-center gap-2 text-sm">
          <button type="button" onClick={onBack}>{translations.profile || 'Profile'}</button>
          <span>/</span>
          <button type="button" onClick={onBack}>{translations.settings || 'Settings'}</button>
          <span>/</span>
          <span className="inline-flex items-center gap-2 font-medium"><UserRound className="h-4 w-4 text-muted-foreground" />{translations.personalInfo || 'Personal info'}</span>
        </nav>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <p className="text-sm text-muted-foreground">{translations.editProfile || 'Edit how other people see you.'}</p>
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
    </div>
  );
};

export default PersonalInfoPage;
