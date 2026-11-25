import type { EntityId } from '@/shared/api/entityId';
import type { components } from '@/shared/api/generated/schema';

export type MessagePoll = components['schemas']['Poll'];
export type PollCreate = components['schemas']['PollCreate'];
export type LocationCreate = components['schemas']['LocationCreate'];

export interface ContactUser {
  id: EntityId;
  username: string;
  display_name: string;
  avatar_url?: string;
  is_deleted?: boolean;
}

export interface MessageContact {
  user_id: EntityId;
  user: ContactUser | null;
}

export interface MessageLocation {
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  title: string | null;
  map: { url: string; width: number; height: number } | null;
}

export type RichSend =
  | { type: 'poll'; poll: PollCreate }
  | { type: 'contact'; contact: { user_id: string }; user?: ContactUser }
  | { type: 'location'; location: LocationCreate };

export interface RichFields {
  poll?: MessagePoll;
  contact?: MessageContact;
  location?: MessageLocation;
  outgoing?: RichSend;
}
