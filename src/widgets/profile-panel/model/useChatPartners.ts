import { useEffect, useMemo, useState } from 'react';
import { chatApi, useGetGroupChatsQuery, type RawGroupParticipant } from '@/entities/chat';
import { useAppDispatch } from '@/shared/hooks/redux';

export interface ChatPartner {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export const mergePartners = (currentUsername: string, ...lists: ChatPartner[][]) => {
  const self = currentUsername.toLowerCase();
  const seen = new Set<string>();
  return lists.flat().filter((person) => {
    const key = person.username.toLowerCase();
    if (!key || key === self || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const useChatPartners = (enabled: boolean, currentUsername: string, directPartners: ChatPartner[]) => {
  const dispatch = useAppDispatch();
  const { data: groupsData } = useGetGroupChatsQuery(currentUsername, { skip: !enabled || !currentUsername });
  const [groupMembers, setGroupMembers] = useState<RawGroupParticipant[]>([]);
  const groupIds = useMemo(() => (groupsData?.groups || []).map((group) => group.chat_id), [groupsData?.groups]);

  useEffect(() => {
    if (!enabled || groupIds.length === 0) return undefined;
    let active = true;
    const requests = groupIds.map((id) => dispatch(chatApi.endpoints.getGroupDetails.initiate(id)));
    void Promise.allSettled(requests.map((request) => request.unwrap())).then((results) => {
      if (!active) return;
      setGroupMembers(results.flatMap((result) => (result.status === 'fulfilled' ? result.value.participants || [] : [])));
    });
    return () => {
      active = false;
      requests.forEach((request) => request.unsubscribe());
    };
  }, [dispatch, enabled, groupIds]);

  return useMemo(() => mergePartners(currentUsername, directPartners, groupMembers), [currentUsername, directPartners, groupMembers]);
};
