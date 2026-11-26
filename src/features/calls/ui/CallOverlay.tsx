import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ringingCalls } from '../model/callState';
import { callViewStore, maximizeCall, minimizeCall, shouldMinimizeOnChatChange } from '../model/callView';
import { useStore } from '../model/createStore';
import { bubbleTile } from '../model/videoLayout';
import ActiveCallPanel from './ActiveCallPanel';
import CallAnnouncer from './CallAnnouncer';
import CallBubble from './CallBubble';
import CallNotices from './CallNotices';
import IncomingCallCard from './IncomingCallCard';
import { useAccount, useCallSession, useCallsState, useNow } from './callHooks';
import { useCallViewMotion } from './useCallViewMotion';
import { useLayoutInput } from './videoHooks';

interface CallOverlayProps {
  openChatId?: string | null;
}

const CallOverlay: React.FC<CallOverlayProps> = ({ openChatId = null }) => {
  const calls = useCallsState();
  const session = useCallSession();
  const view = useStore(callViewStore);
  const { userId, sessionId } = useAccount();
  const now = useNow();
  const shownChat = useRef(openChatId);
  const incoming = ringingCalls(calls, userId, now).find((call) => call.id !== session.callId) ?? null;
  const inCall = !!session.callId && session.phase !== 'idle';
  const active = session.callId ? calls.byId[session.callId] ?? null : null;
  const motion = useCallViewMotion(inCall, view.mode, view.corner);
  const layoutInput = useLayoutInput(active, userId, sessionId);
  const bubbleVideo = view.mode === 'mini' ? bubbleTile(layoutInput) : null;

  useEffect(() => {
    if (session.callId) maximizeCall();
  }, [session.callId]);

  useEffect(() => {
    const previous = shownChat.current;
    shownChat.current = openChatId;
    if (inCall && shouldMinimizeOnChatChange(previous, openChatId, session.chatId)) minimizeCall();
  }, [inCall, openChatId, session.chatId]);

  const panel = <ActiveCallPanel call={active} session={session} userId={userId} sessionId={sessionId} />;
  const layer = motion.closing ? 'pointer-events-none' : 'pointer-events-auto';
  return (
    <>
      <CallAnnouncer incoming={incoming} inCall={inCall} userId={userId} />
      {inCall && motion.fullMounted && (view.stage
        ? createPortal(<div ref={motion.attachFull} className={`${layer} absolute inset-0 overflow-hidden`}>{panel}</div>, view.stage)
        : <div ref={motion.attachFull} className={`${layer} fixed inset-0 z-[1035] overflow-hidden`}>{panel}</div>)}
      {inCall && view.mode === 'mini' && !motion.fullMounted && <CallBubble call={active} session={session} userId={userId} video={bubbleVideo?.feed ?? null} />}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[1040] flex flex-col items-center gap-2 px-4">
        {incoming && <IncomingCallCard key={incoming.id} call={incoming} userId={userId} />}
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[1040] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
        <CallNotices session={session} />
      </div>
    </>
  );
};

export default CallOverlay;
