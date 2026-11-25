export const LoadingPill = ({ label }: { label: string }) => (
  <div className="flex justify-center">
    <div className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
      {label}
    </div>
  </div>
);
