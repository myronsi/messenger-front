import React, { useEffect, useState } from 'react';
import { useSettingsLayout } from '../model/settingsLayout';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import { AlertCircle, CheckCircle2, ChevronRight, Loader2, Shield } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import type { PrivacyExceptionEffect, PrivacyExceptionKey } from '@/features/profile';
import type { PrivacyDetail } from '@/shared/lib/urlOverlay';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { Switch } from '@/shared/ui/switch';
import { useCallsEnabledOnServer } from '@/features/calls';
import { choiceOf, exceptionEffectsOf, modeFor, type PrivacyChoice } from '../model/privacyChoices';
import { useChatPartners } from '../model/useChatPartners';
import PrivacySettingPage from './PrivacySettingPage';
import PrivacyExceptionsPage from './PrivacyExceptionsPage';
import { usePrivacySettings } from './usePrivacySettings';
import { LeaveUnsavedDialog, UnsavedChangesBar } from './UnsavedChanges';

type Translations = ReturnType<typeof usePrivacySettings>['translations'];

interface SettingDefinition {
  key: PrivacyDetail;
  group: 'see' | 'contact' | 'discovery';
  modes: readonly string[];
  label: (t: Translations) => string;
}

const visibilityModes = ['everyone', 'shared_chats', 'everyone_except', 'nobody_except'] as const;
const SETTINGS: SettingDefinition[] = [
  { key: 'avatar_visibility', group: 'see', modes: visibilityModes,
    label: (t) => t.avatarVisibility || 'Avatar visibility' },
  { key: 'profile_visibility', group: 'see', modes: visibilityModes,
    label: (t) => t.profileVisibility || 'Profile visibility' },
  { key: 'presence_visibility', group: 'see', modes: ['everyone', 'shared_chats', 'nobody', 'everyone_except', 'nobody_except'],
    label: (t) => t.presenceVisibility || 'Online status' },
  { key: 'direct_messages', group: 'contact', modes: ['everyone', 'shared_chats', 'wait_approval'],
    label: (t) => t.directMessages || 'Direct messages' },
  { key: 'group_invites', group: 'contact', modes: ['everyone', 'shared_chats', 'nobody', 'everyone_except', 'nobody_except', 'wait_approval'],
    label: (t) => t.groupInvites || 'Group invites' },
  { key: 'search_visibility', group: 'discovery', modes: ['everyone', 'nobody'],
    label: (t) => t.searchVisibility || 'Search visibility' },
];
const EXCEPTION_KEYS = new Set<string>(['avatar_visibility', 'profile_visibility', 'presence_visibility', 'group_invites', 'direct_messages', 'search_visibility']);

interface PrivacySettingsPanelProps {
  isActive: boolean;
  detail?: PrivacyDetail;
  showExceptions?: PrivacyExceptionEffect;
  onOpenDetail: (detail: PrivacyDetail | null, exceptions?: PrivacyExceptionEffect) => void;
  onBack: () => void;
  onOpenRequests: () => void;
  children?: React.ReactNode;
}

const getAvatarSrc = (avatarUrl?: string | null) => resolveMediaUrl(avatarUrl);

