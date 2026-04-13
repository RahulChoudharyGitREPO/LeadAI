// Central configuration for Backend API and WebSockets
export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const API_BASE_URL = `${BACKEND_URL}/api`;

// Helper for socket.io which usually needs the root URL
export const SOCKET_URL = BACKEND_URL;
