import React from 'react'

import { rankItem } from '@tanstack/match-sorter-utils'
import type { FilterFn } from '@tanstack/react-table'

import { getInitials } from './getInitials'
import CustomAvatar from '@core/components/mui/Avatar'

export const findActionsByPathname = (items: any[], pathname: string): string[] | null => {
  for (const item of items) {
    if (item.href === pathname) {
      return item.action || []
    }

    if (item.children) {
      const found = findActionsByPathname(item.children, pathname)

      if (found) {
        return found
      }
    }
  }

  return null
}

export const base64ToFile = (base64String?: string | null) => {
  if (typeof base64String !== 'string') return undefined

  const [metadata, base64Data] = base64String.split(',')
  const mimeType = metadata.match(/:(.*?);/)?.[1]

  if (metadata && mimeType) {
    const binaryString = atob(base64Data)

    const arrayBuffer = new ArrayBuffer(binaryString.length)
    const uint8Array = new Uint8Array(arrayBuffer)

    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i)
    }

    const extension = mimeType?.split('/')[1]
    const filename = `file.${extension}`

    const blob = new Blob([arrayBuffer], { type: mimeType })

    return new File([blob], filename, { type: mimeType })
  } else {
    return null
  }
}

export const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

export const isBase64 = (str?: string | null) => {
  if (typeof str !== 'string') return false

  // Regex ini membolehkan image/* apa saja (termasuk svg, bmp, ico)
  return /^data:image\/[a-zA-Z+.-]+;base64,/.test(str)
}

interface CompressOptions {
  maxSizeMB?: number // Target ukuran file (default 0.5 MB)
  maxWidth?: number // Lebar maksimal (default 1024px)
  variant?: 'profile' | 'product' // 'profile' = crop kotak, 'product' = keep ratio
}

export const compressImage = (file: File, options: CompressOptions = {}): Promise<File> => {
  const { maxSizeMB = 0.5, maxWidth = 1024, variant = 'product' } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.readAsDataURL(file)

    reader.onload = e => {
      if (!e.target?.result) return reject('Failed to read file')
      img.src = e.target.result as string
    }

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) return reject('Canvas context not available')

      let width = img.width
      let height = img.height

      // 1. Tentukan Dimensi Canvas & Cara Gambar (Draw Image)
      let sx = 0,
        sy = 0,
        sWidth = width,
        sHeight = height // Source (Asli)
      let dx = 0,
        dy = 0,
        dWidth = width,
        dHeight = height // Destination (Canvas)

      if (variant === 'profile') {
        // MODE PROFILE: Square Crop (Cover)
        // Ambil sisi terpendek untuk membuat kotak
        const minSide = Math.min(width, height)

        // Tentukan area potong di tengah (Center Crop)
        sx = (width - minSide) / 2
        sy = (height - minSide) / 2
        sWidth = minSide
        sHeight = minSide

        // Resize output ke maxWidth (misal 500x500)
        const size = Math.min(minSide, 500) // Profil tidak perlu terlalu besar

        canvas.width = size
        canvas.height = size

        // Gambar ke seluruh area canvas
        dx = 0
        dy = 0
        dWidth = size
        dHeight = size
      } else {
        // MODE PRODUCT: Maintain Aspect Ratio (Contain)
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        dWidth = width
        dHeight = height
      }

      // 2. Gambar ke Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height) // Pastikan background transparan

      // ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      if (variant === 'profile') {
        ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      } else {
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, width, height)
      }

      // 3. Kompresi Loop (Quality Reduction)
      let quality = 0.9
      const outputFormat = 'image/webp' // WebP mendukung transparansi & ukuran kecil
      const targetSize = maxSizeMB * 1024 * 1024

      const tryCompress = () => {
        canvas.toBlob(
          blob => {
            if (!blob) return reject('Compression failed')

            if (blob.size <= targetSize || quality <= 0.5) {
              // Rename extension to .webp
              const newName = file.name.replace(/\.[^/.]+$/, '') + '.webp'

              const compressedFile = new File([blob], newName, {
                type: outputFormat,
                lastModified: Date.now()
              })

              resolve(compressedFile)
            } else {
              quality -= 0.1
              tryCompress()
            }
          },
          outputFormat,
          quality
        )
      }

      tryCompress()
    }

    img.onerror = err => reject('Image load error: ' + err)
  })
}

