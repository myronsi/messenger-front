import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraOff } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { parseScannedQrCode, qrLoginPath } from '@/shared/lib/qrLoginPath';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import { cameraProblem, createQrDecoder, openRearCamera, qrCodeOrigins, stopCamera, type CameraProblem } from '../model/qrCamera';

const SCAN_INTERVAL_MS = 200;
const INVALID_NOTICE_MS = 3000;

const QrCameraView = ({ onClose }: { onClose: () => void }) => {
  const t = useLanguage().translations.qrLogin;
  const navigate = useNavigate();
  const onDetected = (requestId: string) => { onClose(); navigate(qrLoginPath(requestId)); };
  const video = useRef<HTMLVideoElement>(null);
  const [problem, setProblem] = useState<CameraProblem | null>(null);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const onDetectedRef = useLatestRef(onDetected);

  useEffect(() => {
    const element = video.current;
    let active = true;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let invalidTimer: number | undefined;
    const scan = async (decode: Awaited<ReturnType<typeof createQrDecoder>>) => {
      if (!active || !element) return;
      const text = await decode(element).catch(() => null);
      if (!active) return;
      const requestId = text ? parseScannedQrCode(text, qrCodeOrigins()) : null;
      if (requestId) {
        active = false;
        stopCamera(stream);
        onDetectedRef.current(requestId);
        return;
      }
      if (text) {
        setInvalid(true);
        window.clearTimeout(invalidTimer);
        invalidTimer = window.setTimeout(() => setInvalid(false), INVALID_NOTICE_MS);
      }
      timer = window.setTimeout(() => { void scan(decode); }, SCAN_INTERVAL_MS);
    };
    const start = async () => {
      try {
        stream = await openRearCamera();
        if (!active || !element) { stopCamera(stream); return; }
        element.srcObject = stream;
        await element.play().catch(() => undefined);
        const decode = await createQrDecoder();
        if (!active) return;
        setReady(true);
        void scan(decode);
      } catch (error) {
        if (active) setProblem(cameraProblem(error));
      }
    };
    void start();
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.clearTimeout(invalidTimer);
      stopCamera(stream);
      if (element) element.srcObject = null;
    };
  }, [onDetectedRef]);

  if (problem) {
    const message = problem === 'denied' ? t.cameraDenied : problem === 'missing' ? t.noCamera : t.cameraFailed;
    return <div role="alert" className="flex flex-col items-center gap-3 px-6 text-center text-white">
      <CameraOff className="h-10 w-10 text-white/70" aria-hidden="true" />
      <p className="text-[15px] font-semibold">{message}</p>
      <p className="text-sm text-white/80">{t.usePhoneCamera}</p>
    </div>;
  }
  return <div className="relative flex h-full w-full items-center justify-center">
    <video ref={video} muted playsInline tabIndex={-1} aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
    <div aria-hidden="true" className="relative h-64 w-64 rounded-3xl border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
    <p role="status" className="absolute bottom-24 left-4 right-4 text-center text-sm font-medium text-white">
      {invalid ? <span className="rounded-full bg-red-600 px-3 py-1.5">{t.notMessengerCode}</span> : ready ? t.scanHint : t.startingCamera}
    </p>
  </div>;
};

export const QrScannerDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const t = useLanguage().translations.qrLogin;
  return <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <DialogContent hideClose overlayClassName="z-[1500]" className={'z-[1500] left-0 top-0 flex h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 '
      + 'rounded-none border-0 bg-black p-0 text-white sm:rounded-none data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0'}>
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-lg font-semibold text-white">{t.scanTitle}</DialogTitle>
          <DialogDescription className="text-sm text-white/80">{t.scanEntrySummary}</DialogDescription>
        </div>
        <Button variant="secondary" className="h-10" onClick={onClose}>{t.close}</Button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {open && <QrCameraView onClose={onClose} />}
      </div>
    </DialogContent>
  </Dialog>;
};
