import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BlockUserDialog } from './BlockUserDialog';

vi.mock('@/shared/ui/ModalSurface', () => ({ ModalSurface: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});

describe('BlockUserDialog', () => {
  it('explains the block and keeps the chat unless the box is ticked', () => {
    const onConfirm = vi.fn();
    render(<BlockUserDialog name="Anna" canDeleteChat onCancel={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.getByText('Block Anna?')).toBeInTheDocument();
    expect(screen.getByText("Anna can't write to you, call you or add you to groups.")).toBeInTheDocument();
    const box = screen.getByRole('checkbox', { name: 'Also delete the chat' });
    expect(box).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Block' }));
    expect(onConfirm).toHaveBeenLastCalledWith(false);
    fireEvent.click(box);
    fireEvent.click(screen.getByRole('button', { name: 'Block' }));
    expect(onConfirm).toHaveBeenLastCalledWith(true);
  });

  it('offers no chat deletion without a chat and shows errors', () => {
    render(<BlockUserDialog name="Anna" canDeleteChat={false} error="Couldn't block Anna. Try again." onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't block Anna. Try again.");
  });
});
