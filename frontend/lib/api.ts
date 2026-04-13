"use client";

import { useMemo } from 'react';
import axios from 'axios';
import { useUser } from '@clerk/nextjs';

// Central configuration for Backend API and WebSockets
export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const API_BASE_URL = `${BACKEND_URL}/api`;

// Helper for socket.io which usually needs the root URL
export const SOCKET_URL = BACKEND_URL;

export function useApiClient() {
  const { isLoaded, user } = useUser();
  const userId = user?.id;

  const api = useMemo(() => axios.create({
    baseURL: API_BASE_URL,
    headers: userId ? { 'x-user-id': userId } : {},
  }), [userId]);

  return { api, isLoaded, userId };
}
