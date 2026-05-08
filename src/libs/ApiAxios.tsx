'use client'

import type { AxiosError } from 'axios';
import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';

export const ApiAxios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* REQUEST INTERCEPTOR */
ApiAxios.interceptors.request.use(
  async (config) => {
    // getSession akan memicu callback 'jwt' di NextAuth secara otomatis
    // Jika expired, NextAuth akan merotasi token sebelum line ini selesai
    const session = await getSession();

    // Jika NextAuth mengirim sinyal bahwa refresh token gagal
    if (session?.error === 'RefreshAccessTokenError') {
      console.log('🔒 Sesi habis total. Mengalihkan ke login...');
      await signOut({ callbackUrl: '/login' });

      return Promise.reject('Session Expired');
    }

    // Inject Access Token terbaru ke header
    if (session?.user?.accessToken) {
      config.headers.Authorization = `Bearer ${session.user.accessToken}`;
    }

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
      // Karena rotasi token sudah ditangani otomatis oleh interceptor request & NextAuth,
      // 401 di sini berarti token baru pun ditolak backend (atau user tidak punya refresh token).
      console.log('🔒 401 dari server. Token invalid. Log out...');
      await signOut({ callbackUrl: '/login' });
    } else if (status >= 500) {
      console.log('💥 [Server Error]: Terjadi masalah di server backend.');
    }

    return Promise.reject(error);
  }
);
