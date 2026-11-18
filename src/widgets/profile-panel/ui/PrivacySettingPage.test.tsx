import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import PrivacySettingPage from './PrivacySettingPage';

const translations = {
  waitApprovalHint: 'Approve first', sharedChatsHint: 'Contacts only', privacyExceptions: 'Exceptions', neverAllow: 'Never allow',
  alwaysAllow: 'Always allow', appShell: { messageRequests: 'Message requests' },
} as unknown as ComponentProps<typeof PrivacySettingPage>['translations'];
const labels: Record<string, string> = { everyone: 'Everyone', shared_chats: 'Contacts', nobody: 'Nobody', wait_approval: 'Ask me' };

const renderPage = (mode: string, modes: string[]) => {
  const onChoose = vi.fn();
  render(<PrivacySettingPage title="Setting" hint={() => ''} mode={mode} modes={modes} exceptionCount={() => 0} supportsExceptions disabled={false}
    translations={translations} choiceLabel={(choice) => labels[choice]} onChoose={onChoose} onOpenExceptions={vi.fn()} />);
  return onChoose;
};

describe('PrivacySettingPage', () => {
  it('offers nobody for direct messages and sends the plain choice', () => {
    const onChoose = renderPage('everyone', ['everyone', 'shared_chats', 'nobody', 'wait_approval']);
    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual(['Everyone', 'ContactsContacts only', 'Nobody', 'Ask meApprove first']);
    fireEvent.click(screen.getByRole('radio', { name: 'Nobody' }));
    expect(onChoose).toHaveBeenCalledWith('nobody');
    expect(screen.getByRole('button', { name: /Never allow/ })).toBeInTheDocument();
  });

  it('shows who may call with an always-allow list under nobody', () => {
    renderPage('nobody', ['everyone', 'shared_chats', 'nobody']);
    expect(screen.getByRole('radio', { name: 'Nobody' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /Always allow/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Never allow/ })).not.toBeInTheDocument();
  });
});
