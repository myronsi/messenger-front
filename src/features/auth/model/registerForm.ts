export const REGISTER_STEPS = ['account', 'recovery', 'passkey', 'profile'] as const;
export type RegisterStep = typeof REGISTER_STEPS[number];
export const OPTIONAL_REGISTER_STEPS: readonly RegisterStep[] = ['passkey', 'profile'];

export type RegisterField = 'username' | 'displayName' | 'password';
export type RegisterFieldError = 'usernameShort' | 'usernameChars' | 'usernameTaken' | 'displayNameLength' | 'passwordLength' | 'passwordWeak';
export type RegisterFieldErrors = Partial<Record<RegisterField, RegisterFieldError>>;
export type AccountField = 'username' | 'password';
export type RegisterValues = Record<AccountField, string>;

export const REGISTER_FIELDS: readonly AccountField[] = ['username', 'password'];

export const PASSWORD_RULES = ['length', 'lower', 'upper', 'digit', 'special'] as const;
export type PasswordRule = typeof PASSWORD_RULES[number];

export const passwordChecks = (value: string): Record<PasswordRule, boolean> => {
  const length = [...value].length;
  return {
    length: length >= 8 && length <= 128,
    lower: /\p{Ll}/u.test(value),
    upper: /\p{Lu}/u.test(value),
    digit: /\p{Nd}/u.test(value),
    special: /[^\p{L}\p{N}]/u.test(value),
  };
};

export const normalizeUsername = (value: string) => value.trim().toLowerCase();
export const normalizeDisplayName = (value: string) => value.trim().replace(/\s+/g, ' ');

export const validateRegisterField = (field: RegisterField, value: string): RegisterFieldError | undefined => {
  if (field === 'username') {
    const username = normalizeUsername(value);
    if (username.length < 3) return 'usernameShort';
    return /^[a-z0-9_]{3,32}$/.test(username) ? undefined : 'usernameChars';
  }
  if (field === 'displayName') {
    const length = normalizeDisplayName(value).length;
    return length >= 3 && length <= 50 ? undefined : 'displayNameLength';
  }
  const checks = passwordChecks(value);
  if (!checks.length) return 'passwordLength';
  return PASSWORD_RULES.every((rule) => checks[rule]) ? undefined : 'passwordWeak';
};

export const validateRegisterValues = (values: RegisterValues): RegisterFieldErrors =>
  REGISTER_FIELDS.reduce<RegisterFieldErrors>((errors, field) => {
    const error = validateRegisterField(field, values[field]);
    return error ? { ...errors, [field]: error } : errors;
  }, {});

const SERVER_FIELDS: Record<string, RegisterField> = { username: 'username', display_name: 'displayName', password: 'password' };
const FIELD_FALLBACK: Record<RegisterField, RegisterFieldError> = {
  username: 'usernameChars', displayName: 'displayNameLength', password: 'passwordLength',
};

export const registerErrorsFromProblem = (status: number, body: unknown): RegisterFieldErrors => {
  if (status === 409) return { username: 'usernameTaken' };
  if (status !== 422 || typeof body !== 'object' || body === null) return {};
  const errors = (body as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return {};
  return errors.reduce<RegisterFieldErrors>((result, entry) => {
    const field = SERVER_FIELDS[(entry as { field?: string })?.field ?? ''];
    return field ? { ...result, [field]: FIELD_FALLBACK[field] } : result;
  }, {});
};
