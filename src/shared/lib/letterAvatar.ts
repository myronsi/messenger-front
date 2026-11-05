const PALETTE: [string, string][] = [
  ['#ff885e', '#ff516a'],
  ['#ffcd6a', '#ffa85c'],
  ['#82b1ff', '#665fff'],
  ['#a0de7e', '#54cb68'],
  ['#53edd6', '#28c9b7'],
  ['#72d5fd', '#2a9ef1'],
  ['#e0a2f3', '#d669ed'],
  ['#ffaac9', '#f06292'],
];

const DEFAULT_AVATAR_PATH = /\/static\/avatars\/(?:default\.jpg|group\.png)(?:[?#].*)?$/;

export const isDefaultAvatar = (url?: string | null) => !!url && DEFAULT_AVATAR_PATH.test(url);

export const avatarInitial = (name: string) => {
  const first = Array.from(name.trim().replace(/^@+/, ''))[0];
  return first ? first.toLocaleUpperCase() : '?';
};

const hash = (value: string) => {
  let result = 0;
  for (const character of value) result = (result * 31 + character.codePointAt(0)!) >>> 0;
  return result;
};

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const letterAvatar = (name: string) => {
  const [top, bottom] = PALETTE[hash(name.trim().toLowerCase()) % PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>`
    + `<rect width="64" height="64" fill="url(#g)"/>`
    + `<text x="32" y="32" dy="0.35em" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="28" font-weight="600" fill="#fff">${escapeXml(avatarInitial(name))}</text>`
    + `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
