import { useState } from 'react';
import { Button } from '@/shared/ui/button';

export const RecoveryKeyReceipt = ({ recoveryKey, onContinue }: { recoveryKey: string; onContinue: () => void }) => {
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  return <div className="space-y-4">
    <h2 className="text-lg font-semibold">Save your recovery key</h2>
    <p className="text-sm text-muted-foreground">This key is shown only once. Save it in your password manager or somewhere safe. You will need it if you forget your password. If two-factor authentication is enabled, you will also need your authenticator or a backup code.</p>
    <code className="block break-all rounded-lg bg-muted p-4 font-mono select-all" data-testid="recovery-key">{recoveryKey}</code>
    <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(recoveryKey).then(() => setMessage('Copied')).catch(() => setMessage('Select the key and copy it manually.')); }}>Copy key</Button>
    {message && <p role="status" className="text-sm">{message}</p>}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} />I saved my recovery key</label>
    <Button className="w-full" disabled={!saved} onClick={onContinue}>Continue</Button>
  </div>;
};
