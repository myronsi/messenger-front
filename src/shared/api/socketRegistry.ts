const openSockets = new Set<WebSocket>();
const closeAllHandlers = new Set<() => void>();

export const onCloseAllWebSockets = (handler: () => void) => {
  closeAllHandlers.add(handler);
  return () => { closeAllHandlers.delete(handler); };
};

export const trackWebSocket = (socket: WebSocket) => {
  openSockets.add(socket);
  socket.addEventListener('close', () => openSockets.delete(socket));
  return socket;
};

export const closeAllWebSockets = () => {
  closeAllHandlers.forEach(handler => handler());
  openSockets.forEach((socket) => {
    try {
      socket.close(1000, 'Session ended');
    } catch {
      // socket already closed
    }
  });
  openSockets.clear();
};
