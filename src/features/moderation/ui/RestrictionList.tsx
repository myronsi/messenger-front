import type { LucideIcon } from 'lucide-react';
import { Ban, CircleCheck, Forward, MessageSquarePlus, Pencil, Phone, Search, Send, Settings, Sticker, Upload, UserPlus, Users } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { restrictionLabel } from '../model/accountStatus';

const ICONS: Record<string, LucideIcon> = {
  start_direct: MessageSquarePlus, invite_to_group: UserPlus, call: Phone, create_group: Users, upload: Upload, forward: Forward,
  edit_profile: Pencil, publish_pack: Sticker, search: Search, send: Send, manage_group: Settings,
};

export const RestrictionList = ({ restrictions }: { restrictions: string[] }) => {
  const t = useLanguage().translations.moderation;
  if (restrictions.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-success-soft px-4 py-3 text-sm">
        <CircleCheck className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <span>{t.noRestrictions}</span>
      </div>
    );
  }
  return (
    <ul data-testid="account-restrictions" className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {restrictions.map((item) => {
        const Icon = ICONS[item] ?? Ban;
        return (
          <li key={item} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive-soft text-destructive">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            {restrictionLabel(item, t)}
          </li>
        );
      })}
    </ul>
  );
};
