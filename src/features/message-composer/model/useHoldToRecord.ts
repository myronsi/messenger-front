import React, { useEffect, useRef, useState } from 'react';

export const LOCK_DISTANCE = 64;

interface HoldToRecordOptions {
  enabled: boolean;
  isRecording: boolean;
  isStarting?: boolean;
  start: () => void;
  stop: () => void;
}

export const useHoldToRecord = ({ enabled, isRecording, isStarting = false, start, stop }: HoldToRecordOptions) => {
  const [holding, setHolding] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lift, setLift] = useState(0);
  const pointerRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const swallowClickRef = useRef(false);

  const wasActiveRef = useRef(false);
  useEffect(() => {
    const active = isRecording || isStarting;
    if (wasActiveRef.current && !active) setLocked(false);
    wasActiveRef.current = active;
  }, [isRecording, isStarting]);

  const release = () => {
    pointerRef.current = null;
    setHolding(false);
    setLift(0);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    if (!enabled || event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
    }
    pointerRef.current = event.pointerId;
    startYRef.current = event.clientY;
    swallowClickRef.current = true;
    setLocked(false);
    setLift(0);
    setHolding(true);
    start();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    const distance = Math.max(0, startYRef.current - event.clientY);
    if (distance < LOCK_DISTANCE) {
      setLift(distance);
      return;
    }
    navigator.vibrate?.(15);
    setLocked(true);
    release();
  };

  const onPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    release();
    stop();
  };

  const takeClick = () => {
    const swallow = swallowClickRef.current;
    swallowClickRef.current = false;
    return !swallow;
  };

  return {
    holding,
    locked,
    lift,
    takeClick,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
};
