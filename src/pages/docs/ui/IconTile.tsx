import type { LucideIcon } from 'lucide-react';

const IconTile = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
    <Icon className="h-4 w-4" />
  </span>
);

export default IconTile;
