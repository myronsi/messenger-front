export const createUploadQueue = () => {
  let tail: Promise<void> | null = null;
  return (run: () => Promise<void>) => {
    const upload = tail ? tail.then(run) : run();
    const settled = upload.catch(() => undefined);
    tail = settled;
    void settled.then(() => {
      if (tail === settled) tail = null;
    });
    return upload;
  };
};
