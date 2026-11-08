import { useNavigate } from 'react-router-dom';
import { EmailRecoveryComponent } from '@/features/auth';
import { AuthShell } from './ui/AuthShell';

export const RecoveryEmailLinkPage = ({ mode }: { mode: 'verify' | 'reset' }) => {
  const navigate = useNavigate();
  return <AuthShell>
    <EmailRecoveryComponent mode={mode} onBack={() => navigate('/login', { replace: true })}
      onLoginSuccess={() => navigate('/', { replace: true })} />
  </AuthShell>;
};
