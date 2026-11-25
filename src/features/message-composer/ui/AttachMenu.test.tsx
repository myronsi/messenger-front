import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import { AttachMenu } from './AttachMenu';

const attach = vi.hoisted(() => vi.fn());

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/entities/message', () => ({ requestAttach: attach }));

const open = () => fireEvent.pointerDown(screen.getByTestId('attach-menu-button'), { button: 0, ctrlKey: false });

beforeEach(() => attach.mockReset());

describe('AttachMenu', () => {
  it('opens the file picker at once where only files can be sent', () => {
    const pickFile = vi.fn();
    render(<AttachMenu chatId="5" disabled={false} onPickFile={pickFile} />);
    fireEvent.click(screen.getByRole('button', { name: 'Attach file' }));
    expect(pickFile).toHaveBeenCalledTimes(1);
  });

  it('offers a photo or file, a poll, a location and a contact', () => {
    const pickFile = vi.fn();
    const send = vi.fn();
    render(<AttachMenu chatId="5" disabled={false} onPickFile={pickFile} onSendRich={send} />);
    open();
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Photo or file', 'Poll', 'Location', 'Contact']);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Poll' }));
    expect(attach).toHaveBeenCalledWith({ kind: 'poll', chatId: '5', onSend: send });
    open();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Photo or file' }));
    expect(pickFile).toHaveBeenCalledTimes(1);
  });

  it('stays closed while the composer is disabled', () => {
    render(<AttachMenu chatId="5" disabled onPickFile={vi.fn()} onSendRich={vi.fn()} />);
    open();
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });
});
