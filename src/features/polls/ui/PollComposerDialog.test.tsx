import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import { PollComposerDialog } from './PollComposerDialog';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('PollComposerDialog', () => {
  it('creates an anonymous single-answer poll from the question and options', () => {
    const onSend = vi.fn();
    const onClose = vi.fn();
    render(<PollComposerDialog open onClose={onClose} onSend={onSend} />);
    fireEvent.change(screen.getByPlaceholderText('Ask a question'), { target: { value: 'Lunch?' } });
    type('Option 1', 'Pizza');
    type('Option 2', 'Soup');
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onSend).toHaveBeenCalledWith({ question: 'Lunch?', options: ['Pizza', 'Soup'], multiple_answers: false, anonymous: true });
    expect(onClose).toHaveBeenCalled();
  });

  it('says what is missing instead of sending', () => {
    const onSend = vi.fn();
    render(<PollComposerDialog open onClose={vi.fn()} onSend={onSend} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Write a question.');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('adds, reorders and removes options, at most ten', () => {
    render(<PollComposerDialog open onClose={vi.fn()} onSend={vi.fn()} />);
    type('Option 1', 'A');
    type('Option 2', 'B');
    fireEvent.click(screen.getByRole('button', { name: 'Move option 2 up' }));
    expect(screen.getByLabelText('Option 1')).toHaveValue('B');
    for (let count = 2; count < 10; count += 1) fireEvent.click(screen.getByRole('button', { name: 'Add an option' }));
    expect(screen.getAllByPlaceholderText(/^Option \d+$/)).toHaveLength(10);
    expect(screen.queryByRole('button', { name: 'Add an option' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove option 10' }));
    expect(screen.getAllByPlaceholderText(/^Option \d+$/)).toHaveLength(9);
  });

  it('makes a quiz with its correct answer and turns off multiple answers', () => {
    const onSend = vi.fn();
    render(<PollComposerDialog open onClose={vi.fn()} onSend={onSend} />);
    fireEvent.change(screen.getByPlaceholderText('Ask a question'), { target: { value: '2 + 2?' } });
    type('Option 1', '3');
    type('Option 2', '4');
    fireEvent.click(screen.getByRole('switch', { name: /Multiple answers/ }));
    fireEvent.click(screen.getByRole('switch', { name: /Quiz mode/ }));
    expect(screen.getByRole('switch', { name: /Multiple answers/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Mark the correct answer.');
    fireEvent.click(screen.getByRole('radio', { name: 'Option 2 is correct' }));
    type('Explanation', 'Basic sums');
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onSend).toHaveBeenCalledWith({
      question: '2 + 2?', options: ['3', '4'], multiple_answers: false, anonymous: true, quiz: { correct_option: 1, explanation: 'Basic sums' },
    });
  });
});
