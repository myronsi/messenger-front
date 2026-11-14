import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ContactNameHeading } from './ContactNameHeading';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {} }) }));

function Example() {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  return <>
    <button type="button" onClick={() => setEditing(true)}>rename</button>
    <ContactNameHeading displayName="Alice Smith" accountDisplayName="Alice Smith" isCurrentUser={false}
      isEditingContactName={editing} customNameInput={name} setCustomNameInput={setName}
      onEditContactName={() => setEditing(true)} onCancelContactNameEdit={() => { setName(''); setEditing(false); }}
      onSaveContactName={() => setEditing(false)} isSavingContactName={false} />
  </>;
}

it('edits in place with focused input, gray default name, and name-sized measurement', async () => {
  render(<Example />);
  expect(screen.queryByTestId('edit-contact-name')).toBeNull();
  fireEvent.click(screen.getByText('rename'));
  const input = screen.getByRole('textbox');
  await waitFor(() => expect(input).toHaveFocus());
  expect(input).toHaveAttribute('placeholder', 'Alice Smith');
  expect(input).toHaveClass('placeholder:text-muted-foreground', 'text-2xl', 'p-0');
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'Al' } });
  expect(input.parentElement?.querySelector('[aria-hidden="true"]')).toHaveTextContent('Al');
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.getByText('Alice Smith')).toBeInTheDocument();
});
