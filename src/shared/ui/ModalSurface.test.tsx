import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it } from 'vitest';
import { ModalSurface } from './ModalSurface';

function Example() {
  const [open, setOpen] = useState(false);
  const [nested, setNested] = useState(false);
  return <>
    <button onClick={() => setOpen(true)}>Open profile</button>
    <button>Background action</button>
    {open && <ModalSurface label="Profile">
      <button onClick={() => setNested(true)}>Open confirmation</button>
      <button onClick={() => setOpen(false)}>Close profile</button>
      {nested && <ModalSurface label="Confirmation">
        <button onClick={() => setNested(false)}>Cancel</button>
        <button>Confirm</button>
      </ModalSurface>}
    </ModalSurface>}
  </>;
}

it('traps Tab in the top window and restores focus through nested windows', async () => {
  const user = userEvent.setup();
  render(<Example />);
  await user.click(screen.getByText('Open profile'));
  expect(screen.getByText('Open confirmation')).toHaveFocus();
  await user.tab({ shift: true });
  expect(screen.getByText('Close profile')).toHaveFocus();
  await user.tab();
  expect(screen.getByText('Open confirmation')).toHaveFocus();
  await user.click(screen.getByText('Open confirmation'));
  expect(screen.getByText('Cancel')).toHaveFocus();
  await user.tab({ shift: true });
  expect(screen.getByText('Confirm')).toHaveFocus();
  await user.tab();
  expect(screen.getByText('Cancel')).toHaveFocus();
  await user.click(screen.getByText('Cancel'));
  await waitFor(() => expect(screen.getByText('Open confirmation')).toHaveFocus());
  await user.click(screen.getByText('Close profile'));
  await waitFor(() => expect(screen.getByText('Open profile')).toHaveFocus());
});
