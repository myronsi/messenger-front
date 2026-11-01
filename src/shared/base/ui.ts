const apiUrl = import.meta.env.VITE_BASE_URL?.replace(/\/$/, "");
const BASE_URL = /\/api\/v2$/.test(apiUrl || '') ? '' : apiUrl;
export const DEFAULT_AVATAR = `${BASE_URL}/static/avatars/default.jpg`;
export const DEFAULT_GROUP_AVATAR = `${BASE_URL}/static/avatars/group.png`;
export const DELETED_AVATAR = `${BASE_URL}/static/avatars/deleted.jpg`;
