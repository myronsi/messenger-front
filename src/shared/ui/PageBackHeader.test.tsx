import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { PageBackHeader } from './PageBackHeader';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: { back: 'Back' } }) }));

it('shows a back button next to the page title and goes back with it', () => {
  const back = vi.fn();
  render(<PageBackHeader onBack={back}><span>Privacy</span></PageBackHeader>);
  expect(screen.getByText('Privacy')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(back).toHaveBeenCalledOnce();
});
