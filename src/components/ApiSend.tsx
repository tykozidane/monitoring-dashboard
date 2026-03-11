'use client'

import { ApiAxios } from '@/libs/ApiAxios'

// eslint-disable-next-line @next/next/no-async-client-component
const ApiSend = async ({ url, data, method, headers, responseType, signal }: any) => {
  try {
    const res = await ApiAxios({
      url,
      method,
      data,
      headers,
      responseType,
      signal
    })

    res.data.valid = res.data.status === 200

    return res.data
  } catch (err: any) {
    return {
      message: err.message,
      status: err.response?.status,
      statusText: err.response?.statusText
    }
  }
}

export default ApiSend
