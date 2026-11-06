import { useState } from 'react';
import {
  RecoveryKeyComponent, DeviceRecoveryComponent, EmailRecoveryComponent, RecoveryChooser, usernameFromIdentifier, type RecoveryMethod,
} from '@/features/auth';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DocsLink } from '@/shared/ui/DocsLink';
import { notificationReturnPath } from '@/shared/lib/notifications/navigation';
import { qrLoginRequestId } from '@/shared/lib/qrLoginPath';
import {
  LoginComponent,
  RegisterComponent,
} from '@/features/auth';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Globe } from 'lucide-react';

interface AuthFlowPageProps {
  onLoginSuccess: (username: string) => void;
}

const AuthFlowPage: React.FC<AuthFlowPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const authState = { notificationReturnPath: notificationReturnPath(location.pathname, location.search, location.state) };
  const { language, setLanguage, translations } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const handleBackToLogin = () => navigate('/login', { state: authState });
  const handleChooser = () => navigate('/recover-username', { state: authState });
  const recoveryPaths: Record<RecoveryMethod, string> = { device: '/recover-device', key: '/recover-key', email: '/recover-email' };
  const initialUsername = usernameFromIdentifier(identifier);

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'ru')}>
          <SelectTrigger className="w-36 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 opacity-70" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ru">Русский</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="container mx-auto min-h-screen flex flex-col items-center justify-center space-y-8 p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {location.pathname === '/register' && <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Messenger</h1>
          </div>}
          {location.pathname === '/login' && qrLoginRequestId(authState.notificationReturnPath) && (
            <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{translations.qrLogin.signInToApprove}</p>
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
            <Route path="/register" element={<RegisterComponent onLoginSuccess={onLoginSuccess} onBackToLogin={handleBackToLogin} />} />
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
          <p className="text-center text-sm">
            <DocsLink className="text-blue-600 hover:underline">{translations.docsLink}</DocsLink>
          </p>
        </div>
      </div>
    </>
  );
};

export default AuthFlowPage;
