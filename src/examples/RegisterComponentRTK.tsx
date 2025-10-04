// Example: Migrating RegisterComponent to use RTK Query

import React, { useState } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useRegisterMutation } from '@/app/api/messengerApi';

interface RegisterComponentProps {
  onRegisterSuccess: () => void;
  onLoginClick: () => void;
}

const RegisterComponentRTK: React.FC<RegisterComponentProps> = ({ 
  onRegisterSuccess, 
  onLoginClick 
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  
  const { translations } = useLanguage();
  
  // RTK Query mutation hook
  const [register, { isLoading: isRegistering }] = useRegisterMutation();

  const handleRegister = async () => {
    // Validation
    if (password !== confirmPassword) {
      setMessage(translations.passwordsMatch);
      return;
    }

    try {
      const result = await register({
        username,
        email,
        password,
      }).unwrap();

      // Success - save token and redirect
      localStorage.setItem('access_token', result.access_token);
      if (result.refresh_token) {
        localStorage.setItem('refresh_token', result.refresh_token);
      }
      
      onRegisterSuccess();
      setMessage('');
    } catch (error: any) {
      // Handle errors
      const errorMessage = error?.data?.detail || error?.message || translations.registerFailed;
      setMessage(errorMessage);
      console.error('Registration error:', error);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
        <Input
          type="text"
          placeholder={translations.username}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder={translations.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder={translations.confirmPassword}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        
        <Button 
          type="submit" 
          disabled={isRegistering}
          className="w-full"
        >
          {isRegistering ? translations.loading : translations.register}
        </Button>
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={onLoginClick}
          className="w-full mt-2"
        >
          {translations.alreadyHaveAccount}
        </Button>
        
        {message && (
          <p className="text-destructive text-sm mt-2 text-center">
            {message}
          </p>
        )}
      </form>
    </div>
  );
};

export default RegisterComponentRTK;

// Example: How to use the updated component
/*
import RegisterComponentRTK from './RegisterComponentRTK';

// In your main component
<RegisterComponentRTK
  onRegisterSuccess={() => {
    setIsLoggedIn(true);
    setCurrentView('chats');
  }}
  onLoginClick={() => setCurrentView('login')}
/>
*/