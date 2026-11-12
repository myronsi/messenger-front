import type { EntityId } from '@/shared/api/entityId';
import { beginChatActivity, uploadActivity } from '@/entities/typing';
import { getLocalUploadFileType, type UploadFile } from './uploadFileType';

export const withUploadActivity = async (chatId: EntityId, files: readonly UploadFile[], run: () => Promise<void>) => {
  const end = beginChatActivity(chatId, uploadActivity(files.map(({ file, fileName }) => getLocalUploadFileType(fileName, file.type))));
  try {
    await run();
  } finally {
    end();
  }
};
