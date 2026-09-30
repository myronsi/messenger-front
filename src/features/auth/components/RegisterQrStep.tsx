import QRCode from 'react-qr-code';
import type { en } from '@/shared/lang/en';
import { Button } from '@/shared/ui/button';

interface RegisterQrStepProps {
  qrPart: string;
  translations: typeof en;
  onDownload: () => void;
  onCopy: () => void;
  onContinue: () => void;
}

export const RegisterQrStep = ({
  qrPart,
  translations,
  onDownload,
  onCopy,
  onContinue,
}: RegisterQrStepProps) => (
  <div className="mt-4 text-center">
    <p className="text-sm text-muted-foreground">{translations.saveQrPart}</p>
    <div
      className="flex justify-center mt-2 bg-white p-4 border border-gray-200"
      style={{ width: '240px', height: '240px', margin: '0 auto' }}
    >
      <QRCode id="qr-code" value={qrPart} size={200} level="H" />
    </div>
    <div className="space-y-2 mt-2">
      <Button onClick={onDownload} variant="outline" className="w-full">
        {translations.downloadQr}
      </Button>
      <Button onClick={onCopy} variant="outline" className="w-full">
        {translations.copyQrPart}
      </Button>
      <Button onClick={onContinue} className="w-full">
        {translations.continue}
      </Button>
    </div>
  </div>
);
