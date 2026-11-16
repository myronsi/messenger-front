import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TimeZoneSetting } from './TimeZoneSetting';

const setTimeZone = vi.fn(() => ({ unwrap: async () => undefined }));

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/api/currentUserApi', () => ({
  useGetCurrentUserQuery: () => ({ data: { time_zone: 'UTC' }, refetch: vi.fn() }),
}));
vi.mock('@/shared/api/syncTimeZone', () => ({ deviceTimeZone: () => 'Europe/Berlin' }));
vi.mock('../api/profileExtrasApi', () => ({ useSetMyTimeZoneMutation: () => [setTimeZone, { isLoading: false }] }));

it('lists time zones in order and offers the device zone', () => {
  render(<TimeZoneSetting />);
  const names = within(screen.getByLabelText('Time zone')).getAllByRole('option').map((option) => option.getAttribute('value'));
  expect(names).toEqual([...names].sort((a, b) => String(a).localeCompare(String(b))));
  expect(names).toContain('Europe/Berlin');
  fireEvent.click(screen.getByRole('button', { name: "Use this device's time zone" }));
  expect(setTimeZone).toHaveBeenCalledWith('Europe/Berlin');
});
