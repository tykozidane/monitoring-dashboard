'use client'

import type { AxiosError } from 'axios';
import axios from 'axios'
import { signOut } from 'next-auth/react';

export const ApiAxios = axios.create({
  baseURL: process.env.API_MONITORING_URL,
})

/* RESPONSE */
ApiAxios.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await signOut({ redirect: false })
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)
