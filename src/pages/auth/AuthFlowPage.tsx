import { useState } from 'react';
import {
  RecoveryKeyComponent, DeviceRecoveryComponent, EmailRecoveryComponent, RecoveryChooser, RegisterStepList, usernameFromIdentifier,
  type RecoveryMethod, type RegisterStep,
} from '@/features/auth';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { notificationReturnPath } from '@/shared/lib/notifications/navigation';
import { qrLoginRequestId } from '@/shared/lib/qrLoginPath';
import {
  LoginComponent,
  RegisterComponent,
} from '@/features/auth';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AuthShell, RecoveryNote } from './ui/AuthShell';

interface AuthFlowPageProps {
  onLoginSuccess: (username: string) => void;
}

const AuthFlowPage: React.FC<AuthFlowPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const authState = { notificationReturnPath: notificationReturnPath(location.pathname, location.search, location.state) };
  const { translations } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('account');
  const handleBackToLogin = () => navigate('/login', { state: authState });
  const handleChooser = () => navigate('/recover-username', { state: authState });
  const recoveryPaths: Record<RecoveryMethod, string> = { device: '/recover-device', key: '/recover-key', email: '/recover-email' };
  const initialUsername = usernameFromIdentifier(identifier);

  const aside = location.pathname === '/register'
    ? <><RegisterStepList current={registerStep} /><RecoveryNote /></>
    : undefined;

  return (
    <AuthShell aside={aside}>
      {location.pathname === '/login' && qrLoginRequestId(authState.notificationReturnPath) && (
        <p role="status" className="mb-6 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{translations.qrLogin.signInToApprove}</p>
      )}
      <Routes>
        <Route
          path="/login"
          element={
            <LoginComponent
              onLoginSuccess={onLoginSuccess}
              onRegisterClick={() => navigate('/register', { state: authState })}
              onRecoverClick={() => navigate('/recover-username', { state: authState })}
            />
          }
        />
        <Route path="/register" element={<RegisterComponent onLoginSuccess={onLoginSuccess} onBackToLogin={handleBackToLogin} onStepChange={setRegisterStep} />} />
        <Route path="/recover-username" element={<RecoveryChooser identifier={identifier} onIdentifierChange={setIdentifier}
          onBack={handleBackToLogin} onChoose={method => navigate(recoveryPaths[method], { state: authState })} />} />
        <Route path="/recover-key" element={<RecoveryKeyComponent onLoginSuccess={onLoginSuccess} onBackToLogin={handleBackToLogin}
          onTryAnotherWay={handleChooser} initialUsername={initialUsername} />} />
        <Route path="/recover-email" element={<EmailRecoveryComponent mode="request" onLoginSuccess={onLoginSuccess} onBack={handleBackToLogin}
          onTryAnotherWay={handleChooser} initialIdentifier={identifier.trim()} />} />
        <Route path="/recover-device" element={<DeviceRecoveryComponent onLoginSuccess={onLoginSuccess}
          onBack={handleChooser} initialUsername={initialUsername} />} />
        <Route path="/recover-parts" element={<Navigate to="/recover-username" state={authState} replace />} />
        <Route path="/" element={<Navigate to="/login" state={authState} replace />} />
        <Route path="*" element={<Navigate to="/login" state={authState} replace />} />
      </Routes>
    </AuthShell>
  );
};

export default AuthFlowPage;
