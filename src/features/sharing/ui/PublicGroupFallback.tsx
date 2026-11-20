import type { ReactNode } from 'react';
import { PUBLIC_NAME } from '@/shared/lib/returnPath';
import { useGetPublicGroupQuery } from '@/entities/group';
import { GroupJoinCard } from './GroupJoinCard';

interface PublicGroupFallbackProps {
  name: string;
  fallback: ReactNode;
  onDone?: () => void;
  frame?: (card: ReactNode) => ReactNode;
}

export const PublicGroupFallback = ({ name, fallback, onDone, frame = (card) => card }: PublicGroupFallbackProps) => {
  const valid = PUBLIC_NAME.test(name);
  const { data, isLoading } = useGetPublicGroupQuery(name, { skip: !valid });
  if (!data) return <>{isLoading ? null : fallback}</>;
  return <>{frame(<div className="h-full overflow-y-auto px-4 pb-6 pt-16"><GroupJoinCard preview={data} name={name} onDone={onDone} /></div>)}</>;
};
