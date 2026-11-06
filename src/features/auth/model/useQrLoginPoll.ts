import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { localDeadline, secondsUntil } from '@/shared/lib/countdown';
import { QR_LOGIN_TTL_MS } from './requestLifetimes';
import { createQrLogin, isRateLimited, pollQrLogin } from '../api/qrLoginApi';
import type { QrLoginApproved, QrLoginStart } from './qrLoginTypes';

export type QrSignInStatus = 'creating' | 'pending' | 'scanned' | 'approved' | 'denied' | 'expired' | 'failed' | 'rateLimited';

export const QR_POLL_INTERVAL_MS = 2000;
export const QR_POLL_MAX_BACKOFF_MS = 30_000;

const isVisible = () => document.visibilityState === 'visible';

export const useQrLoginPoll = (onApproved: (result: QrLoginApproved) => void) => {
  const [request, setRequest] = useState<QrLoginStart | null>(null);
  const [deadline, setDeadline] = useState(0);
  const [status, setStatus] = useState<QrSignInStatus>('creating');
  const [seconds, setSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(1);
  const [connectionError, setConnectionError] = useState(false);
  const autoRefreshed = useRef(false);
  const generation = useRef(0);
  const onApprovedRef = useLatestRef(onApproved);

  const create = useCallback(async () => {
    const run = ++generation.current;
    setStatus('creating'); setRequest(null); setConnectionError(false);
    try {
      const next = await createQrLogin();
      if (run !== generation.current) return;
      const nextDeadline = localDeadline(next.expires_at, QR_LOGIN_TTL_MS);
      const left = secondsUntil(nextDeadline);
      setRequest(next); setDeadline(nextDeadline); setSeconds(left); setTotalSeconds(Math.max(1, left)); setStatus('pending');
    } catch (error) {
      if (run === generation.current) setStatus(isRateLimited(error) ? 'rateLimited' : 'failed');
    }
  }, []);

  const refresh = useCallback(() => {
    autoRefreshed.current = false;
    void create();
  }, [create]);

  useEffect(() => {
    void create();
    return () => { generation.current += 1; };
  }, [create]);

  const live = status === 'pending' || status === 'scanned';

  useEffect(() => {
    if (!request || !live) return;
    let active = true;
    let controller: AbortController | undefined;
    let backoff = 0;
    let resumeAt = 0;
    const poll = async () => {
      if (!active || !isVisible() || controller || Date.now() < resumeAt) return;
      const current = new AbortController();
      controller = current;
      try {
        const result = await pollQrLogin(request.request_id, request.poll_token, current.signal);
        if (!active) return;
        backoff = 0;
        setConnectionError(false);
        if (result.status === 'approved') {
          active = false;
          setStatus('approved');
          onApprovedRef.current(result);
        } else setStatus(result.status);
      } catch (error) {
        if (!active || current.signal.aborted) return;
        if (isRateLimited(error)) {
          backoff = Math.min(QR_POLL_MAX_BACKOFF_MS, backoff ? backoff * 2 : QR_POLL_INTERVAL_MS * 2);
          resumeAt = Date.now() + backoff;
        }
        setConnectionError(true);
      } finally {
        if (controller === current) controller = undefined;
      }
    };
    const onVisibility = () => {
      if (isVisible()) void poll();
      else controller?.abort();
    };
    const timer = window.setInterval(() => { void poll(); }, QR_POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [request, live, onApprovedRef]);

  useEffect(() => {
    if (!request || !live) return;
    const tick = () => {
      const left = secondsUntil(deadline);
      setSeconds(left);
      if (!left) setStatus('expired');
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [request, deadline, live]);

  useEffect(() => {
    if (status !== 'expired' || autoRefreshed.current || !isVisible()) return;
    autoRefreshed.current = true;
    void create();
  }, [status, create]);

  return { request, status, seconds, totalSeconds, connectionError, refresh };
};
