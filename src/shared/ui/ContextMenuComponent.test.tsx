import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContextMenuComponent from './ContextMenuComponent';

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { deleteMessage: 'Delete', deleteForMe: 'Delete for me', deleteForEveryone: 'Delete for everyone', deleteForMeShort: 'For me', deleteForEveryoneShort: 'For everyone', replyToMessage: 'Reply', copy: 'Copy', forward: 'Forward', selectMessage: 'Select', editMessage: 'Edit' } }),
}));

const renderMenu = (props: { onDeleteForMe?: () => void; onDeleteForEveryone?: () => void }) => render(
  <ContextMenuComponent ref={createRef<HTMLDivElement>()} x={10} y={10} isMine onReply={vi.fn()} isClosing={false} onClose={vi.fn()} {...props} />,
);

describe('ContextMenuComponent delete', () => {
  it('opens the delete step inside the menu and can go back', () => {
    const onDeleteForMe = vi.fn();
    const onDeleteForEveryone = vi.fn();
    renderMenu({ onDeleteForMe, onDeleteForEveryone });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDeleteForMe).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Reply' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Delete', 'For me', 'For everyone']);
    fireEvent.click(screen.getByRole('button', { name: 'For everyone' }));
    expect(onDeleteForEveryone).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument();
  });

  it('deletes for me right away when that is the only choice', () => {
    const onDeleteForMe = vi.fn();
    renderMenu({ onDeleteForMe });
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete for me' }));
    expect(onDeleteForMe).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'For everyone' })).not.toBeInTheDocument();
  });
});

describe('ContextMenuComponent order', () => {
  it('lists reply, copy, forward, select and edit, then delete last after a separator', () => {
    const { container } = render(
      <ContextMenuComponent ref={createRef<HTMLDivElement>()} x={10} y={10} isMine onReply={vi.fn()} onCopy={vi.fn()} onForward={vi.fn()}
        onSelect={vi.fn()} onEdit={vi.fn()} onDeleteForMe={vi.fn()} onDeleteForEveryone={vi.fn()} isClosing={false} onClose={vi.fn()} />,
    );
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Reply', 'Copy', 'Forward', 'Select', 'Edit', 'Delete']);
    expect(container.querySelector('.border-t')?.nextElementSibling).toHaveTextContent('Delete');
  });

  it('shows no separator without a delete action', () => {
    const { container } = renderMenu({});
    expect(container.querySelector('.border-t')).toBeNull();
  });
});

describe('ContextMenuComponent placement', () => {
  const place = (y: number) => {
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
    const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150);
    render(<ContextMenuComponent ref={createRef<HTMLDivElement>()} x={100} y={y} isMine onReply={vi.fn()} isClosing={false} onClose={vi.fn()} />);
    height.mockRestore();
    width.mockRestore();
    return screen.getByRole('menu').style.top;
  };

  it('opens down from the tap when there is room below', () => {
    expect(place(300)).toBe('300px');
  });

  it('flips above the tap, leaving room for the reaction bar, when it would run off the bottom', () => {
    expect(place(window.innerHeight - 50)).toBe(`${window.innerHeight - 50 - 200 - 48}px`);
  });
});
