import React from 'react';
import { Trash2 } from 'lucide-react';
import { ProfileBio } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { isGoApi } from '@/shared/api/goSocket';
import type { GroupTranslations } from './groupChatTypes';
import type { GroupProfileDialogProps, GroupRole } from './GroupProfileTypes';
import GroupRoleHistoryRow from './GroupRoleHistoryRow';
import GroupSharingRows from './GroupSharingRows';
import type { GroupSharingView } from './GroupSharingPage';

interface Props {
  model: GroupProfileDialogProps;
  canDeleteGroup: boolean;
  currentRole: GroupRole;
  onOpenRoleHistory: () => void;
  onOpenSharing: (view: GroupSharingView) => void;
}

const Heading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>
);

const GroupProfileDetailsPanel: React.FC<Props> = ({ model, canDeleteGroup, currentRole, onOpenRoleHistory, onOpenSharing }) => {
  const { translations: raw } = useLanguage();
  const t = raw as unknown as GroupTranslations;
  const { groupDetails, onDeleteGroup } = model;
  const manages = currentRole === 'owner' || currentRole === 'admin';
  const description = groupDetails?.description?.trim();
  return (
    <div data-testid="group-info-panel" className="min-h-full space-y-5 px-5 py-4 md:py-3">
      {description && (
        <section className="space-y-1">
          <Heading>{t.groupAbout}</Heading>
          <ProfileBio text={description} />
        </section>
      )}

      {manages ? (
        <section className="space-y-2">
          <Heading>{t.manageGroup}</Heading>
          {isGoApi() && <GroupSharingRows publicName={groupDetails?.public_name ?? null} onOpen={onOpenSharing} />}
          <GroupRoleHistoryRow chatId={model.chatId} onOpen={onOpenRoleHistory} />
        </section>
      ) : (
        <GroupRoleHistoryRow chatId={model.chatId} onOpen={onOpenRoleHistory} />
      )}

      {canDeleteGroup && (
        <button
          type="button"
          onClick={onDeleteGroup}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive-soft"
        >
          <Trash2 className="h-4 w-4" />
          {t.deleteGroup || 'Delete group'}
        </button>
      )}
    </div>
  );
};

export default GroupProfileDetailsPanel;
