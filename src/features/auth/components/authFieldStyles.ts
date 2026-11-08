import { cn } from '@/shared/lib/utils';

export const fieldMessageId = (id: string) => `${id}-message`;

export const authInputClass = (invalid?: boolean) =>
  cn('h-11 text-[15px]', invalid ? 'border-destructive focus-visible:ring-destructive' : 'border-input');
