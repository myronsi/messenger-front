import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const download = (content: string, type: string, name: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const RecoveryKeyReceipt = ({ recoveryKey, username, onContinue }: {
  recoveryKey: string; username: string; onContinue: () => void;
}) => {
  const [saved, setSaved] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const qr = useRef<SVGSVGElement>(null);
  const lastGroup = recoveryKey.trim().split('-').pop() || '';
  const confirmed = confirmation.trim().toUpperCase() === lastGroup.toUpperCase();
  const finish = (skipped: boolean) => {
    const flag = `recovery_receipt_skipped:${username}`;
    if (skipped) localStorage.setItem(flag, 'true');
    else localStorage.removeItem(flag);
    setConfirmation('');
    onContinue();
  };
  const filename = `messenger-recovery-${username.replace(/[^a-z0-9_-]/gi, '_')}`;
  return <div className="space-y-4">
    <h2 className="text-lg font-semibold">Save your recovery key</h2>
    <p className="text-sm text-muted-foreground">This key is shown only once. Save it in your password manager or somewhere safe. You will need it if you forget your password. If two-factor authentication is enabled, you will also need your authenticator or a backup code.</p>
    <code className="block break-all rounded-lg bg-muted p-4 font-mono select-all" data-testid="recovery-key">{recoveryKey}</code>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => {
        void navigator.clipboard.writeText(recoveryKey).then(() => setMessage('Copied')).catch(() => setMessage('Select the key and copy it manually.'));
      }}>Copy key</Button>
      <Button variant="outline" onClick={() => download(
        `Messenger account recovery\nUsername: ${username}\nRecovery key: ${recoveryKey}\n\nKeep this file private.\n` +
        'Use Account recovery to reset your password. If two-factor authentication is enabled, you also need an authenticator or backup code.\n' +
        'The key is single use. Save the replacement after recovery. Regenerating the key invalidates this copy.\n',
        'text/plain;charset=utf-8', `${filename}.txt`,
      )}>Download .txt</Button>
      <Button variant="outline" onClick={() => setShowQR(value => !value)}>{showQR ? 'Hide QR' : 'Show QR'}</Button>
    </div>
    {showQR && <div className="space-y-2">
      <QRCodeSVG ref={qr} value={recoveryKey} size={200} level="H" marginSize={4} title="Recovery key QR code" />
      <p className="text-sm text-muted-foreground">This QR code contains your recovery key. Keep it private.</p>
      <Button variant="outline" onClick={() => {
        if (qr.current) download(new XMLSerializer().serializeToString(qr.current), 'image/svg+xml', `${filename}.svg`);
      }}>Download QR</Button>
    </div>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <Label htmlFor="recovery-last-group">Type the last group of your recovery key to confirm you saved it</Label>
    <Input id="recovery-last-group" autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} />
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} />I saved my recovery key</label>
    <Button className="w-full" disabled={!saved || !confirmed} onClick={() => finish(false)}>Continue</Button>
    {!showSkipWarning ? <Button variant="ghost" onClick={() => setShowSkipWarning(true)}>Skip for now</Button> : <div role="alert" className="space-y-2">
      <p className="text-sm text-destructive">If you lose access before saving a recovery method, you may lose your account.
        This key cannot be shown again. Create a replacement in Security settings.</p>
      <Button variant="outline" onClick={() => finish(true)}>Continue without saving</Button>
    </div>}
  </div>;
};
