export type EngineModule = typeof import('../media/callEngine');

export const createEngineLoader = <T,>(importer: () => Promise<T>) => {
  let loading: Promise<T> | null = null;
  return () => {
    if (loading) return loading;
    const attempt = importer();
    loading = attempt;
    attempt.catch(() => { if (loading === attempt) loading = null; });
    return attempt;
  };
};

export const loadEngine = createEngineLoader<EngineModule>(() => import('../media/callEngine'));
