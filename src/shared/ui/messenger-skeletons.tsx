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

const UserProfileSkeleton = () => (
  <div data-testid="user-profile-skeleton" className="flex min-h-full flex-col">
    <Skeleton className="h-32 w-full rounded-none" />
    <div className="flex items-start justify-between gap-3 px-5">
      <div className="-mt-14 h-28 w-28 shrink-0 rounded-full bg-background p-1">
        <Skeleton className="h-full w-full rounded-full" />
      </div>
      <div className="flex gap-2 pt-3">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
    <div className="px-5 pt-2">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="mt-2 h-4 w-36" />
    </div>
    <div className="mx-5 mt-3 flex gap-6 border-b border-border pb-2.5 pt-1">
      <Skeleton className="h-4 w-10" />
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 w-10" />
    </div>
    <div className="flex-1 space-y-5 px-5 py-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  </div>
);

export { ChatListBodySkeleton, UserProfileSkeleton };
