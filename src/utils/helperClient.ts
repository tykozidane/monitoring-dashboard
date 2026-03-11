import React, { useEffect, useState } from 'react'

import type { TextFieldProps } from '@mui/material/TextField'
import TextField from '@mui/material/TextField'

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
