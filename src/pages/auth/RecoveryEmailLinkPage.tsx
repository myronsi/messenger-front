import { useNavigate } from 'react-router-dom';
import { EmailRecoveryComponent } from '@/features/auth';

export const RecoveryEmailLinkPage = ({ mode }: { mode: 'verify' | 'reset' }) => {
  const navigate = useNavigate();
  return <main className="mx-auto flex min-h-screen max-w-md items-center p-4">
    <EmailRecoveryComponent mode={mode} onBack={() => navigate('/login', { replace: true })}
      onLoginSuccess={() => navigate('/', { replace: true })} />
  </main>;
};
