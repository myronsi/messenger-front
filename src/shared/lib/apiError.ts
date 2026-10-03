export interface ApiError {
  status?: number | string;
  data?: { detail?: string };
  message?: string;
}

// RTK Query rejects with a FetchBaseQueryError-like object; anything else is wrapped so callers can read `.message`.
export const asApiError = (error: unknown): ApiError => (
  typeof error === 'object' && error !== null ? error as ApiError : { message: String(error) }
);
