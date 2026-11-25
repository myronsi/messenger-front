export type ImportSource = 'telegram' | 'whatsapp';

export type AttachmentKind = 'image' | 'video' | 'audio' | 'voice' | 'sticker' | 'file';

export interface ParsedAttachment {
  path: string;
  name: string;
  kind: AttachmentKind;
  size?: number;
}

export type NoticeCode = 'poll' | 'location' | 'contact' | 'call' | 'mediaOmitted' | 'fileMissing' | 'fileTooLarge' | 'fileUnsupported' | 'sticker'
  | 'groupCreated' | 'membersAdded' | 'membersRemoved' | 'memberJoined' | 'messagePinned' | 'titleChanged' | 'photoChanged' | 'service';

export interface ParsedNotice {
  code: NoticeCode;
  detail: string;
  actor?: string;
}

export interface ParsedMessage {
  index: number;
  senderKey: string | null;
  originalAt: string;
  text: string;
  attachment?: ParsedAttachment;
  notice?: ParsedNotice;
  replyToIndex?: number;
  forwardedFromName?: string;
}

export interface ParsedSender {
  key: string;
  name: string;
  messageCount: number;
}

export type DateOrder = 'dmy' | 'mdy';

export interface ParsedChat {
  source: ImportSource;
  title: string;
  messages: ParsedMessage[];
  senders: ParsedSender[];
  fileCount: number;
  firstAt: string | null;
  lastAt: string | null;
  dateOrder?: DateOrder;
  dateOrderCertain?: boolean;
}

export type ParseErrorCode = 'telegramHtml' | 'telegramAccountExport' | 'unknownFormat' | 'noChatFile' | 'emptyChat' | 'brokenFile';

export class ImportParseError extends Error {
  constructor(readonly code: ParseErrorCode) {
    super(code);
  }
}

export const MAX_IMPORT_MESSAGES = 100_000;
export const MAX_IMPORT_FILES = 5_000;
export const IMPORT_BATCH_SIZE = 500;
