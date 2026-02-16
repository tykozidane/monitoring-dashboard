import React, { useEffect, useState } from 'react'

import TextField from '@mui/material/TextField'
import { rankItem } from '@tanstack/match-sorter-utils'
import type { TextFieldProps } from '@mui/material/TextField'
import type { FilterFn } from '@tanstack/react-table'

// Fuzzy Filter Function
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

// Debounced Input Component
export const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<TextFieldProps, 'onChange'>) => {
  // States
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value])

  return React.createElement(TextField, {
    ...props,
    value: value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
    size: 'small'
  })
}
