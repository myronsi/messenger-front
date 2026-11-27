import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import { ImportChatDialog } from './ImportChatDialog';
import { chatFile, importChat, importMe, pickFile, runningImport } from './importDialogTestKit';

const calls = vi.hoisted(() => ({ createGroup: vi.fn(), start: vi.fn(), get: vi.fn(), addMessages: vi.fn(), finish: vi.fn(), remove: vi.fn() }));

vi.mock('../api/importApi', () => ({ importCalls: calls }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/entities/chat', () => ({
  useGetOneOnOneChatsQuery: () => ({ data: undefined }),
  useGetGroupChatsQuery: () => ({ data: undefined }),
  useGetGroupDetailsQuery: () => ({ data: undefined }),
}));

const startImport = async (onOpenChange = vi.fn()) => {
  render(<ImportChatDialog open onOpenChange={onOpenChange} me={importMe} chat={importChat} />);
  pickFile(chatFile());
  fireEvent.click(await screen.findByRole('button', { name: en.chatImport.actions.next }));
  fireEvent.click(screen.getByRole('button', { name: en.chatImport.actions.start }));
  return onOpenChange;
};

const setLocks = (value: unknown) => Object.defineProperty(navigator, 'locks', { value, configurable: true });

beforeEach(() => {
  localStorage.clear();
  Object.values(calls).forEach((call) => call.mockReset());
  calls.start.mockResolvedValue({ data: runningImport });
  calls.addMessages.mockImplementation(() => new Promise(() => undefined));
  calls.remove.mockResolvedValue({ data: null });
});

afterEach(() => {
  localStorage.clear();
  setLocks(undefined);
});

describe('ImportChatDialog while importing', () => {
  it('does not close on Escape or an outside click and asks how to stop instead', async () => {
    const onOpenChange = await startImport();
    await screen.findByText(en.chatImport.progress.keepOpen);
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId('import-chat-dialog'), { key: 'Escape' });
    expect(await screen.findByTestId('import-stop-panel')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.stop.keep }));
    expect(screen.queryByTestId('import-stop-panel')).not.toBeInTheDocument();
  });

  it('pauses, keeps the import to continue later and then lets the window close', async () => {
    const onOpenChange = await startImport();
    fireEvent.click(await screen.findByRole('button', { name: en.chatImport.stop.action }));
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.stop.pause }));
    expect(await screen.findByRole('alert')).toHaveTextContent(en.chatImport.stop.paused);
    expect(localStorage.getItem('chat-import:pending')).toContain('"importId":"9"');
    expect(calls.remove).not.toHaveBeenCalled();
    const closeButtons = screen.getAllByRole('button', { name: en.chatImport.actions.close });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('stops and removes the imported part', async () => {
    const onOpenChange = await startImport();
    fireEvent.click(await screen.findByRole('button', { name: en.chatImport.stop.action }));
    fireEvent.click(screen.getByRole('button', { name: en.chatImport.stop.remove }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(calls.remove).toHaveBeenCalledWith('9');
    expect(localStorage.getItem('chat-import:pending')).toBeNull();
  });

  it('refuses to start while another tab is importing', async () => {
    setLocks({ request: async (_name: string, _options: unknown, callback: (lock: unknown) => Promise<unknown>) => callback(null) });
    await startImport();
    expect(await screen.findByRole('alert')).toHaveTextContent(en.chatImport.errors.otherTab);
    expect(calls.start).not.toHaveBeenCalled();
  });

  it('explains that another import of the user is still running', async () => {
    const message = 'another import of yours is still running; finish or remove it first';
    calls.start.mockResolvedValue({ error: { status: 409, data: { code: 'conflict', errors: [{ message }] } } });
    await startImport();
    expect(await screen.findByRole('alert')).toHaveTextContent(en.chatImport.errors.busy);
  });

  it('warns before the tab closes while importing', async () => {
    await startImport();
    await screen.findByText(en.chatImport.progress.keepOpen);
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
