import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import { ChatCleanupDialog } from './ChatCleanupDialog';
import { offersEveryone, type CleanupRequest } from '../model/useChatCleanup';

vi.mock('@/shared/ui/ModalSurface', () => ({ ModalSurface: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const target = { chatId: '5', name: 'Anna', isGroup: false, isSaved: false, canClearForEveryone: false };
const renderDialog = (request: CleanupRequest, onConfirm = vi.fn()) => {
  render(<LanguageProvider><ChatCleanupDialog request={request} onCancel={vi.fn()} onConfirm={onConfirm} /></LanguageProvider>);
  return onConfirm;
};

describe('ChatCleanupDialog', () => {
  it('deletes for me by default and for both when the box is ticked', () => {
    const onConfirm = renderDialog({ kind: 'delete', target });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Also delete for Anna' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it('offers clearing for everyone in groups only to owners and admins, and never in Saved Messages', () => {
    expect(offersEveryone({ kind: 'clear', target: { ...target, isGroup: true } })).toBe(false);
    expect(offersEveryone({ kind: 'clear', target: { ...target, isGroup: true, canClearForEveryone: true } })).toBe(true);
    expect(offersEveryone({ kind: 'delete', target: { ...target, isGroup: true, canClearForEveryone: true } })).toBe(false);
    expect(offersEveryone({ kind: 'clear', target: { ...target, isSaved: true } })).toBe(false);
    const onConfirm = renderDialog({ kind: 'clear', target: { ...target, isGroup: true } });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onConfirm).toHaveBeenCalledWith(false);
  });
});
