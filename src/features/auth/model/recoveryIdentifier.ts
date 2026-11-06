export const usernameFromIdentifier = (identifier: string) => {
  const value = identifier.trim();
  return value.includes('@') ? '' : value.toLowerCase();
};
