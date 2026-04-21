'use client'

import type { AxiosError } from 'axios';
import axios from 'axios';
import { signOut } from 'next-auth/react';

export const ApiAxios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

ApiAxios.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/* RESPONSE INTERCEPTOR */
ApiAxios.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (!error.response) {
      console.log('🚨 [Network Error]: Pastikan backend berjalan dan CORS diizinkan.', error.message);

      return Promise.reject(error);
    }

    const status = error.response.status;

    if (status === 401) {
      console.log('🔒 Sesi habis atau tidak valid (401). Mengalihkan ke login...');

      await signOut({ callbackUrl: '/login' });
    } else if (status >= 500) {
      console.log('💥 [Server Error]: Terjadi masalah di server backend.');
    }

    return Promise.reject(error);
  }
);
