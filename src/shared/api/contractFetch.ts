// The generated client uses the original v2 wire format, without screen adapters.
let fetcher: typeof fetch = (...args) => window.fetch(...args);
export const setContractFetch = (next: typeof fetch) => { fetcher = next; };
export const contractFetch: typeof fetch = (...args) => fetcher(...args);
