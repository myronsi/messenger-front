export const WINDOW_MOTION_MS = 280;

export const windowSlide = (shown: boolean) => `motion-window-slide ${shown ? 'translate-x-0' : 'translate-x-full'}`;

export const mobileWindowSlide = (shown: boolean) => `max-sm:motion-window-slide ${shown ? 'max-sm:translate-x-0' : 'max-sm:translate-x-full'}`;
