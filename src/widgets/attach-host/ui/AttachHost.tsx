import { closeAttach, useAttachRequest, type RichSend } from '@/entities/message';
import { PollComposerDialog } from '@/features/polls';
import { ContactPickerDialog } from '@/features/contact-share';
import { LocationPickerDialog } from '@/features/location-share';

export const AttachHost = () => {
  const request = useAttachRequest();
  const kind = request?.kind;
  const send = (value: RichSend) => request?.onSend(value);
  return (
    <>
      <PollComposerDialog open={kind === 'poll'} onClose={closeAttach} onSend={(poll) => send({ type: 'poll', poll })} />
      <ContactPickerDialog open={kind === 'contact'} onClose={closeAttach} onSend={send} />
      <LocationPickerDialog open={kind === 'location'} onClose={closeAttach} onSend={send} />
    </>
  );
};
