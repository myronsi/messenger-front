const BASE_URL = import.meta.env.VITE_BASE_URL?.replace(/\/$/, "")
export const DEFAULT_AVATAR = `${BASE_URL}/static/avatars/default.jpg`;
export const DEFAULT_GROUP_AVATAR = `/static/avatars/group.png`;
export const DELETED_AVATAR = `${BASE_URL}/static/avatars/deleted.jpg`;
