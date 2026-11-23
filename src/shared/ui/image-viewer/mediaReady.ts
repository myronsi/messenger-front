export const whenDecoded = (image: HTMLImageElement, done: () => void) => {
  if (typeof image.decode !== 'function') {
    done();
    return;
  }
  void image.decode().catch(() => undefined).then(done);
};
