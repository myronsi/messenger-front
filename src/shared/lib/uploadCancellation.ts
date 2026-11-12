const controllers = new Map<string, AbortController>();

const controllerFor = (id: string) => {
  let controller = controllers.get(id);
  if (!controller) {
    controller = new AbortController();
    controllers.set(id, controller);
  }
  return controller;
};

export const uploadAbortSignal = (id: string | number) => controllerFor(String(id)).signal;

export const cancelUpload = (id: string | number) => controllerFor(String(id)).abort();

export const forgetUpload = (id: string | number) => { controllers.delete(String(id)); };
