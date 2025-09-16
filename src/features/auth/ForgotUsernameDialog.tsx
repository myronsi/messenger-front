import React, { useState } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { Label } from '@/shared/ui/label';

interface ForgotUsernameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUsername: (username: string) => void;
}

const ForgotUsernameDialog: React.FC<ForgotUsernameDialogProps> = ({
  isOpen,
  onClose,
  onSelectUsername,
}) => {
  const { translations } = useLanguage();
  const [selectedUsername, setSelectedUsername] = useState('');

  const getKnownUsernames = () => {
    try {
      const deviceParts = JSON.parse(localStorage.getItem('device_parts') || '{}');
      return Object.keys(deviceParts);
    } catch {
      return [];
    }
  };

  const knownUsernames = getKnownUsernames();

  const handleConfirm = () => {
    if (selectedUsername) {
      onSelectUsername(selectedUsername);
      onClose();
      setSelectedUsername('');
    }
  };

  const handleCancel = () => {
    onClose();
    setSelectedUsername('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translations.forgotUsername}</DialogTitle>
          <DialogDescription>
            {knownUsernames.length > 0 
              ? translations.selectUsernameFromList
              : translations.noKnownUsernamesFound
            }
          </DialogDescription>
        </DialogHeader>
        
        {knownUsernames.length > 0 ? (
          <RadioGroup value={selectedUsername} onValueChange={setSelectedUsername}>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {knownUsernames.map((username) => (
                <div key={username} className="flex items-center space-x-2">
                  <RadioGroupItem value={username} id={username} />
                  <Label htmlFor={username} className="flex-1 cursor-pointer">
                    {username}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            {translations.pleaseContactOurSupport}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
            {translations.cancel}
          </Button>
          {knownUsernames.length > 0 && (
            <Button 
              onClick={handleConfirm} 
              disabled={!selectedUsername}
              className="w-full sm:w-auto"
            >
              OK
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotUsernameDialog;
