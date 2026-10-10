// Compile-time checks of the contract helpers (no runtime code).
import type { BodyOf, QueryOf, ResponseOf, Schema } from './contract';

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const check = <T extends true>() => undefined as unknown as T;

check<Equals<ResponseOf<'getMe'>, Schema<'Me'>>>();
check<Equals<ResponseOf<'deleteMe'>, void>>();
check<Equals<ResponseOf<'createChat'>, Schema<'Chat'>>>();
check<Equals<BodyOf<'updateMe'>, Schema<'UpdateMeRequest'>>>();
check<Equals<QueryOf<'searchUsers'>['q'], string>>();
