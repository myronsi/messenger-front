import type { components } from './generated/schema';
import { directChatModel, groupChatModel, groupModel, messageModel, userModel } from './goModels';
import type { EntityId } from './entityId';

type S = components['schemas'];
interface ScreenPayload {
  [key: string]: unknown;
  usernames?: string[]; user2?: string; username?: string; participants?: string[];
  message_ids?: EntityId[]; target_chat_ids?: EntityId[];
}
const jsonResponse = (data: unknown, source?: Response) => new Response(JSON.stringify(data), {
  status: source?.status === 204 ? 200 : source?.status || 200,
  headers: { 'Content-Type': 'application/json' },
});

const mediaScreenModel = (items: Array<S['Message'] | S['SearchHit']>, kind: string) => {
  const messages = items.map(item => messageModel('message' in item ? item.message : item));
  return kind === 'search' ? { results: messages } : {
    [kind]: messages.map(message => ({ id: message.id, timestamp: message.timestamp,
      ...(typeof message.content === 'string' ? {} : message.content),
      audio_kind: message.attachment?.kind === 'voice' ? 'voice' : 'file',
    })),
  };
};

// Migration boundary: existing screen models are retained while the wire protocol is v2.
// The supplied fetch is the versioned native fetch, never this adapter (no recursion).
export const withGoTransport = (nativeFetch: typeof fetch, baseUrl: string): typeof fetch => async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
  const base = new URL(baseUrl, url);
  const prefix = base.pathname.replace(/\/$/, '');
  if (!prefix.endsWith('/api/v2') || url.origin !== base.origin || !url.pathname.startsWith(`${prefix}/`)) {
    return nativeFetch(input, init);
  }
  const request = new Request(input, init);
  const originalPath = url.pathname.slice(prefix.length);
  let path = originalPath;
  let method = request.method;
  const headers = new Headers(request.headers);
  let body: BodyInit | undefined;
  let data: ScreenPayload = {};
  let form: FormData | undefined;
  if (!['GET', 'HEAD'].includes(method)) {
    if (headers.get('Content-Type')?.includes('multipart/form-data')) form = await request.formData();
    else if (headers.get('Content-Type')?.includes('json')) data = await request.json();
    else body = await request.text() || undefined;
  }
  const send = (target: string, verb = 'GET', payload?: unknown, multipart?: FormData) => {
    const nextHeaders = new Headers(headers);
    nextHeaders.delete('Content-Type');
    if (payload !== undefined) nextHeaders.set('Content-Type', 'application/json');
    return nativeFetch(`${base.origin}${prefix}${target}`, {
      method: verb, headers: nextHeaders, credentials: request.credentials,
      signal: request.signal, body: multipart || (payload === undefined ? undefined : JSON.stringify(payload)),
    });
  };
  const checkedJson = async <T>(response: Response): Promise<T> => {
    if (!response.ok) throw response;
    return response.json();
  };
  const lookupUser = async (username: string) => checkedJson<S['User']>(await send(`/usernames/${encodeURIComponent(decodeURIComponent(username))}`));
  const allPages = async <T>(target: string): Promise<T[]> => {
    const items: T[] = [];
    let cursor: string | null = null;
    const seen = new Set<string>();
    do {
      const pageUrl = new URL(`${base.origin}${prefix}${target}`);
      pageUrl.searchParams.set('limit', '100');
      if (cursor) pageUrl.searchParams.set('after', cursor);
      const page = await checkedJson<{items: T[]; next_cursor: string | null}>(await send(pageUrl.pathname.slice(prefix.length) + pageUrl.search));
      items.push(...page.items);
      cursor = page.next_cursor;
      if (cursor && seen.has(cursor)) throw new Error('Repeated pagination cursor');
      if (cursor) seen.add(cursor);
    } while (cursor);
    return items;
  };
  try {
    if (path === '/auth/ws-ticket') path = '/ws/ticket';
    path = path.replace(/^\/auth\/me(?=\/|$)/, '/me');
    if (path === '/me/bio') { path = '/me'; method = 'PATCH'; }
    if (path === '/me' && method === 'PUT') method = 'PATCH';
    if (path === '/me/security/session-duration') { path = '/me/security'; method = 'PATCH'; }
    if (path === '/me/privacy' && method === 'PUT') method = 'PATCH';
    if (path === '/me/password' && method === 'POST') method = 'PUT';
    if (path === '/me/sessions/others') path = '/me/sessions';
    const blocked = path.match(/^\/me\/blocked-users\/([^/]+)$/);
    if (blocked) {
      path = `/me/blocked-users/${(await lookupUser(blocked[1])).id}`;
      if (method === 'POST') method = 'PUT';
    }
    if (path.includes('/privacy/exceptions/') && Array.isArray(data.usernames)) {
      data = { user_ids: await Promise.all(data.usernames.map(async (name: string) => (await lookupUser(name)).id)) };
    }
    if (path === '/me/privacy' && method === 'PATCH') {
      data = { ...data };
      delete data.privacy_exceptions;
      for (const key of ['avatar_visibility', 'profile_visibility', 'presence_visibility', 'group_invites']) {
        if (data[key] === 'shared_chats') data[key] = 'contacts';
      }
    }
    if (path === '/users/search') path = '/users';
    const userPath = path.match(/^\/users\/users\/([^/]+)(.*)$/);
    if (userPath) {
      const user = await lookupUser(userPath[1]);
      if (!userPath[2]) {
        const chats = await allPages<S['Chat']>('/chats');
        return jsonResponse({ ...userModel(user), direct_chat_id: chats.find(chat => chat.peer?.id === user.id)?.id }, undefined);
      }
      path = `/users/${user.id}${userPath[2]}`;
      if (userPath[2] === '/contact-name' && method === 'PUT') data = { contact_name: data.display_name };
    }
    const avatar = path.match(/^\/users\/avatar\/([^/]+)$/);
    if (avatar) return jsonResponse({ avatar_url: (await lookupUser(avatar[1])).avatar_url });
    const directList = /^\/chats\/list\//.test(path);
    const groupList = /^\/groups\/list\//.test(path);
    if (directList || groupList) {
      const chats = await allPages<S['Chat']>('/chats');
      return jsonResponse(directList
        ? { chats: chats.filter(chat => chat.type === 'direct').map(directChatModel) }
        : { groups: chats.filter(chat => chat.type === 'group').map(groupChatModel) });
    }
    if (path === '/chats/create') {
      path = '/chats';
      data = { user_id: (await lookupUser(data.user2 || '')).id, initial_message: data.initial_message };
    }
    if (path === '/requests/inbox') {
      const requests = await allPages<S['ApprovalRequest']>('/requests');
      return jsonResponse({
        requests: requests.map(item => ({ ...item, requester: userModel(item.requester), message_text: item.preview })),
        unread_count: requests.length,
      });
    }
    if (path === '/groups/create') {
      path = '/groups';
      const memberIds = await Promise.all((data.participants || []).map(async name => (await lookupUser(name)).id));
      data = { name: data.name, description: data.description, member_ids: memberIds };
    }
    path = path.replace(/^\/groups\/delete\/(\d+)$/, '/groups/$1');
    if (/^\/groups\/\d+\/leave$/.test(path)) method = 'POST';
    if (/^\/groups\/\d+\/(participants|transfer-owner)$/.test(path) && data.username) {
      data = { user_id: (await lookupUser(data.username)).id };
    }
    const participant = path.match(/^(\/groups\/\d+\/participants)\/([^/]+)(\/role)?$/);
    if (participant) path = `${participant[1]}/${(await lookupUser(participant[2])).id}`;
    if (form && (/^\/me\/avatar$/.test(path) || /^\/groups\/\d+\/avatar$/.test(path))) {
      const upload = new FormData();
      upload.set('file', form.get('file')!); upload.set('purpose', 'avatar');
      const attachment = await checkedJson<S['Attachment']>(await send('/attachments', 'POST', undefined, upload));
      data = { attachment_id: attachment.id }; form = undefined; method = 'PUT';
    }
    const history = path.match(/^\/messages\/history\/(\d+)$/);
    if (history) {
      path = `/chats/${history[1]}/messages`;
      for (const direction of ['before', 'after', 'around']) {
        const cursor = url.searchParams.get(`${direction}_id`);
        if (cursor) url.searchParams.set(direction, cursor);
        url.searchParams.delete(`${direction}_id`);
      }
    }
    const media = path.match(/^\/messages\/(photos|audios|search)\/(\d+)$/);
    if (media) {
      path = `/chats/${media[2]}/${media[1] === 'search' ? 'messages/search' : 'media'}`;
      if (media[1] !== 'search') url.searchParams.set('kind', media[1] === 'photos' ? 'image' : 'audio');
      const items = await allPages<S['Message'] | S['SearchHit']>(path + url.search);
      return jsonResponse(mediaScreenModel(items, media[1]));
    }
    const read = path.match(/^\/chats\/(\d+)\/read$/);
    let readIds: string[] = [];
    if (read) {
      readIds = (data.message_ids || []).map(String);
      if (data.mark_all) {
        const page = await checkedJson<S['MessagePage']>(await send(`/chats/${read[1]}/messages?limit=1`));
        readIds = page.items.map(item => item.id);
      }
      if (!readIds.length) return jsonResponse({ chat_id: read[1], read_message_ids: [], unread_count: 0 });
      data = { message_id: readIds.reduce((a, b) => BigInt(a) > BigInt(b) ? a : b) };
    }
    if (path === '/messages/forward') {
      path = `/messages/${data.source_message_id}/forward`; data = { chat_ids: (data.target_chat_ids || []).map(String) };
    }
    if (/^\/messages\/\d+\/delete-for-me$/.test(path)) { path = path.replace('/delete-for-me', ''); method = 'DELETE'; url.searchParams.set('scope', 'me'); }
    else if (/^\/messages\/\d+$/.test(path) && method === 'DELETE') url.searchParams.set('scope', 'everyone');
    if (form) headers.delete('Content-Type');
    else if (!['GET', 'HEAD'].includes(method) && body === undefined && Object.keys(data).length) { body = JSON.stringify(data); headers.set('Content-Type', 'application/json'); }
    const response = await nativeFetch(`${base.origin}${prefix}${path}${url.search}`, {
      method, headers, body: form || body, credentials: request.credentials, signal: request.signal,
    });
    if (!response.ok) return response;
    if (read) return jsonResponse({ chat_id: read[1], read_message_ids: readIds, unread_count: 0, read_at: new Date().toISOString() }, response);
    if (response.status === 204) return jsonResponse({ message: 'Success' }, response);
    if (!response.headers.get('Content-Type')?.includes('json')) return response;
    const result = await response.clone().json();
    if (path === '/me/privacy' || path.includes('/privacy/exceptions/')) {
      const exceptions: Record<string, {allow: unknown[]; deny: unknown[]}> = {};
      for (const key of ['avatar_visibility', 'profile_visibility', 'presence_visibility', 'group_invites']) {
        if (result[key] === 'contacts') result[key] = 'shared_chats';
        const source = result.exceptions?.[key] || { allow: [], deny: [] };
        exceptions[key] = { allow: [], deny: [] };
        for (const effect of ['allow', 'deny'] as const) {
          exceptions[key][effect] = await Promise.all(source[effect].map(async (id: string) => userModel(await checkedJson<S['User']>(await send(`/users/${id}`)))));
        }
      }
      return jsonResponse({ ...result, privacy_exceptions: exceptions }, response);
    }
    if (path === '/me' || /^\/users\/\d+$/.test(path) || path.endsWith('/contact-name')) return jsonResponse(userModel(result), response);
    if (path === '/users' || path === '/me/blocked-users') {
      const users = (result.items || []).map(userModel);
      return jsonResponse(originalPath === '/users' ? users : { users }, response);
    }
    if (/^\/users\/\d+\/avatars$/.test(path)) return jsonResponse({ avatars: (result.items || result).map((item: S['AvatarVersion'], i: number) => ({ ...item, avatar_url: item.url, is_current: i === 0 })) }, response);
    if (path === '/me/sessions') return jsonResponse({ sessions: (result.items || result).map((item: S['Session']) => ({ ...item, user_agent: item.device || '', last_active_at: item.last_used_at })) }, response);
    if (path === '/chats' && method === 'POST') return jsonResponse(response.status === 202
      ? { message: 'Approval required', approval_required: true, request_id: result.id }
      : { ...result, chat_id: result.id, message: 'Chat created' }, response);
    if (/^\/chats\/\d+$/.test(path)) return jsonResponse({ ...result, participants: result.peer ? [userModel(result.peer)] : [], type: result.type === 'direct' ? 'private' : 'group', createdAt: result.created_at }, response);
    if (/^\/groups(?:\/\d+)?$/.test(path) || /^\/groups\/\d+\/(avatar|participants|transfer-owner)/.test(path)) return jsonResponse(groupModel(result), response);
    if (history) {
      const after = url.searchParams.has('after');
      return jsonResponse({
        history: result.items.map(messageModel), has_more: !!result.next_cursor,
        has_more_before: !!(after ? result.prev_cursor : result.next_cursor),
        has_more_after: !!(after ? result.next_cursor : result.prev_cursor),
        next_before_id: after ? result.prev_cursor : result.next_cursor,
        next_after_id: after ? result.next_cursor : result.prev_cursor,
      }, response);
    }
    if (/^\/messages\/\d+$/.test(path) && method === 'PATCH') return jsonResponse(messageModel(result), response);
    return response;
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
};
