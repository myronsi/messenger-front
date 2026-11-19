import { closeContentReport, useContentReportRequest } from '@/entities/message';
import { ReportContentDialog } from './ReportContentDialog';

export const ContentReportHost = () => {
  const request = useContentReportRequest();
  if (!request) return null;
  const key = request.kind === 'message' ? `message:${request.messageId}` : `group:${request.chatId}`;
  return <ReportContentDialog key={key} request={request} onClose={closeContentReport} />;
};
