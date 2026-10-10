import React from 'react';
import { Check, Inbox, MessageSquare, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { ApprovalRequestInboxResponse, ApprovalRequest } from '@/entities/chat';
import { DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import type { Id } from '@/shared/lib/ids';


interface ApprovalRequestsPageProps {
  inbox?: ApprovalRequestInboxResponse;
  pendingCount: number;
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: (request: ApprovalRequest) => void;
  onReject: (requestId: Id) => void;
  onBack: () => void;
  getMediaUrl: (path?: string | null, fallback?: string) => string;
}

const ApprovalRequestsPage: React.FC<ApprovalRequestsPageProps> = ({
  inbox, pendingCount, isApproving, isRejecting, onApprove, onReject, onBack, getMediaUrl,
}) => {
  const { translations } = useLanguage();
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-border px-5 py-4">
        <nav className="flex items-center gap-2 text-sm">
          <button type="button" onClick={onBack}>{translations.profile || 'Profile'}</button>
          <span>/</span>
          <span className="inline-flex items-center gap-2 font-medium"><Inbox className="h-4 w-4 text-muted-foreground" />{translations.requestInbox || 'Request inbox'}</span>
        </nav>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <p className="mb-4 text-sm text-muted-foreground">{pendingCount} {translations.pendingRequests || 'pending requests'}</p>
        {(inbox?.requests || []).length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <MessageSquare className="mb-2 h-10 w-10" />{translations.noRequests || 'No pending requests'}
          </div>
        ) : (
          <div className="space-y-3">
            {(inbox?.requests || []).map((request) => {
              const requester = request.requester;
              const isDm = request.type === 'direct_message';
              const title = isDm
                ? translations.directMessageRequest || 'Direct message request'
                : translations.groupInviteRequest || 'Group invite request';
              const subject = isDm
                ? requester?.display_name || requester?.username || translations.deletedUser || 'Deleted User'
                : request.group?.name || translations.group || 'Group';
              const subtitle = isDm
                ? `@${requester?.username || ''}`
                : `${translations.from || 'From'} ${requester?.display_name || requester?.username || translations.deletedUser || 'Deleted User'}`;
              const avatar = isDm
                ? getMediaUrl(requester?.avatar_url)
                : getMediaUrl(request.group?.avatar_url, DEFAULT_GROUP_AVATAR);
              return (
                <div key={request.id} className="rounded-lg border border-border bg-white p-3 shadow-sm">
                  <div className="flex gap-3">
                    <img src={avatar} alt={subject} className="h-11 w-11 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium uppercase text-muted-foreground">{title}</div>
                      <div className="truncate text-sm font-semibold text-foreground">{subject}</div>
                      <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
                      {isDm && request.message_text && <div className="mt-2 rounded-md bg-muted px-3 py-2 text-sm text-foreground">{request.message_text}</div>}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" disabled={isApproving || isRejecting} onClick={() => onReject(request.id)} className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50">
                      <X className="h-4 w-4" />{translations.reject || 'Reject'}
                    </button>
                    <button type="button" disabled={isApproving || isRejecting} onClick={() => onApprove(request)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                      <Check className="h-4 w-4" />{translations.approve || 'Approve'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalRequestsPage;
