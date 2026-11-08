import React from 'react';
import { setCallStage } from '../model/callView';

const CallStage: React.FC = () => <div ref={setCallStage} data-call-stage="" className="pointer-events-none absolute inset-0 z-40 empty:hidden" />;

export default CallStage;
