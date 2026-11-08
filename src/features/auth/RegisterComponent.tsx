import { useEffect, type FC } from 'react';
import { RecoveryKeyReceipt } from '@/shared/ui/RecoveryKeyReceipt';
import { RegisterCredentialsForm } from './components/RegisterCredentialsForm';
import { RegisterProfileSetup } from './components/RegisterProfileSetup';
import { PasskeyOffer } from './components/PasskeyOffer';
import { AuthHeader, AuthSwitchLink } from './components/AuthFormParts';
import { RegisterProgress } from './components/RegisterSteps';
import { useRegistrationFlow } from './model/useRegistrationFlow';
import type { RegisterStep } from './model/registerForm';

interface RegisterComponentProps {
  onLoginSuccess: (username: string) => void;
  onBackToLogin: () => void;
  onStepChange?: (step: RegisterStep) => void;
}

const RegisterComponent: FC<RegisterComponentProps> = ({ onLoginSuccess, onBackToLogin, onStepChange }) => {
  const flow = useRegistrationFlow({ onLoginSuccess });
  const t = flow.translations.authLayout;
  const { step } = flow;

  useEffect(() => { onStepChange?.(step); }, [step, onStepChange]);

  return (
    <div className="flex w-full flex-col gap-6">
      <RegisterProgress current={step} className="lg:hidden" />
      {step === 'account' && <>
        <AuthHeader title={t.registerTitle} subtitle={t.registerSubtitle} />
        <RegisterCredentialsForm
          username={flow.username}
          password={flow.password}
          fieldErrors={flow.fieldErrors}
          isSubmitting={flow.isSubmitting}
          onUsernameChange={flow.setUsername}
          onPasswordChange={flow.setPassword}
          onBlur={flow.markTouched}
          onSubmit={flow.handleSubmit}
        />
      </>}
      {step === 'recovery' && <RecoveryKeyReceipt recoveryKey={flow.recoveryKey} username={flow.username} onContinue={flow.handleContinue} context="signup" />}
      {step === 'passkey' && <PasskeyOffer username={flow.username} onDone={flow.finishPasskeyOffer} />}
      {step === 'profile' && (
        <RegisterProfileSetup
          profileAvatarFile={flow.profileAvatarFile}
          profileAvatarPreview={flow.profileAvatarPreview}
          avatarCropFile={flow.avatarCropFile}
          avatarCropPreview={flow.avatarCropPreview}
          profileBio={flow.profileBio}
          displayName={flow.displayName}
          displayNameChanged={flow.displayNameChanged}
          displayNameError={flow.displayNameError ? t.errors[flow.displayNameError] : undefined}
          onDisplayNameChange={flow.setDisplayName}
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
      {flow.message && <p role="alert" className="text-center text-sm text-destructive">{flow.message}</p>}
      {step === 'account' && <AuthSwitchLink prompt={t.haveAccount} action={t.signIn} onClick={onBackToLogin} />}
    </div>
  );
};

export default RegisterComponent;
