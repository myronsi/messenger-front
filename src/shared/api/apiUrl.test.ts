import { describe, expect, it } from 'vitest';
import { toApiRoot, toWebSocketRoot } from './apiUrl';

describe('toApiRoot', () => {
  const origin = 'https://app.example.com';

  it.each([
    ['https://chat.example.com', 'https://chat.example.com/api/v2'],
    ['https://chat.example.com/', 'https://chat.example.com/api/v2'],
    ['https://chat.example.com/api', 'https://chat.example.com/api/v2'],
    ['https://chat.example.com/api/', 'https://chat.example.com/api/v2'],
    ['https://chat.example.com/api/v2', 'https://chat.example.com/api/v2'],
    ['https://chat.example.com/api/v2/?x=1#y', 'https://chat.example.com/api/v2'],
    ['http://127.0.0.1:8080', 'http://127.0.0.1:8080/api/v2'],
    ['/api', 'https://app.example.com/api/v2'],
    ['', 'https://app.example.com/api/v2'],
    [undefined, 'https://app.example.com/api/v2'],
  ])('%s -> %s', (configured, expected) => {
    expect(toApiRoot(configured, origin)).toBe(expected);
  });
});

describe('toWebSocketRoot', () => {
  it('swaps the scheme of the API root', () => {
    expect(toWebSocketRoot('https://chat.example.com/api/v2')).toBe('wss://chat.example.com/api/v2');
    expect(toWebSocketRoot('http://127.0.0.1:8080/api/v2')).toBe('ws://127.0.0.1:8080/api/v2');
  });

  it('accepts a configured WebSocket URL in the same forms', () => {
    expect(toWebSocketRoot('https://chat.example.com/api/v2', 'wss://ws.example.com/api')).toBe('wss://ws.example.com/api/v2');
    expect(toWebSocketRoot('https://chat.example.com/api/v2', ' ')).toBe('wss://chat.example.com/api/v2');
  });
});
