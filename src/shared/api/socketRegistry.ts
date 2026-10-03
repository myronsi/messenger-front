const openSockets = new Set<WebSocket>();

export const trackWebSocket = (socket: WebSocket) => {
  openSockets.add(socket);
  socket.addEventListener('close', () => openSockets.delete(socket));
  return socket;
};

export const closeAllWebSockets = () => {
  openSockets.forEach((socket) => {
    try {
      socket.close(1000, 'Session ended');
    } catch {
      // socket already closed
    }
  });
  openSockets.clear();
};
