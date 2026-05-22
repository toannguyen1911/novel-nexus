const rawApiUrl = import.meta.env.VITE_API_URL || '';
export const API_BASE = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
