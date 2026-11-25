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
    fireEvent.click(screen.getByRole('button', { name: 'Create poll' }));
    expect(onSend).toHaveBeenCalledWith({ question: 'Lunch?', options: ['Pizza', 'Soup'], multiple_answers: false, anonymous: true });
    expect(onClose).toHaveBeenCalled();
  });

  it('says what is missing instead of sending', () => {
    const onSend = vi.fn();
    render(<PollComposerDialog open onClose={vi.fn()} onSend={onSend} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Write a question.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create poll' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Write a question.');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('adds a field as the last one fills, reorders from the keyboard and removes, at most ten', () => {
    render(<PollComposerDialog open onClose={vi.fn()} onSend={vi.fn()} />);
    type('Option 1', 'A');
    expect(screen.queryByPlaceholderText('Add an option')).not.toBeInTheDocument();
    type('Option 2', 'B');
    expect(screen.getByPlaceholderText('Add an option')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Reorder option 2' }), { key: 'ArrowUp' });
    expect(screen.getByLabelText('Option 1')).toHaveValue('B');
    for (let number = 3; number <= 10; number += 1) type(`Option ${number}`, `X${number}`);
    expect(screen.getAllByTestId('poll-option-row')).toHaveLength(10);
    expect(screen.queryByPlaceholderText('Add an option')).not.toBeInTheDocument();
    expect(screen.getByText('10 of 10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove option 10' }));
    expect(screen.getAllByTestId('poll-option-row')).toHaveLength(10);
    expect(screen.getByPlaceholderText('Add an option')).toBeInTheDocument();
  });

  it('shows the poll as it will look in the chat', () => {
    render(<PollComposerDialog open onClose={vi.fn()} onSend={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Ask a question'), { target: { value: 'Lunch?' } });
    type('Option 1', 'Pizza');
    const previews = screen.getAllByTestId('poll-preview');
    expect(previews[0]).toHaveTextContent('Lunch?');
    expect(previews[0]).toHaveTextContent('Pizza');
  });

  it('closes after a picked preset', () => {
    vi.useFakeTimers({ now: Date.parse('2026-11-25T10:00:00Z') });
    const onSend = vi.fn();
    render(<PollComposerDialog open onClose={vi.fn()} onSend={onSend} />);
    fireEvent.change(screen.getByPlaceholderText('Ask a question'), { target: { value: 'Lunch?' } });
    type('Option 1', 'Pizza');
    type('Option 2', 'Soup');
    fireEvent.click(screen.getByRole('switch', { name: 'Close at a set time' }));
    fireEvent.click(screen.getByRole('radio', { name: '1 hour' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create poll' }));
    expect(onSend.mock.calls[0][0].close_at).toBe('2026-11-25T11:00:00.000Z');
    vi.useRealTimers();
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
    fireEvent.click(screen.getByRole('button', { name: 'Create quiz' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Mark the correct answer.');
    fireEvent.click(screen.getByRole('radio', { name: 'Option 2 is correct' }));
    type('Explanation', 'Basic sums');
    fireEvent.click(screen.getByRole('button', { name: 'Create quiz' }));
    expect(onSend).toHaveBeenCalledWith({
      question: '2 + 2?', options: ['3', '4'], multiple_answers: false, anonymous: true, quiz: { correct_option: 1, explanation: 'Basic sums' },
    });
  });
});
