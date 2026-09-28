// Runtime API Configuration for Dogfood Frontend
// In Docker (Nginx on port 80 / 3000), /api routes are reverse-proxied to http://backend:8080.
// Relative URL '' ensures browser calls http://localhost:3000/api/... without CORS issues.
// In standalone local dev outside Nginx, it targets http://localhost:8080.

const isNginxProxy = typeof window !== 'undefined' && 
  (window.location.port === '3000' || window.location.port === '80' || window.location.port === '');

window.DOGFOOD_CONFIG = {
  apiBaseUrl: window.LODESTAR_API_BASE || (isNginxProxy ? '' : 'http://localhost:8080'),
  version: '2.4.0',
  defaultEventId: '1',
  pollIntervalMs: 5000
};

export const config = window.DOGFOOD_CONFIG;
export default config;
