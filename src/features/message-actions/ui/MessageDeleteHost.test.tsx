import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import { closeMessageDelete, requestMessageDelete } from '../model/deleteRequest';
import { MessageDeleteHost } from './MessageDeleteHost';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));

const ask = (forEveryone: boolean, direct = true, chatId = '5') => {
  const request = { chatId, forEveryone, direct, deleteForMe: vi.fn(), deleteForEveryone: vi.fn() };
  act(() => requestMessageDelete(request));
  return request;
};

afterEach(() => act(() => closeMessageDelete()));

describe('MessageDeleteHost', () => {
  it('deletes only for me while the box stays clear', () => {
    render(<MessageDeleteHost chatId="5" peerName="Anna" />);
    const request = ask(true);
    expect(screen.getByTestId('action-dialog')).toHaveTextContent('Delete message?');
    expect(screen.getByRole('checkbox', { name: 'Also delete for Anna' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(request.deleteForMe).toHaveBeenCalledTimes(1);
    expect(request.deleteForEveryone).not.toHaveBeenCalled();
    expect(screen.queryByTestId('action-dialog')).not.toBeInTheDocument();
  });

  it('deletes for everyone in a group when the box is ticked', () => {
    render(<MessageDeleteHost chatId="5" />);
    const request = ask(true, false);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Delete for everyone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(request.deleteForEveryone).toHaveBeenCalledTimes(1);
    expect(request.deleteForMe).not.toHaveBeenCalled();
  });

  it('shows no box when only deleting for me is allowed, and cancels', () => {
    render(<MessageDeleteHost chatId="5" peerName="Anna" />);
    const request = ask(false);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(request.deleteForMe).not.toHaveBeenCalled();
    expect(screen.queryByTestId('action-dialog')).not.toBeInTheDocument();
  });

  it('ignores a request for another chat', () => {
    render(<MessageDeleteHost chatId="5" />);
    ask(true, true, '6');
    expect(screen.queryByTestId('action-dialog')).not.toBeInTheDocument();
  });

  it('deletes fully in Saved Messages without asking for whom', () => {
    render(<MessageDeleteHost chatId="5" peerName="Me" savedChat />);
    const request = ask(true);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(request.deleteForEveryone).toHaveBeenCalledTimes(1);
    expect(request.deleteForMe).not.toHaveBeenCalled();
  });
});
