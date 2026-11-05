export function MobileGalleryEdges({ previous, next, zoomed }: { previous: boolean; next: boolean; zoomed: boolean }) {
  const fade = 'transition-opacity duration-200 ease-out motion-reduce:transition-none';
  return (
    <div aria-hidden="true" data-testid="mobile-gallery-edges" className="pointer-events-none absolute inset-0 z-10 sm:hidden">
      <div className={`absolute inset-y-0 left-0 w-[16vw] bg-gradient-to-r from-black/50 to-transparent ${fade} ${previous && !zoomed ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute inset-y-0 right-0 w-[16vw] bg-gradient-to-l from-black/50 to-transparent ${fade} ${next && !zoomed ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}
