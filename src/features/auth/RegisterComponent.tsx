import type { FC } from 'react';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { RegisterCredentialsForm } from './components/RegisterCredentialsForm';
import { RegisterProfileSetup } from './components/RegisterProfileSetup';
import { RegisterQrStep } from './components/RegisterQrStep';
import { useRegistrationFlow } from './model/useRegistrationFlow';

interface RegisterComponentProps {
  onLoginSuccess: (username: string) => void;
  onBackToLogin: () => void;
}

const RegisterComponent: FC<RegisterComponentProps> = ({ onLoginSuccess, onBackToLogin }) => {
  const flow = useRegistrationFlow({ onLoginSuccess });

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{flow.translations.register}</CardTitle>
        <CardDescription className="pt-2">{flow.translations.createNewAccount}</CardDescription>
      </CardHeader>
      <CardContent>
        {!flow.showQr && !flow.showProfileSetup ? (
          <RegisterCredentialsForm
            username={flow.username}
            displayName={flow.displayName}
            password={flow.password}
            showPassword={flow.showPassword}
            translations={flow.translations}
            isDisplayNameValid={flow.isDisplayNameValid}
            onUsernameChange={flow.setUsername}
            onDisplayNameChange={flow.setDisplayName}
            onPasswordChange={flow.setPassword}
            onPasswordVisibilityChange={flow.setShowPassword}
            onSubmit={flow.handleSubmit}
          />
        ) : flow.showQr ? (
          <RegisterQrStep
            qrPart={flow.qrPart}
            translations={flow.translations}
            onDownload={flow.downloadQR}
            onCopy={flow.copyQrPart}
            onContinue={flow.handleContinue}
          />
        ) : (
          <RegisterProfileSetup
            profileAvatarFile={flow.profileAvatarFile}
            profileAvatarPreview={flow.profileAvatarPreview}
            avatarCropFile={flow.avatarCropFile}
            avatarCropPreview={flow.avatarCropPreview}
            profileBio={flow.profileBio}
            isSavingProfile={flow.isSavingProfile}
            translations={flow.translations}
            onAvatarChange={flow.handleProfileAvatarChange}
            onRemoveAvatar={flow.removeProfileAvatar}
            onBioChange={flow.setProfileBio}
            onSave={flow.handleSaveProfileSetup}
            onSkip={flow.finishRegistration}
            onCancelCrop={flow.cancelAvatarCrop}
            onConfirmCrop={flow.handleCroppedAvatar}
          />
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2">
        {!flow.showQr && !flow.showProfileSetup && flow.inputsFilled ? (
          <Button type="submit" onClick={flow.handleRegister} className="w-full">
            {flow.translations.register}
          </Button>
        ) : !flow.showQr && !flow.showProfileSetup ? (
          <div className="w-full">
            <p className="text-sm text-muted-foreground text-center mb-2">{flow.translations.alreadyHaveAccount}</p>
            <Button variant="outline" onClick={onBackToLogin} className="w-full">
              {flow.translations.backToLogin}
            </Button>
          </div>
        ) : null}
        {flow.message && <p className="text-destructive text-sm mt-2 text-center">{flow.message}</p>}
      </CardFooter>
    </Card>
  );
};

export default RegisterComponent;
