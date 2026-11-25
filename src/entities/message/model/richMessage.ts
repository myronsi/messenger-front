import type { Translations } from '@/shared/contexts/LanguageContext';
import type { MessageLocation, MessagePoll, PollCreate, RichFields, RichSend } from './richTypes';

type RichWords = Pick<Translations, 'contactShare' | 'locationShare'>;
type Place = Pick<MessageLocation, 'latitude' | 'longitude' | 'title'>;

export const hasRichContent = (message: RichFields & { is_deleted?: boolean }) =>
  !message.is_deleted && !!(message.poll || message.contact || message.location);

export const draftPoll = (create: PollCreate): MessagePoll => ({
  question: create.question,
  options: create.options.map((text) => ({ text, voter_count: null })),
  multiple_answers: create.multiple_answers,
  anonymous: create.anonymous,
  quiz: !!create.quiz,
  explanation: null,
  close_at: create.close_at ?? null,
  closed_at: null,
  total_voters: null,
  my_votes: [],
  can_close: false,
  version: 0,
});

export const richFields = (send: RichSend): RichFields => {
  if (send.type === 'poll') return { poll: draftPoll(send.poll), outgoing: send };
  if (send.type === 'contact') return { contact: { user_id: send.contact.user_id, user: send.user ?? null }, outgoing: send };
  const { latitude, longitude, accuracy_m, title } = send.location;
  return { location: { latitude, longitude, accuracy_m: accuracy_m ?? null, title: title ?? null, map: null }, outgoing: send };
};

export const richSendBody = (send: RichSend) => {
  if (send.type === 'poll') return { type: 'poll' as const, poll: send.poll };
  if (send.type === 'contact') return { type: 'contact' as const, contact: send.contact };
  return { type: 'location' as const, location: send.location };
};

export const richSummary = (send: RichSend) => {
  if (send.type === 'poll') return `📊 ${send.poll.question}`;
  if (send.type === 'contact') return send.user ? `👤 @${send.user.username}` : '👤';
  return `📍 ${send.location.title ?? ''}`.trim();
};

export const richLabel = (message: RichFields, words: RichWords): string | null => {
  if (message.poll) return `📊 ${message.poll.question}`;
  if (message.location) return `📍 ${message.location.title || words.locationShare.label}`;
  if (message.contact) return `👤 ${message.contact.user?.display_name || words.contactShare.label}`;
  return null;
};

const coordinate = (value: number) => String(Math.round(value * 1e6) / 1e6);

export const locationLinks = ({ latitude, longitude, title }: Place) => {
  const lat = coordinate(latitude), lon = coordinate(longitude);
  return {
    openStreetMap: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`,
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    appleMaps: `https://maps.apple.com/?ll=${lat},${lon}&q=${encodeURIComponent(title || `${lat},${lon}`)}`,
  };
};

export const richCopyText = (message: RichFields): string | null => {
  if (message.poll) return message.poll.question;
  if (message.location) {
    const link = locationLinks(message.location).openStreetMap;
    return message.location.title ? `${message.location.title}\n${link}` : link;
  }
  if (message.contact) return message.contact.user ? `@${message.contact.user.username}` : null;
  return null;
};

export const isPollClosed = (poll: MessagePoll, now = Date.now()) =>
  !!poll.closed_at || (!!poll.close_at && Date.parse(poll.close_at) <= now);

export const pollShowsResults = (poll: MessagePoll) =>
  poll.total_voters !== null || poll.options.some((option) => option.voter_count !== null);
