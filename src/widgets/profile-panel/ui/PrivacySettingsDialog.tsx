import React from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Loader2, Plus, Shield, X } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import {
  PrivacyExceptionEffect,
  PrivacyExceptionKey,
  PrivacySettings,
  useGetCurrentUserQuery,
  useGetOneOnOneChatsQuery,
  useGetPrivacySettingsQuery,
  useLazyGetUserByUsernameQuery,
  useSearchUsersQuery,
  useUpdatePrivacyExceptionsMutation,
  useUpdatePrivacySettingsMutation,
} from '@/app/api/messengerApi';
import type { User } from '@/entities/user';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Checkbox } from '@/shared/ui/checkbox';
import PrivacyExceptionEditor from './PrivacyExceptionEditor';
import { usePrivacySettings } from './usePrivacySettings';

const BASE_URL = import.meta.env.VITE_BASE_URL;

type PrivacySettingKey = Exclude<keyof PrivacySettings, 'privacy_exceptions'>;
type PrivacyCandidate = Partial<Pick<User, 'id' | 'display_name' | 'avatar_url'>> & { username: string };

const exceptionKeys = ['avatar_visibility', 'profile_visibility', 'presence_visibility', 'group_invites'] as const;
const exceptionKeySet = new Set<PrivacyExceptionKey>(exceptionKeys);
const avatarProfileVisibilityOptions = ['everyone', 'shared_chats', 'everyone_except', 'nobody_except'] as const;
const presenceVisibilityOptions = ['everyone', 'shared_chats', 'nobody', 'everyone_except', 'nobody_except'] as const;
const directMessageVisibilityOptions = ['everyone', 'shared_chats', 'wait_approval'] as const;
const groupInviteVisibilityOptions = ['everyone', 'shared_chats', 'nobody', 'everyone_except', 'nobody_except', 'wait_approval'] as const;
const searchOptions = ['everyone', 'nobody'] as const;
type StatusMessage = { type: 'success' | 'error'; text: string };

interface PrivacySettingsPanelProps {
  isActive: boolean;
  onBack: () => void;
}

const getAvatarSrc = (avatarUrl?: string | null) => {
  if (!avatarUrl) return DEFAULT_AVATAR;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  return `${BASE_URL}${avatarUrl}`;
};

const exceptionEffectForMode = (mode?: string): PrivacyExceptionEffect | null => {
  if (mode === 'everyone_except') return 'deny';
  if (mode === 'nobody_except') return 'allow';
  return null;
};

