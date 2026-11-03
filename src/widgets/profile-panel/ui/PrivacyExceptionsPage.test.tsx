import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import PrivacyExceptionsPage from './PrivacyExceptionsPage';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));

const translations = { privacyAddUsername: 'Add @{username}', userNotFound: 'Not found', add: 'Add' } as ComponentProps<typeof PrivacyExceptionsPage>['translations'];

const renderPage = (query: string, candidates: { username: string }[] = []) => {
  const onAdd = vi.fn();
  render(<PrivacyExceptionsPage hint="" selected={[]} candidates={candidates} query={query} onQueryChange={vi.fn()} isSearching={false} isBusy={false}
    currentUsername="me" translations={translations} getAvatarSrc={() => ''} onAdd={onAdd} onRemove={vi.fn()} />);
  return onAdd;
};

describe('PrivacyExceptionsPage', () => {
  it('adds a typed username that search does not find, by button or Enter', () => {
    const onAdd = renderPage('@Hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Add @Hidden' }));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onAdd).toHaveBeenNthCalledWith(1, 'Hidden');
    expect(onAdd).toHaveBeenNthCalledWith(2, 'Hidden');
  });

  it('offers no extra row when the typed name is already a result', () => {
    renderPage('bob', [{ username: 'Bob' }]);
    expect(screen.queryByRole('button', { name: 'Add @bob' })).not.toBeInTheDocument();
  });
});
