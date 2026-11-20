import { publicWebOrigin } from '@/shared/lib/webOrigin';

export const publicNameLink = (name: string, origin = publicWebOrigin()) => `${origin}/@${name}`;
export const inviteLink = (token: string, origin = publicWebOrigin()) => `${origin}/join/${token}`;
