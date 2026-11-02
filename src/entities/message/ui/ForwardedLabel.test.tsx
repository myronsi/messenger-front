import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import ForwardedLabel from './ForwardedLabel';

describe('ForwardedLabel', () => {
  it('names the original sender in bold', () => {
    render(<ForwardedLabel forwardedFrom={{ message_id: '1', sender_name: 'Myrron' }} translations={en} isMine={false} isImage={false} />);
    expect(screen.getByTestId('forwarded-label')).toHaveTextContent('Forwarded from Myrron');
    expect(screen.getByText('Myrron')).toHaveClass('font-semibold');
  });

  it('keeps its distance from the image edge', () => {
    render(<ForwardedLabel forwardedFrom={{ message_id: '1', sender_name: 'Myrron' }} translations={en} isMine isImage />);
    expect(screen.getByTestId('forwarded-label')).toHaveClass('px-3');
  });

  it('falls back to the deleted user name', () => {
    render(<ForwardedLabel forwardedFrom={{ message_id: '1' }} translations={en} isMine={false} isImage={false} />);
    expect(screen.getByText(en.deletedUser)).toBeInTheDocument();
  });
});
