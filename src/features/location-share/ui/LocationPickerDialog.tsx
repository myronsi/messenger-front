import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, LocateFixed, Loader2 } from 'lucide-react';
import type { RichSend } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import type { PickerMap, PickerPoint } from '../model/leafletMap';
import { buildLocation, TITLE_MAX } from '../model/locationDraft';

interface LocationPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (send: Extract<RichSend, { type: 'location' }>) => void;
}

type Status = 'idle' | 'locating' | 'denied' | 'unavailable' | 'mapFailed';

const START: PickerPoint = { lat: 48.1374, lon: 11.5755 };
const START_ZOOM = 4;
const NEAR_ZOOM = 16;

export const LocationPickerDialog = ({ open, onClose, onSend }: LocationPickerDialogProps) => {
  const { translations } = useLanguage();
  const t = translations.locationShare;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<PickerMap | null>(null);
  const [point, setPoint] = useState<PickerPoint>(START);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    let created: PickerMap | null = null;
    const frame = window.requestAnimationFrame(() => {
      void import('../model/leafletMap').then(({ createPickerMap }) => {
        if (cancelled || !containerRef.current) return;
        created = createPickerMap(containerRef.current, START, START_ZOOM, (next) => {
          setPoint(next);
          setAccuracy(null);
          setPicked(true);
        });
        mapRef.current = created;
        window.setTimeout(() => created?.resize(), 250);
      }, () => { if (!cancelled) setStatus('mapFailed'); });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      created?.destroy();
      mapRef.current = null;
    };
  }, [open]);

  const locate = () => {
    if (!navigator.geolocation) { setStatus('unavailable'); return; }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition((position) => {
      const next = { lat: position.coords.latitude, lon: position.coords.longitude };
      const meters = Math.round(position.coords.accuracy);
      setPoint(next);
      setAccuracy(meters);
      setPicked(true);
      setStatus('idle');
      mapRef.current?.moveTo(next, NEAR_ZOOM, meters);
    }, (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'), { enableHighAccuracy: true, timeout: 15_000 });
  };

  const close = () => {
    onClose();
    window.setTimeout(() => { setTitle(''); setAccuracy(null); setPicked(false); setStatus('idle'); setPoint(START); }, 200);
  };
  const send = () => {
    onSend({ type: 'location', location: buildLocation(point, accuracy, title) });
    close();
  };
  const notice = status === 'denied' ? t.locationDenied : status === 'unavailable' ? t.locationUnavailable : status === 'mapFailed' ? t.mapUnavailable : null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-lg flex-col overflow-y-auto">
        <DialogHeader><DialogTitle>{t.title}</DialogTitle></DialogHeader>
        <div className="relative h-72 overflow-hidden rounded-xl border border-border bg-muted">
          <div ref={containerRef} data-testid="location-map" className="h-full w-full" />
          <span className="pointer-events-none absolute bottom-0 right-0 z-[1000] rounded-tl bg-background/85 px-1.5 text-[10px] leading-5 text-foreground">
            {t.attribution}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{t.dragHint}</p>
        <Button type="button" variant="secondary" onClick={locate} disabled={status === 'locating'} className="justify-start gap-2">
          {status === 'locating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          {status === 'locating' ? t.locating : t.myLocation}
          {accuracy !== null && <span className="ml-auto text-xs text-muted-foreground">{fillTemplate(t.accuracy, { meters: String(accuracy) })}</span>}
        </Button>
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        <Input value={title} maxLength={TITLE_MAX} onChange={(event) => setTitle(event.target.value)} placeholder={t.placeName} aria-label={t.placeName} />
        <p className="flex items-start gap-2 rounded-lg bg-warning/10 p-2.5 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />{t.warning}
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>{translations.polls.cancel}</Button>
          <Button type="button" onClick={send} disabled={!picked}>{t.send}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
