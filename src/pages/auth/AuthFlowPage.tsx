import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import RegisterComponent from '@/features/auth/RegisterComponent';
import LoginComponent from '@/features/auth/LoginComponent';
import UsernameRecoveryComponent from '@/features/auth/UsernameRecoveryComponent';
import PartsRecoveryComponent from '@/features/auth/PartsRecoveryComponent';
import PasswordResetComponent from '@/features/auth/PasswordResetComponent';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Globe } from 'lucide-react';

interface AuthFlowPageProps {
  onLoginSuccess: (username: string) => void;
}

const AuthFlowPage: React.FC<AuthFlowPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const handleBackToLogin = () => navigate('/login');

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
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Messenger</h1>
          </div>
          <Routes>
            <Route
              path="/login"
              element={
                <LoginComponent
                  onLoginSuccess={onLoginSuccess}
                  onRegisterClick={() => navigate('/register')}
                  onRecoverClick={() => navigate('/recover-username')}
                />
              }
            />
            <Route path="/register" element={<RegisterComponent onLoginSuccess={onLoginSuccess} onBackToLogin={handleBackToLogin} />} />
            <Route path="/recover-username" element={<UsernameRecoveryComponent onBackToLogin={handleBackToLogin} />} />
            <Route path="/recover-parts" element={<PartsRecoveryComponent onBackToLogin={handleBackToLogin} />} />
            <Route path="/reset-password" element={<PasswordResetComponent onBackToLogin={handleBackToLogin} />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    </>
  );
};

export default AuthFlowPage;
