import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import type { EntityId } from '@/shared/api/entityId';
import { providerName, ProviderIcon, useGetUserConnectionsQuery, type Connection } from '@/features/connections';

const Chip = ({ connection, label }: { connection: Connection; label: string }) => {
  const body = (
    <>
      <ProviderIcon provider={connection.provider} className="h-6 w-6 [&>svg]:h-3.5 [&>svg]:w-3.5" />
      <span className="min-w-0 truncate">{connection.display_name}</span>
    </>
  );
  const className = 'motion-press inline-flex max-w-full items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm transition-colors';
  if (!connection.profile_url) return <span data-testid="profile-connection" className={className}>{body}</span>;
  return (
    <a data-testid="profile-connection" href={connection.profile_url} target="_blank" rel="noopener noreferrer"
      className={`${className} hover:bg-accent`} aria-label={label} title={label}>
      {body}
    </a>
  );
};

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
          <li key={connection.id} className="min-w-0 max-w-full">
            <Chip connection={connection}
              label={`${providerName(connection.provider)}: ${connection.display_name} – ${fillTemplate(t.openProfile, { provider: providerName(connection.provider) })}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