export const GetAvatar = (params: { image?: string | null; name: string }) => {
  const { image, name } = params

  if (image) {
    return React.createElement(CustomAvatar, { src: image, skin: 'light', size: 34 })
  } else {
    return React.createElement(CustomAvatar, { skin: 'light', size: 34 }, getInitials(name as string))
  }
}

export const formatCurrency = (value: number, currency: string = 'IDR') => {
  return value.toLocaleString('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

export const formatNumber = (value?: number | string | null) => {
  return Number(value)?.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value)

  // Store the itemRank info
  addMeta({
    itemRank
  })

  // Return if the item should be filtered in/out
  return itemRank.passed
}

export const normalizeDate = (value: string | Date | null | undefined) => {
  if (!value) return null

  if (value instanceof Date) return value

  // Format ISO (sudah benar)
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value)
  }

  // Format "YYYY-MM-DD HH:mm:ss dianggap WIB"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(value.replace(' ', 'T') + '+07:00')
  }

  throw new Error(`Invalid date format: ${value}`)
}

export const unit = [
  { value: 'cm', label: 'centimeter (cm)' },
  { value: 'c', label: 'cup (c)' },
  { value: 'fl oz', label: 'fluid ounce (fl oz)' },
  { value: 'gal', label: 'gallon (gal)' },
  { value: 'g', label: 'gram (g)' },
  { value: 'in', label: 'inch (in)' },
  { value: 'kg', label: 'kilogram (kg)' },
  { value: 'l', label: 'litre (l)' },
  { value: 'm', label: 'meter (m)' },
  { value: 'mg', label: 'milligram (mg)' },
  { value: 'ml', label: 'millilitre (ml)' },
  { value: 'oz', label: 'ounce (oz)' },
  { value: 'pcs', label: 'pieces (pcs)' },
  { value: 'pint', label: 'pint (pt)' },
  { value: 'lb', label: 'pound (lb)' },
  { value: 'q', label: 'quart (q)' },
  { value: 'tbsp', label: 'tablespoon (tbsp)' },
  { value: 'tsp', label: 'teaspoon (tsp)' },
  { value: 'pck', label: 'pack (pck)' },
  { value: 'ikt', label: 'ikat (ikt)' },
  { value: 'btg', label: 'batang (btg)' },
  { value: 'bks', label: 'bungkus (bks)' },
  { value: 'sct', label: 'sachet (sct)' },
  { value: 'tn', label: 'ton (tn)' },
  { value: 'kw', label: 'kwintal (kw)' },
  { value: 'btl', label: 'botol (btl)' },
  { value: 'prs', label: 'portion (prs)' },
  { value: 'ktn', label: 'karton (ktn)' },
  { value: 'krg', label: 'karung (krg)' },
  { value: 'crt', label: 'krat (crt)' },
  { value: 'box', label: 'box (box)' },
  { value: 'bal', label: 'bal (bal)' },
  { value: 'lsn', label: 'lusin (lsn)' },
  { value: 'ekr', label: 'ekor (ekr)' },
  { value: 'kds', label: 'kardus (kds)' },
  { value: 'ptg', label: 'potong (ptg)' },
  { value: 'btr', label: 'butir (btr)' },
  { value: 'ons', label: 'ons (ons)' },
  { value: 'grp', label: 'gros (grs)' },
  { value: 'lbr', label: 'lembar (lbr)' },
  { value: 'klg', label: 'kaleng (klg)' },
  { value: 'whl', label: 'whole (whl)' },
  { value: 'jar', label: 'jar (jar)' },
  { value: 'bbl', label: 'barrel (bbl)' },
  { value: 'jrg', label: 'jerigen (jrg)' },
  { value: 'bh', label: 'buah (bh)' }
]
