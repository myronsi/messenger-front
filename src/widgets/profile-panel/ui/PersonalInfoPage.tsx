import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/shared/ui/breadcrumb';
import CopyableUsername from '@/shared/ui/CopyableUsername';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { useSettingsLayout } from '../model/settingsLayout';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import React, { useState } from 'react';
import { UserRound } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { ProfileHero } from './ProfileHero';
import { LeaveUnsavedDialog, UnsavedChangesBar } from './UnsavedChanges';
import { localeOf } from '@/shared/lang/languages';

interface PersonalInfoPageProps {
  avatarUrl: string;
  displayName: string;
  isUploadingAvatar: boolean;
  onPickAvatar: (file: File) => void;
  newDisplayName: string;
  displayNameChanged: boolean;
  displayNameInvalid: boolean;
  isSaving: boolean;
  onDisplayNameChange: (value: string) => void;
  bio: string;
  newBio: string;
  onBioChange: (value: string) => void;
  onSaveAll: () => Promise<boolean>;
  onDiscard: () => void;
  onBack: () => void;
  username?: string;
  createdAt?: string | null;
  hasCustomAvatar?: boolean;
  onOpenAvatar?: (index: number) => void;
}

const memberSince = (value: string, language: string) => new Date(value).toLocaleDateString(localeOf(language), { month: 'long', year: 'numeric' });

const PersonalInfoPage: React.FC<PersonalInfoPageProps> = ({
  avatarUrl, displayName, isUploadingAvatar, onPickAvatar, newDisplayName, displayNameChanged, displayNameInvalid, isSaving, onDisplayNameChange,
  bio, newBio, onBioChange, onSaveAll, onDiscard, onBack,
  username = '', createdAt, hasCustomAvatar = false, onOpenAvatar = () => undefined,
}) => {
  const { translations, language } = useLanguage();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const hasUnsavedChanges = displayNameChanged || newBio !== bio;
  const requestBack = () => (hasUnsavedChanges ? setConfirmLeave(true) : onBack());
  const pane = useSettingsLayout() === 'pane';
  const saveAll = async () => {
    const saved = await onSaveAll();
    if (saved && confirmLeave) {
      setConfirmLeave(false);
      onBack();
    }
  };
  return (
    <div className="flex h-full flex-col bg-background">
      <PageBackHeader onBack={requestBack} hideBack={pane}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbPage className="inline-flex items-center gap-2 font-medium"><UserRound className="h-4 w-4 text-muted-foreground" />{translations.personalInfo || 'Personal info'}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <p className="text-sm text-muted-foreground">{translations.editProfile || 'Edit how other people see you.'}</p>
        <ProfileHero username={username} displayName={displayName} avatarUrl={avatarUrl} hasCustomAvatar={hasCustomAvatar}
          isUploadingAvatar={isUploadingAvatar} onPickAvatar={onPickAvatar} onOpenAvatar={onOpenAvatar} className="py-2"
          subtitle={username && (
            <span className="flex flex-col items-center gap-0.5 text-sm text-subtle-foreground">
              <CopyableUsername username={username} className="text-sm" />
              {createdAt && <span>{fillTemplate(translations.appShell.memberSince, { date: memberSince(createdAt, language) })}</span>}
            </span>
          )} />
        <section className="rounded-lg border border-border p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{translations.displayName || 'Display name'}</label>
            <div className="relative">
              <input type="text" value={newDisplayName} onChange={(event) => onDisplayNameChange(event.target.value)} maxLength={50} className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring" placeholder={translations.displayNameHint || 'Display name (3-50 characters)'} />
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
              <textarea value={newBio} onChange={(event) => onBioChange(event.target.value)} maxLength={500} className="h-28 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring" placeholder={translations.bio} />
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
