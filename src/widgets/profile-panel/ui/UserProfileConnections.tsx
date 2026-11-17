import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { EntityId } from '@/shared/api/entityId';
import { useGetUserConnectionsQuery } from '@/features/connections';
import ConnectionChip from './ConnectionChip';

export default function UserProfileConnections({ userId }: { userId?: EntityId }) {
  const { translations } = useLanguage();
  const t = translations.connections;
  const items = useGetUserConnectionsQuery(String(userId ?? ''), { skip: !userId }).data ?? [];
  if (items.length === 0) return null;
  return (
    <section data-testid="profile-connections">
      <p className="text-sm text-muted-foreground">{t.profileSection}</p>
      <ul className="mt-1.5 flex flex-wrap gap-2">
        {items.map((connection) => (
          <li key={connection.id} className="min-w-0 max-w-full"><ConnectionChip connection={connection} /></li>
        ))}
      </ul>
    </section>
  );
}
