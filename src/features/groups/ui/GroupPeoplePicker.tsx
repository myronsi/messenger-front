import type React from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import type { User } from '@/entities/user';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { getAvatarSrc } from '../model/useGroupCreateForm';

type GroupCreateText = Record<string, string>;

interface GroupPeoplePickerProps {
  text: GroupCreateText;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedUsers: User[];
  selectedUsernames: Set<string>;
  recentContacts: User[];
  searchResults: User[];
  debouncedSearch: string;
  isSearching: boolean;
  rejectedParticipants: Record<string, string>;
  onToggle: (user: User) => void;
  onRemove: (username: string) => void;
}

const nameOf = (user: User) => user.display_name || user.username;

const PersonRow: React.FC<{ user: User; selected: boolean; error?: string; onToggle: () => void }> = ({ user, selected, error, onToggle }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={selected}
    onClick={onToggle}
    className={`motion-press flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
      selected ? 'border-primary/30 bg-primary/10' : 'border-border hover:bg-accent/60'
    }`}
  >
    <AuthenticatedImage src={getAvatarSrc(user.avatar_url)} alt={user.username} className="h-10 w-10 shrink-0 rounded-full object-cover" />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold">{nameOf(user)}</span>
      <span className="block truncate text-xs text-muted-foreground">@{user.username}</span>
      {error && <span className="motion-error-in mt-0.5 block text-xs text-destructive">{error}</span>}
    </span>
    <span
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50'
      }`}
    >
      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  </button>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <div className="text-sm text-muted-foreground">{title}</div>
    {children}
  </div>
);

const GroupPeoplePicker: React.FC<GroupPeoplePickerProps> = ({
  text, searchTerm, onSearchChange, selectedUsers, selectedUsernames, recentContacts, searchResults,
  debouncedSearch, isSearching, rejectedParticipants, onToggle, onRemove,
}) => {
  const rowFor = (user: User) => (
    <PersonRow key={user.username} user={user} selected={selectedUsernames.has(user.username.toLowerCase())}
      error={rejectedParticipants[user.username]} onToggle={() => onToggle(user)} />
  );
  const searching = debouncedSearch.length >= 2;
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">{text.addPeople}</h3>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={text.searchPlaceholder}
          aria-label={text.searchPlaceholder}
          className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <span key={user.username} className="motion-list-item inline-flex items-center gap-1 rounded-lg bg-primary/20 py-1 pl-3 pr-1.5 text-sm">
              <span className="max-w-[10rem] truncate">{nameOf(user)}</span>
              <button
                type="button"
                onClick={() => onRemove(user.username)}
                aria-label={text.removePerson.replace('{name}', nameOf(user))}
                className="motion-press rounded-full p-0.5 text-muted-foreground hover:bg-background/40 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      {recentContacts.length > 0 && <Section title={text.recentChats}>{recentContacts.map(rowFor)}</Section>}
      {searching && (isSearching || searchResults.length > 0 || recentContacts.length === 0) && (
        <Section title={text.searchResults}>
          {isSearching ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : searchResults.length > 0 ? searchResults.map(rowFor) : (
            <div className="py-4 text-center text-sm text-muted-foreground">{text.noResults}</div>
          )}
        </Section>
      )}
      {!searching && recentContacts.length === 0 && (
        <div className="py-4 text-center text-sm text-muted-foreground">{text.typeToSearch}</div>
      )}
    </div>
  );
};

export default GroupPeoplePicker;
