export const deviceLabel = (agent?: string | null) => {
  if (!agent) return 'Unknown device';
  const browser = agent.includes('Firefox') ? 'Firefox' : agent.includes('Edg') ? 'Edge'
    : agent.includes('Chrome') ? 'Chrome' : agent.includes('Safari') ? 'Safari' : 'Browser';
  const os = agent.includes('Android') ? 'Android' : /iPhone|iPad/.test(agent) ? 'iOS'
    : agent.includes('Windows') ? 'Windows' : agent.includes('Mac OS') ? 'macOS' : agent.includes('Linux') ? 'Linux' : 'Device';
  return `${browser} on ${os}`;
};
