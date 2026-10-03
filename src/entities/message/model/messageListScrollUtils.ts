import { Message } from './types';
import { parseUtcDate } from '@/shared/utils/dateFormatters';

export const isValidTimestamp = (timestamp: string | undefined | null) => {
  if (!timestamp) return false;
  return !Number.isNaN(parseUtcDate(timestamp).getTime());
};

export const getAppendedMessages = (previous: Message[], next: Message[]) => {
  if (!previous.length) return [];
  const previousLastId = previous[previous.length - 1].id;
  const index = next.findIndex((item) => item.id === previousLastId);
  return index >= 0 ? next.slice(index + 1) : [];
};