import type { components } from '@/shared/api/generated/schema';

// The backend answers every error with application/problem+json (the contract's Problem). `code` is stable
// and meant for code; `detail` is a sentence for people; `errors` names the fields a validation failed on.
export type Problem = components['schemas']['Problem'];
export type ErrorCode = components['schemas']['ErrorCode'];

export interface ApiError {
  status?: number | string;
  data?: Partial<Problem>;
  message?: string;
}

// RTK Query rejects with a FetchBaseQueryError-like object; anything else is wrapped so callers can read `.message`.
export const asApiError = (error: unknown): ApiError => (
  typeof error === 'object' && error !== null ? error as ApiError : { message: String(error) }
);

const problemOf = (error: unknown): Partial<Problem> | undefined => {
  const data = asApiError(error).data;
  return typeof data === 'object' && data !== null ? data : undefined;
};

// apiErrorCode is the problem's code, for decisions ("two_factor_required", "approval_required", ...).
export const apiErrorCode = (error: unknown): ErrorCode | undefined => problemOf(error)?.code;

// apiErrorMessage is what to show: the problem's detail, else its first field error, else the caller's
// fallback (the title is only the HTTP status in words, "Unauthorized", which says less than the caller's
// "Login failed"). Network failures (no problem at all) get the fallback too.
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  const problem = problemOf(error);
  return problem?.detail?.trim()
    || problem?.errors?.find((e) => e.message?.trim())?.message
    || fallback
    || problem?.title?.trim()
    || '';
};

// readProblem parses a fetch Response that failed; it never throws.
export const readProblem = async (response: Response): Promise<Partial<Problem> | undefined> => {
  try {
    const body: unknown = await response.clone().json();
    return typeof body === 'object' && body !== null ? body as Partial<Problem> : undefined;
  } catch {
    return undefined;
  }
};

// errorFromResponse shapes a failed fetch Response like an RTK Query error, so apiErrorMessage works on both.
export const errorFromResponse = async (response: Response): Promise<ApiError> => ({
  status: response.status,
  data: await readProblem(response),
});
