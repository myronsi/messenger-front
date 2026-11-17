import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { providerName, ProviderIcon, type Connection } from '@/features/connections';

export default function ConnectionChip({ connection }: { connection: Connection }) {
  const { translations } = useLanguage();
  const name = providerName(connection.provider);
  const label = `${name}: ${connection.display_name} – ${fillTemplate(translations.connections.openProfile, { provider: name })}`;
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
}