const PrivacySettingsPanel: React.FC<PrivacySettingsPanelProps> = ({ isActive, onBack }) => {
  const {
    translations, currentUsername, privacySettings, isLoadingPrivacy, isUpdatingPrivacy, isUpdatingExceptions,
    isLookingUpUser, status, setStatus, openSelect, setOpenSelect, activeExceptionKey, setActiveExceptionKey,
    collapsedExceptionKeys, setCollapsedExceptionKeys, exceptionDrafts, setExceptionDrafts, debouncedSearch,
    searchData, isSearchingUsers, dmCandidates, visibilityLabel, handlePrivacyChange, handleExceptionListChange, handleAddException,
  } = usePrivacySettings(isActive);

  const renderPrivacySelect = (
    key: PrivacySettingKey,
    label: string,
    description: string,
    options: readonly string[],
  ) => {
    const value = String(privacySettings?.[key] ?? options[0]);
    const supportsExceptions = exceptionKeySet.has(key as PrivacyExceptionKey);
    return (
      <div className="rounded-md border border-border px-3 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">{label}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
          <Select
            open={openSelect === key}
            onOpenChange={(open) => setOpenSelect(open ? key : null)}
            value={value}
            onValueChange={(nextValue) => {
              setOpenSelect(null);
              void handlePrivacyChange(key, nextValue);
            }}
            disabled={!privacySettings || isUpdatingPrivacy}
          >
            <SelectTrigger
              className="h-9 w-full sm:w-56"
              onPointerDown={(event) => {
                if (openSelect === key) {
                  event.preventDefault();
                  setOpenSelect(null);
                }
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="z-[1300]"
              onEscapeKeyDown={() => setOpenSelect(null)}
              onFocusOutside={() => setOpenSelect(null)}
              onPointerDownOutside={() => setOpenSelect(null)}
            >
              {options.map((option) => (
                <SelectItem key={option} value={option}>{visibilityLabel(option)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {supportsExceptions && (
          <PrivacyExceptionEditor
            settingKey={key as PrivacyExceptionKey} mode={value} currentUsername={currentUsername}
            privacySettings={privacySettings} exceptionDrafts={exceptionDrafts} setExceptionDrafts={setExceptionDrafts}
            dmCandidates={dmCandidates} searchData={searchData} debouncedSearch={debouncedSearch}
            isSearchingUsers={isSearchingUsers} activeExceptionKey={activeExceptionKey} setActiveExceptionKey={setActiveExceptionKey}
            collapsedExceptionKeys={collapsedExceptionKeys} setCollapsedExceptionKeys={setCollapsedExceptionKeys}
            handleExceptionListChange={handleExceptionListChange} handleAddException={handleAddException}
            isUpdatingExceptions={isUpdatingExceptions} isLookingUpUser={isLookingUpUser}
            translations={translations} getAvatarSrc={getAvatarSrc}
          />
        )}
      </div>
    );
  };

  return (
    <div className="relative flex h-full flex-col bg-white">
      <div className="border-b border-border px-5 py-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="cursor-pointer">
                <button type="button" onClick={onBack}>
                  {translations.profile || 'Profile'}
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="cursor-pointer">
                <button type="button" onClick={onBack}>
                  {translations.settings || 'Settings'}
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="inline-flex items-center gap-2 font-medium">
                <Shield className="h-4 w-4 text-muted-foreground" />
                {translations.privacy || 'Privacy'}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {status && (
        <div
          aria-live="polite"
          className={`pointer-events-none absolute right-4 top-[58px] z-10 inline-flex max-w-[min(18rem,calc(100%-2rem))] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm ${
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-destructive/20 bg-destructive/10 text-destructive'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          <span className="truncate">{status.text}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div>
          <p className="text-sm text-muted-foreground">
            {translations.privacyDescription || 'Control who can see and contact you.'}
          </p>
        </div>

        {isLoadingPrivacy ? (
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {translations.loading}
          </div>
        ) : (
          <div className="space-y-3">
            {renderPrivacySelect('avatar_visibility', translations.avatarVisibility || 'Avatar visibility', translations.avatarVisibilityDescription || 'Who can see your avatar.', avatarProfileVisibilityOptions)}
            {renderPrivacySelect('profile_visibility', translations.profileVisibility || 'Profile visibility', translations.profileVisibilityDescription || 'Who can see your bio.', avatarProfileVisibilityOptions)}
            {renderPrivacySelect('presence_visibility', translations.presenceVisibility || 'Online status', translations.presenceVisibilityDescription || 'Who can see online and last seen.', presenceVisibilityOptions)}
            {renderPrivacySelect('direct_messages', translations.directMessages || 'Direct messages', translations.directMessagesDescription || 'Who can start a direct chat with you.', directMessageVisibilityOptions)}
            {renderPrivacySelect('group_invites', translations.groupInvites || 'Group invites', translations.groupInvitesDescription || 'Who can add you to groups.', groupInviteVisibilityOptions)}
            {renderPrivacySelect('search_visibility', translations.searchVisibility || 'Search visibility', translations.searchVisibilityDescription || 'Whether you appear in user search.', searchOptions)}

            <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{translations.readReceipts || 'Read receipts'}</span>
                <span className="block text-xs text-muted-foreground">{translations.readReceiptsDescription || 'Let others see when you read messages.'}</span>
              </span>
              <Checkbox
                checked={!!privacySettings?.read_receipts_enabled}
                disabled={!privacySettings || isUpdatingPrivacy}
                onCheckedChange={(checked) => handlePrivacyChange('read_receipts_enabled', checked === true)}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivacySettingsPanel;
