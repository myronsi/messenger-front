import { Loader2 } from 'lucide-react';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/sonner';
import { useGetGroupBansQuery, useUnbanGroupUserMutation } from '@/entities/group';

export const GroupBansPanel = ({ chatId }: { chatId: EntityId }) => {
  const { translations } = useLanguage();
  const t = translations.sharing;
  const { data: bans, isLoading, isError, refetch } = useGetGroupBansQuery(chatId, { refetchOnMountOrArgChange: true });
  const [unban, { isLoading: unbanning, originalArgs }] = useUnbanGroupUserMutation();
  const allow = async (userId: EntityId) => {
    try {
      await unban({ chatId, userId }).unwrap();
    } catch {
      toast(t.actionFailed);
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.removedMembersHint}</p>
      {isLoading && <div role="status" className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label={translations.loading} /></div>}
      {isError && (
        <div role="alert" className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground">
          {t.loadFailed}<Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>{t.retry}</Button>
        </div>
      )}
      {bans && (bans.length
        ? <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {bans.map(({ user }) => (
            <li key={user.id} data-testid="group-ban" className="flex items-center gap-3 px-3 py-2.5">
              <AuthenticatedImage src={resolveMediaUrl(user.avatar_url)} initialsFrom={user.display_name} alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium"><EmojiText text={user.display_name} /></p>
                <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
              </div>
              <Button type="button" size="sm" variant="outline" disabled={unbanning && originalArgs?.userId === user.id}
                onClick={() => void allow(user.id)}>{t.allowRejoin}</Button>
            </li>
          ))}
        </ul>
        : <p className="py-4 text-center text-sm text-muted-foreground">{t.noRemovedMembers}</p>)}
    </div>
  );
};
