import { Skeleton } from '@/shared/ui/skeleton';

const ChatListBodySkeleton = () => (
  <div className="space-y-1 p-3">
    {Array.from({ length: 9 }).map((_, index) => (
      <div key={index} className="flex items-center gap-3 rounded-md px-2 py-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-3 w-full max-w-[220px]" />
        </div>
      </div>
    ))}
  </div>
);

const ChatListSkeleton = () => (
  <div className="flex h-full flex-col bg-white">
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-100 px-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-9 w-9 rounded-full" />
    </div>
    <ChatListBodySkeleton />
  </div>
);

const ChatRoomSkeleton = () => (
  <div className="flex h-full flex-col bg-white">
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-100 px-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <div className="flex-1 space-y-5 px-5 py-6 md:px-10">
      <div className="flex justify-start">
        <Skeleton className="h-14 w-2/5 rounded-2xl" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-16 w-1/2 rounded-2xl" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-10 w-1/3 rounded-2xl" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-20 w-2/5 rounded-2xl" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-12 w-1/2 rounded-2xl" />
      </div>
    </div>
    <div className="shrink-0 border-t border-gray-100 p-4">
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  </div>
);

const MessengerAppSkeleton = ({ isMobile = false }: { isMobile?: boolean }) => {
  if (isMobile) {
    return (
      <div className="min-h-screen bg-white">
        <ChatListSkeleton />
      </div>
    );
  }

  return (
    <div className="flex h-screen max-h-screen min-w-full overflow-hidden bg-gradient-to-br from-blue-100 to-white">
      <div className="w-1/4 overflow-hidden rounded-lg bg-white shadow-lg">
        <ChatListSkeleton />
      </div>
      <div className="w-3/4 overflow-hidden rounded-lg bg-white shadow-lg">
        <ChatRoomSkeleton />
      </div>
    </div>
  );
};

const UserProfileSkeleton = () => (
  <div className="flex min-h-full flex-col">
    <div className="px-5 pb-3 pt-5 text-center md:pt-4">
      <Skeleton className="mx-auto h-24 w-24 rounded-full md:h-20 md:w-20" />
      <Skeleton className="mx-auto mt-3 h-5 w-36" />
      <Skeleton className="mx-auto mt-2 h-3 w-24" />
      <Skeleton className="mx-auto mt-3 h-7 w-32 rounded-full" />
    </div>
    <div className="grid grid-cols-3 gap-2 border-y border-gray-200 px-4 py-3">
      <Skeleton className="h-12 rounded-md" />
      <Skeleton className="h-12 rounded-md" />
      <Skeleton className="h-12 rounded-md" />
    </div>
    <div className="flex-1 space-y-3 px-5 py-4 md:py-3">
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-28 rounded-lg" />
      <Skeleton className="h-11 rounded-lg" />
    </div>
  </div>
);

export { ChatListBodySkeleton, ChatListSkeleton, ChatRoomSkeleton, MessengerAppSkeleton, UserProfileSkeleton };
