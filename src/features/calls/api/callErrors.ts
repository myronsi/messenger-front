import { ApiProblem, problemCode } from '@/shared/api/problem';

export const callErrorCode = (error: unknown) => problemCode(error);
export const callErrorStatus = (error: unknown) => (error instanceof ApiProblem ? error.status : undefined);
