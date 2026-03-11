'use client'

import axios from 'axios'
import { getSession, signOut } from 'next-auth/react'

const accessToken: string | null = null
const refreshToken: string | null = null
const refreshing = false
const queue: ((token: string) => void)[] = []

export const ApiAxios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true
})

/* REQUEST */
ApiAxios.interceptors.request.use(async config => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

/* RESPONSE */
ApiAxios.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config as any

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (refreshing) {
        return new Promise(resolve => {
          queue.push(token => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(ApiAxios(original))
          })
        })
      }
    }

    return Promise.reject(error)
  }
)
