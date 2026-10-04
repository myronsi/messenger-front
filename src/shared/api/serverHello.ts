import type { ServerHelloEvent } from '@myronsi/messenger-api';
import { reportServerVersions } from './updateGate';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

// `hello` is the first server event on every WebSocket. The Go backend nests the versions in `data`
// (see ServerHelloEvent); the Python backend sends them at the top level.
export const handleHelloEvent = (raw: unknown): boolean => {
  if (!isRecord(raw) || raw.type !== 'hello') return false;
  const payload: Partial<ServerHelloEvent['data']> = isRecord(raw.data) ? raw.data : raw;
  reportServerVersions({ apiVersion: payload.api_version, minClientApiVersion: payload.min_client_api_version });
  return true;
};