import React, { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { ModalSurface } from '@/shared/ui/ModalSurface';
import { useGroupCreateForm, type GroupCreatePayload } from '../model/useGroupCreateForm';
import GroupAvatarPicker from './GroupAvatarPicker';
import GroupPeoplePicker from './GroupPeoplePicker';

interface GroupCreateModalProps {
  currentUsername: string;
  onClose: () => void;
  onCreate: (payload: GroupCreatePayload) => Promise<void> | void;
}

const GroupCreateModal: React.FC<GroupCreateModalProps> = ({ currentUsername, onClose, onCreate }) => {
  const form = useGroupCreateForm({ currentUsername, onCreate });
  const text = form.translations.groupCreate;
  const [showDescription, setShowDescription] = useState(false);
  const canCreate = !!form.groupName.trim() && form.selectedUsers.length > 0 && !form.isCreating;

  return (
    <ModalSurface label={text.title} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in sm:p-4">
      <div
        className="relative flex h-dvh w-full flex-col overflow-hidden bg-card sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-border sm:shadow-lg">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6 sm:py-4">
          <h2 className="text-xl font-bold">{text.title}</h2>
          <button type="button" onClick={onClose} className="motion-press rounded-full p-2 hover:bg-accent" aria-label={text.close}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="flex items-start gap-5">
            <GroupAvatarPicker
              groupName={form.groupName}
              avatarPreview={form.avatarPreview}
              inputRef={form.avatarInputRef}
              onChange={form.handleAvatarChange}
              onRemove={form.handleRemoveAvatar}
              chooseLabel={text.choosePhoto}
              removeLabel={text.removePhoto}
            />
            <label className="min-w-0 flex-1 pt-1">
              <span className="mb-2 block text-sm font-semibold text-muted-foreground">{text.groupName}</span>
              <input
                value={form.groupName}
                onChange={(event) => form.setGroupName(event.target.value)}
                placeholder={text.groupNamePlaceholder}
                maxLength={80}
                autoFocus
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>

          {showDescription ? (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-muted-foreground">{text.description}</span>
              <textarea
                value={form.description}
                onChange={(event) => form.setDescription(event.target.value)}
                rows={3}
                maxLength={500}
                autoFocus
                className="w-full resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          ) : (
            <button type="button" onClick={() => setShowDescription(true)} className="motion-press inline-flex items-center gap-1 text-sm">
              <Plus className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">{text.addDescription}</span>
              <span className="text-muted-foreground">{text.optional}</span>
            </button>
          )}

          <GroupPeoplePicker
            text={text}
            searchTerm={form.searchTerm}
            onSearchChange={form.setSearchTerm}
            selectedUsers={form.selectedUsers}
            selectedUsernames={form.selectedUsernames}
            recentContacts={form.recentContacts}
            searchResults={form.searchResults}
            debouncedSearch={form.debouncedSearch}
            isSearching={form.isSearching}
            rejectedParticipants={form.rejectedParticipants}
            onToggle={form.toggleUser}
            onRemove={form.handleRemoveUser}
          />

          {form.createError && (
            <div className="motion-error-in rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {form.createError}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
          <span className="text-sm text-muted-foreground">{text.selected.replace('{count}', String(form.selectedUsers.length))}</span>
          <button
            type="button"
            onClick={form.handleCreate}
            disabled={!canCreate}
            className="motion-press inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {form.isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
            {text.create}
          </button>
        </div>
      </div>
    </ModalSurface>
  );
};

export default GroupCreateModal;