const PrivacySettingsPanel: React.FC<PrivacySettingsPanelProps> = ({ isActive, detail, showExceptions, onOpenDetail, onBack, onOpenRequests, children }) => {
  const {
    translations, currentUsername, privacySettings, isLoadingPrivacy, isUpdatingPrivacy, isUpdatingExceptions, isLookingUpUser, status,
    setActiveExceptionKey, exceptionDrafts, setExceptionDrafts, debouncedSearch, searchData, isSearchingUsers, dmCandidates,
    visibilityLabel, handlePrivacyChange, handleExceptionListChange, handleAddException, hasUnsavedChanges, saveChanges, discardChanges,
  } = usePrivacySettings(isActive);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const pane = useSettingsLayout() === 'pane';
  const callsOnServer = useCallsEnabledOnServer();
  const isSaving = isUpdatingPrivacy || isUpdatingExceptions;
  const requestBack = () => (hasUnsavedChanges ? setConfirmLeave(true) : onBack());
  const save = async () => {
    const saved = await saveChanges();
    if (saved && confirmLeave) {
      setConfirmLeave(false);
      onBack();
    }
  };
  const definition = SETTINGS.find((setting) => setting.key === detail);
  const exceptionKey = definition && EXCEPTION_KEYS.has(definition.key) ? definition.key as PrivacyExceptionKey : null;

  useEffect(() => {
    setActiveExceptionKey(showExceptions && exceptionKey ? exceptionKey : null);
  }, [exceptionKey, setActiveExceptionKey, showExceptions]);

  const modeOf = (setting: SettingDefinition) => String(privacySettings?.[setting.key] ?? setting.modes[0]);
  const exceptionsOf = (key: PrivacyExceptionKey, effect: PrivacyExceptionEffect) => privacySettings?.privacy_exceptions?.[key]?.[effect] || [];
  const summary = (setting: SettingDefinition) => {
    const choice = choiceOf(modeOf(setting));
    const effects = EXCEPTION_KEYS.has(setting.key) ? exceptionEffectsOf(choice) : [];
    const count = effects.reduce((total, effect) => total + exceptionsOf(setting.key as PrivacyExceptionKey, effect).length, 0);
    return count ? (translations.privacyExceptCount || '{choice} except {count}').replace('{choice}', visibilityLabel(choice)).replace('{count}', String(count)) : visibilityLabel(choice);
  };
  const choose = (setting: SettingDefinition, choice: PrivacyChoice) => {
    const key = setting.key as PrivacyExceptionKey;
    const count = EXCEPTION_KEYS.has(setting.key) && choice !== 'shared_chats' && choice !== 'wait_approval'
      ? exceptionsOf(key, choice === 'everyone' ? 'deny' : 'allow').length : 0;
    handlePrivacyChange(setting.key, modeFor(choice, setting.modes, count));
    if (choice === 'shared_chats' && EXCEPTION_KEYS.has(setting.key) && exceptionsOf(key, 'allow').length) {
      handleExceptionListChange(key, 'allow', []);
    }
  };

  const mode = definition ? modeOf(definition) : '';
  const effect = definition && exceptionKey && showExceptions && exceptionEffectsOf(choiceOf(mode)).includes(showExceptions) ? showExceptions : null;
  const selected = exceptionKey && effect ? exceptionsOf(exceptionKey, effect) : [];
  const query = exceptionKey ? exceptionDrafts[exceptionKey] : '';
  const normalized = query.trim().toLowerCase();
  const matches = (person: { username: string; display_name?: string | null }) =>
    !normalized || person.username.toLowerCase().includes(normalized) || (person.display_name || '').toLowerCase().includes(normalized);
  const onlyChatPartners = choiceOf(mode) === 'shared_chats' && effect === 'deny';
  const chatPartners = useChatPartners(onlyChatPartners, currentUsername, dmCandidates);
  const searchResults = debouncedSearch.length >= 2 && !onlyChatPartners ? (searchData?.users || []) : [];
  const candidates = [...(onlyChatPartners ? chatPartners : dmCandidates.filter(matches)), ...searchResults]
    .filter((person, index, list) => list.findIndex((other) => other.username.toLowerCase() === person.username.toLowerCase()) === index);

  const addException = async (username: string) => {
    if (!definition || !exceptionKey || !effect) return;
    if (mode === 'everyone' && effect === 'deny' && definition.modes.includes('everyone_except')) handlePrivacyChange(definition.key, 'everyone_except');
    if (mode === 'nobody' && effect === 'allow' && definition.modes.includes('nobody_except')) handlePrivacyChange(definition.key, 'nobody_except');
    await handleAddException(exceptionKey, effect, username);
  };

  const group = (title: string, rows: React.ReactNode) => (
    <section>
      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">{rows}</div>
    </section>
  );
  const row = (setting: SettingDefinition) => {
    return (
      <button key={setting.key} type="button" onClick={() => onOpenDetail(setting.key)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50">
        <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{setting.label(translations)}</span>
        <span className="max-w-[40%] truncate text-sm text-muted-foreground">{summary(setting)}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    );
  };
  const rowsOf = (groupName: SettingDefinition['group']) => SETTINGS.filter((setting) => setting.group === groupName).map(row);

  const exceptionsTitle = effect === 'deny' ? translations.neverAllow : translations.alwaysAllow;
  const crumb = (label: React.ReactNode, onClick?: () => void) => (
    <BreadcrumbItem>
      {onClick
        ? <BreadcrumbLink asChild className="cursor-pointer"><button type="button" onClick={onClick} className="inline-flex items-center gap-2">{label}</button></BreadcrumbLink>
        : <BreadcrumbPage className="inline-flex items-center gap-2 font-medium">{label}</BreadcrumbPage>}
    </BreadcrumbItem>
  );
  const privacyLabel = <><Shield className="h-4 w-4 text-muted-foreground" />{translations.privacy || 'Privacy'}</>;
  const showingExceptions = !!definition && !!exceptionKey && !!effect;
  const headerBack = showingExceptions && definition ? () => onOpenDetail(definition.key) : definition ? () => onOpenDetail(null) : requestBack;

  return (
    <div className="relative flex h-full flex-col bg-background">
      <PageBackHeader onBack={headerBack} hideBack={pane && !definition}>
        <Breadcrumb>
          <BreadcrumbList>
            {crumb(privacyLabel, definition ? () => onOpenDetail(null) : undefined)}
            {definition && (
              <>
                <BreadcrumbSeparator />
                {crumb(definition.label(translations), showingExceptions ? () => onOpenDetail(definition.key) : undefined)}
              </>
            )}
            {showingExceptions && (
              <>
                <BreadcrumbSeparator />
                {crumb(exceptionsTitle)}
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>

      <div key={`${detail ?? 'list'}-${showingExceptions}`} className="motion-sheet-in min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {!definition && (
          <>
            <p className="text-sm text-muted-foreground">{translations.privacyDescription || 'Control who can see and contact you.'}</p>
            {isLoadingPrivacy ? (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {translations.loading}
              </div>
            ) : (
              <>
                {group(translations.privacyWhoCanSee || 'Who can see me', rowsOf('see'))}
                {group(translations.privacyWhoCanContact || 'Who can contact me', rowsOf('contact'))}
                {group(translations.privacyDiscovery || 'Discovery', rowsOf('discovery'))}
                {group(translations.privacyMessages || 'Messages', (
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{translations.readReceipts || 'Read receipts'}</span>
                    <Switch checked={!!privacySettings?.read_receipts_enabled} disabled={!privacySettings || isSaving}
                      onCheckedChange={(checked) => handlePrivacyChange('read_receipts_enabled', checked)} />
                  </label>
                ))}
                {callsOnServer && group(translations.privacyCalls, (
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{translations.callsEnabledSetting}</span>
                      <span className="block text-xs text-muted-foreground">{translations.callsEnabledDescription}</span>
                    </span>
                    <Switch checked={!!privacySettings?.calls_enabled} disabled={!privacySettings || isSaving}
                      onCheckedChange={(checked) => handlePrivacyChange('calls_enabled', checked)} />
                  </label>
                ))}
              </>
            )}
            {children}
          </>
        )}
        {definition && !showingExceptions && (
          <PrivacySettingPage
            onOpenRequests={hasUnsavedChanges ? undefined : onOpenRequests}
            title={definition.label(translations)} mode={mode} modes={definition.modes}
            hint={(nextEffect) => translations.privacyExceptionHints[definition.key][nextEffect]}
            exceptionCount={(nextEffect) => (exceptionKey ? exceptionsOf(exceptionKey, nextEffect).length : 0)} supportsExceptions={!!exceptionKey}
            disabled={!privacySettings || isSaving} translations={translations} choiceLabel={visibilityLabel}
            onChoose={(choice) => choose(definition, choice)} onOpenExceptions={(nextEffect) => onOpenDetail(definition.key, nextEffect)}
          />
        )}
        {showingExceptions && exceptionKey && effect && (
          <PrivacyExceptionsPage
            hint={translations.privacyExceptionHints[definition.key][effect]} selected={selected} candidates={candidates}
            note={onlyChatPartners ? translations.sharedChatsOnlyHint : undefined} searchable={!onlyChatPartners}
            query={query} onQueryChange={(value) => setExceptionDrafts((drafts) => ({ ...drafts, [exceptionKey]: value }))}
            isSearching={isSearchingUsers && debouncedSearch.length >= 2} isBusy={isSaving || isLookingUpUser}
            currentUsername={currentUsername} translations={translations} getAvatarSrc={getAvatarSrc}
            onAdd={(username) => void addException(username)}
            onRemove={(username) => handleExceptionListChange(exceptionKey, effect, selected.filter((person) => person.username !== username))}
          />
        )}
      </div>
      {hasUnsavedChanges && <UnsavedChangesBar isSaving={isSaving} onSave={() => void save()} onDiscard={discardChanges} />}
      <LeaveUnsavedDialog
        open={confirmLeave} text={translations.leaveUnsavedPrivacyText} isSaving={isSaving} onSave={() => void save()}
        onDiscard={() => { setConfirmLeave(false); discardChanges(); onBack(); }} onStay={() => setConfirmLeave(false)}
      />

      {status && (
        <div
          aria-live="polite"
          className={`pointer-events-none absolute right-4 top-[58px] z-10 inline-flex max-w-[min(18rem,calc(100%-2rem))] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm ${
            status.type === 'success' ? 'border-success/30 bg-success-soft text-success' : 'border-destructive/20 bg-destructive/10 text-destructive'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          <span className="truncate">{status.text}</span>
        </div>
      )}
    </div>
  );
};

export default PrivacySettingsPanel;
