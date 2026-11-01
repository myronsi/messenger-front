import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { endSession, setAccessToken } from '@/shared/auth/session';
import { RecoveryKeyReceipt } from '@/shared/ui/RecoveryKeyReceipt';

export const RecoveryKeyComponent = ({ onLoginSuccess, onBackToLogin }: { onLoginSuccess: (username: string) => void; onBackToLogin: () => void }) => {
  const [form, setForm] = useState({ username: '', recovery_key: '', new_password: '', confirm: '', code: '' });
  const [replacement, setReplacement] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (form.new_password !== form.confirm) { setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/auth/recover/key`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: form.username.trim().toLowerCase(), recovery_key: form.recovery_key, new_password: form.new_password, code: form.code.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 429 ? 'Too many attempts. Please try again later.' : response.status === 422 ? 'Check your new password. It must contain at least 8 characters.' : 'Recovery failed. Check your username, recovery key and authentication code.');
      if (!data.access_token || !data.recovery_key) throw new Error('The server returned an incomplete response. Try signing in with your new password.');
      endSession(); setToken(data.access_token); setReplacement(data.recovery_key);
      setForm(f => ({ ...f, recovery_key: '', new_password: '', confirm: '', code: '' }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  };
  return <Card><CardHeader><CardTitle>Recover your account</CardTitle></CardHeader><CardContent>
    {replacement ? <><p className="mb-4 text-sm">Your password has been reset and other sessions signed out. Your old recovery key no longer works.</p><RecoveryKeyReceipt recoveryKey={replacement} onContinue={() => { setAccessToken(token); setReplacement(''); setToken(''); onLoginSuccess(form.username.trim().toLowerCase()); }} /></> :
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
        {([{ name: 'username', label: 'Username', type: 'text' }, { name: 'recovery_key', label: 'Recovery key', type: 'password' }, { name: 'new_password', label: 'New password', type: 'password' }, { name: 'confirm', label: 'Confirm new password', type: 'password' }, { name: 'code', label: 'Authenticator or backup code (if enabled)', type: 'text' }] as const).map(field => <div key={field.name} className="space-y-2"><Label htmlFor={`recover-${field.name}`}>{field.label}</Label><Input id={`recover-${field.name}`} type={field.type} value={form[field.name]} required={field.name !== 'code'} minLength={field.name === 'new_password' ? 8 : undefined} maxLength={field.name === 'recovery_key' || field.name === 'code' ? 128 : 256} autoComplete={field.name === 'username' ? 'username' : field.name === 'new_password' || field.name === 'confirm' ? 'new-password' : 'off'} onChange={e => setForm(f => ({ ...f, [field.name]: e.target.value }))} /></div>)}
        <p className="text-sm text-muted-foreground">Use the recovery key you saved in account security settings. Older recovery shares cannot be used here.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={busy}>{busy ? 'Recovering…' : 'Reset password'}</Button>
        <Button type="button" variant="outline" className="w-full" onClick={onBackToLogin}>Back to login</Button>
      </form>}
  </CardContent></Card>;
};
