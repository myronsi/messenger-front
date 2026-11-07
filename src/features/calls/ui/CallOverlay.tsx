import React from 'react';
import { ringingCalls } from '../model/callState';
import ActiveCallPanel from './ActiveCallPanel';
import CallAnnouncer from './CallAnnouncer';
import CallNotices from './CallNotices';
import IncomingCallCard from './IncomingCallCard';
import { useAccount, useCallSession, useCallsState, useNow } from './callHooks';

const CallOverlay: React.FC = () => {
  const calls = useCallsState();
  const session = useCallSession();
  const { userId } = useAccount();
  const now = useNow();
  const incoming = ringingCalls(calls, userId, now).find((call) => call.id !== session.callId) ?? null;
  const inCall = !!session.callId && session.phase !== 'idle';
  const active = session.callId ? calls.byId[session.callId] ?? null : null;
  return (
    <>
      <CallAnnouncer incoming={incoming} inCall={inCall} userId={userId} />
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[1040] flex flex-col items-center gap-2 px-4">
        {incoming && <IncomingCallCard key={incoming.id} call={incoming} userId={userId} />}
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[1040] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
        <CallNotices session={session} />
        {inCall && <ActiveCallPanel call={active} session={session} userId={userId} />}
      </div>
    </>
  );
};

export default CallOverlay;
