import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ContactNameHeading } from './ContactNameHeading';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {} }) }));

function Example() {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  return <ContactNameHeading displayName="Alice Smith" accountDisplayName="Alice Smith" isCurrentUser={false}
    isEditingContactName={editing} customNameInput={name} setCustomNameInput={setName}
    onEditContactName={() => setEditing(true)} onCancelContactNameEdit={() => { setName(''); setEditing(false); }}
    onSaveContactName={() => setEditing(false)} isSavingContactName={false} />;
}

it('edits in place with focused input, gray default name, and name-sized measurement', () => {
  render(<Example />);
  fireEvent.click(screen.getByTestId('edit-contact-name'));
  const input = screen.getByRole('textbox');
  expect(input).toHaveFocus();
  expect(input).toHaveAttribute('placeholder', 'Alice Smith');
  expect(input).toHaveClass('placeholder:text-muted-foreground', 'text-xl', 'p-0');
  expect(screen.getByTestId('edit-contact-name')).not.toBeVisible();
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'Al' } });
  expect(input.parentElement?.querySelector('[aria-hidden="true"]')).toHaveTextContent('Al');
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.getByTestId('edit-contact-name')).toBeInTheDocument();
});
