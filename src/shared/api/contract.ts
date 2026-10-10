import type { components, operations } from '@/shared/api/generated/schema';

// Types of the v2 contract, by schema name or by operation id, so every endpoint is declared against the
// contract (`builder.query<ResponseOf<'getMe'>, void>`) and tsc checks requests and responses.

export type Schemas = components['schemas'];
export type Schema<Name extends keyof Schemas> = Schemas[Name];

type Operation = keyof operations;
type JsonContent<T> = T extends { content: { 'application/json': infer Body } } ? Body : never;
type SuccessResponses<O extends Operation> = operations[O]['responses'] extends infer R
  ? { [S in keyof R & (200 | 201 | 202 | 204)]: R[S] }[keyof R & (200 | 201 | 202 | 204)]
  : never;

// ResponseOf<'getMe'> is the JSON body of the operation's success response (void for 204).
export type ResponseOf<O extends Operation> = SuccessResponses<O> extends infer R
  ? R extends { content?: never } ? void : JsonContent<R>
  : never;

// BodyOf<'updateMe'> is the operation's JSON request body.
export type BodyOf<O extends Operation> = operations[O] extends { requestBody: infer B }
  ? JsonContent<NonNullable<B>>
  : never;

// QueryOf<'searchUsers'> is the operation's query parameters.
export type QueryOf<O extends Operation> = operations[O]['parameters'] extends { query?: infer Q } ? NonNullable<Q> : never;

// queryString turns query parameters into "?a=1&b=2", leaving out undefined and null values.
export const queryString = (params: Record<string, string | number | boolean | null | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

// queryFor<'searchUsers'>({ q, limit: 20 }) is queryString with the operation's parameter names checked.
export const queryFor = <O extends Operation>(params: QueryOf<O>) =>
  queryString(params as Record<string, string | number | boolean | null | undefined>);
