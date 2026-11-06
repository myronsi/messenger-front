export class ApiProblem extends Error {
  constructor(readonly status: number, readonly problem: unknown, message = 'The server rejected this request.') { super(message); }
}

const field = <T extends 'string' | 'number'>(value: unknown, name: string, type: T, depth = 0): (T extends 'string' ? string : number) | undefined => {
  if (typeof value !== 'object' || value === null || depth > 3) return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record[name] === type) return record[name] as T extends 'string' ? string : number;
  return field(record.problem, name, type, depth + 1) ?? field(record.data, name, type, depth + 1) ?? field(record.error, name, type, depth + 1);
};

export const problemCode = (error: unknown) => field(error, 'code', 'string');
export const problemDetail = (error: unknown) => field(error, 'detail', 'string');
export const problemStatus = (error: unknown) => field(error, 'status', 'number');
export const isTwoFactorRequired = (error: unknown) => problemCode(error) === 'two_factor_required';
