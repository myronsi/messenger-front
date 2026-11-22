import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContextMenuComponent from './ContextMenuComponent';

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { deleteMessage: 'Delete', replyToMessage: 'Reply', copy: 'Copy', forward: 'Forward', selectMessage: 'Select', editMessage: 'Edit', makeSticker: 'Make sticker', moreMessageActions: 'More', moderation: { reportMessage: 'Report' } } }),
}));

describe('ContextMenuComponent report', () => {
  it('offers Report only when the caller passes it', () => {
    const onReport = vi.fn();
    const { unmount } = render(
      <ContextMenuComponent
        ref={createRef<HTMLDivElement>()} x={10} y={10} isMine={false} onReply={vi.fn()} onReport={onReport} isClosing={false} onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Report' }));
    expect(onReport).toHaveBeenCalledTimes(1);
    unmount();
    render(<ContextMenuComponent ref={createRef<HTMLDivElement>()} x={10} y={10} isMine={false} onReply={vi.fn()} isClosing={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Report' })).not.toBeInTheDocument();
  });
});

const renderMenu = (props: { onDelete?: () => void }) => render(
  <ContextMenuComponent ref={createRef<HTMLDivElement>()} x={10} y={10} isMine onReply={vi.fn()} isClosing={false} onClose={vi.fn()} {...props} />,
);

describe('ContextMenuComponent more', () => {
  it('moves make sticker and report to a More step and can go back', () => {
    const onReport = vi.fn();
    render(
      <ContextMenuComponent ref={createRef<HTMLDivElement>()} x={10} y={10} isMine={false} onReply={vi.fn()} onForward={vi.fn()}
        onMakeSticker={vi.fn()} onReport={onReport} onDelete={vi.fn()} isClosing={false} onClose={vi.fn()} />,
    );
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Reply', 'Forward', 'More', 'Delete']);
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['More', 'Make sticker', 'Report']);
    fireEvent.click(screen.getByRole('button', { name: 'Report' }));
    expect(onReport).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument();
  });
});

describe('ContextMenuComponent delete', () => {
  it('has one Delete item that hands over to the caller without a sub-menu', () => {
    const onDelete = vi.fn();
    renderMenu({ onDelete });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'For everyone' })).not.toBeInTheDocument();
  });
});

describe('ContextMenuComponent order', () => {
  it('lists reply, copy, forward and edit, a single extra action in place of More, then delete last after a separator', () => {
    const { container } = render(
      <ContextMenuComponent ref={createRef<HTMLDivElement>()} x={10} y={10} isMine onReply={vi.fn()} onCopy={vi.fn()} onForward={vi.fn()}
        onReport={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} isClosing={false} onClose={vi.fn()} />,
    );
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Reply', 'Copy', 'Forward', 'Edit', 'Report', 'Delete']);
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

  it('keeps the More page above the tap, against the same edge, when the menu opened above', () => {
    const heights = { current: 200 };
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => heights.current);
    const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150);
    const y = window.innerHeight - 150;
    render(<ContextMenuComponent ref={createRef<HTMLDivElement>()} x={100} y={y} isMine onReply={vi.fn()}
      onMakeSticker={vi.fn()} onReport={vi.fn()} isClosing={false} onClose={vi.fn()} />);
    expect(screen.getByRole('menu').style.top).toBe(`${y - 200 - 48}px`);
    heights.current = 110;
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('button', { name: 'Report' })).toBeInTheDocument();
    expect(screen.getByRole('menu').style.top).toBe(`${y - 110 - 48}px`);
    height.mockRestore();
    width.mockRestore();
  });
});
