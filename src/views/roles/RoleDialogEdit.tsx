'use client'

// React Imports
import { useState, useEffect, useMemo } from 'react'

import { useForm, Controller } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { object, minLength, string, pipe, type InferOutput } from 'valibot'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Checkbox from '@mui/material/Checkbox'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import DialogActions from '@mui/material/DialogActions'
import { CircularProgress, Button, Autocomplete } from '@mui/material'

// Style Imports
import { toast } from 'react-toastify'

import tableStyles from '@core/styles/table.module.css'
import ApiSend from '@/components/ApiSend'

// --- Types ---
type PermissionAction = 'read' | 'write' | 'create' | 'delete'

export interface MenuDataType {
  label: string
  href: string // Menjadi key utama
  children?: MenuDataType[]
  action?: PermissionAction[]
}

interface RoleData {
  id?: string
  name: string
  permission?: MenuDataType[]
  view?: string
}

type RoleDialogProps = {
  open: boolean
  setOpen: (open: boolean) => void
  title?: string
  data?: RoleData
  menuData: MenuDataType[]
  updateData: (datas: RoleData[]) => void
}

// Schema Valibot
const schemaChangePass = object({
  name: pipe(string(), minLength(1, 'This field is required')),
  view: pipe(string(), minLength(1, 'This field is required')),
})

type FormData = InferOutput<typeof schemaChangePass>

// --- Helper Functions ---

// Separator untuk memisahkan href dan action di dalam state string
// Contoh hasil: "/apps/user-list#read"
const ACTION_SEPARATOR = '#'

// Mengambil list item (leaf nodes) untuk ditampilkan di tabel
// Mengembalikan objek { label, href } agar label bisa ditampilkan tapi href jadi key
function extractMenuLeafs(items: MenuDataType[]): { label: string; href: string }[] {
  let res: { label: string; href: string }[] = []

  items.forEach((item) => {
    // Jika tidak punya children, ambil item ini
    if (!item.children) {
      res.push({ label: item.label, href: item.href })
    }

    // Jika punya children, lakukan rekursif
    if (item.children) {
      res = res.concat(extractMenuLeafs(item.children))
    }
  })

  return res
}

// Mengubah struktur permission tree menjadi array string ID unik berdasarkan HREF
function generateLabelActionArray(data?: MenuDataType[]): string[] {
  const output: string[] = []

  function processItems(items?: MenuDataType[]) {
    items?.forEach((item) => {
      if (item.action) {
        item.action.forEach((action) => {
          // Gunakan HREF sebagai key, bukan label
          if (item.href) {
            output.push(`${item.href}${ACTION_SEPARATOR}${action}`)
          }
        })
      }

      if (item.children) {
        processItems(item.children)
      }
    })
  }

  processItems(data)

  return output
}

// Mengembalikan struktur tree baru dengan action yang sesuai state checkbox
function mapActions(data: MenuDataType[], selectedActions: string[]): MenuDataType[] {
  // Buat map: { "/apps/user": ["read", "write"], ... }
  const actionMap = selectedActions.reduce((acc, actionStr) => {
    // Split berdasarkan separator khusus
    const [hrefKey, act] = actionStr.split(ACTION_SEPARATOR)

    if (!hrefKey || !act) return acc;

    if (!acc[hrefKey]) {
      acc[hrefKey] = []
    }

    acc[hrefKey].push(act as PermissionAction)

    return acc
  }, {} as Record<string, PermissionAction[]>)

  function processItem(item: MenuDataType): MenuDataType {
    const newItem = { ...item } // Shallow copy

    // Cek action berdasarkan href item ini
    if (newItem.href && actionMap[newItem.href] && actionMap[newItem.href].length > 0) {
      newItem.action = actionMap[newItem.href]
    } else {
      delete newItem.action
    }

    if (item.children) {
      newItem.children = item.children.map(processItem)
    }

    return newItem
  }

  return data.map(processItem)
}

const RoleDialogEdit = ({ open, setOpen, title, data, menuData, updateData }: RoleDialogProps) => {
  const [loading, setLoading] = useState(false)

  // Ambil data flat (href & label) untuk render tabel
  const flatMenuData = useMemo(() => extractMenuLeafs(menuData), [menuData])

  // State menyimpan array string unik: "href#action"
  const [selectedCheckbox, setSelectedCheckbox] = useState<string[]>(() =>
    title ? generateLabelActionArray(data?.permission) : []
  )

  const [isIndeterminateCheckbox, setIsIndeterminateCheckbox] = useState<boolean>(false)

  // Reset checkbox saat dialog dibuka/data berubah
  useEffect(() => {
    if (open) {
      setSelectedCheckbox(title ? generateLabelActionArray(data?.permission) : [])
    }
  }, [open, title, data])

  const handleClose = () => {
    setOpen(false)
    reset()
  }

  const togglePermission = (uniqueId: string) => {
    setSelectedCheckbox(prev => {
      const newSet = new Set(prev)

      if (newSet.has(uniqueId)) {
        newSet.delete(uniqueId)
      } else {
        newSet.add(uniqueId)
      }


      return Array.from(newSet)
    })
  }

  const handleSelectAllCheckbox = () => {
    const totalPossible = flatMenuData.length * 4

    if (isIndeterminateCheckbox || selectedCheckbox.length === totalPossible) {
      // Uncheck All
      setSelectedCheckbox([])
    } else {
      // Check All
      const allPermissions: string[] = []

      flatMenuData.forEach((row) => {
        if (row.href) {
          allPermissions.push(
            `${row.href}${ACTION_SEPARATOR}read`,
            `${row.href}${ACTION_SEPARATOR}write`,
            `${row.href}${ACTION_SEPARATOR}delete`,
            `${row.href}${ACTION_SEPARATOR}create`
          )
        }
      })
      setSelectedCheckbox(allPermissions)
    }
  }

  useEffect(() => {
    const totalPossible = flatMenuData.length * 4

    if (selectedCheckbox.length > 0 && selectedCheckbox.length < totalPossible) {
      setIsIndeterminateCheckbox(true)
    } else {
      setIsIndeterminateCheckbox(false)
    }
  }, [selectedCheckbox, flatMenuData])

  const {
    control,
    reset,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    resolver: valibotResolver(schemaChangePass),
    defaultValues: {
      name: title ?? '',
      view: data?.view ?? 'user',
    }
  })

  useEffect(() => {
    if (open) {
      reset({
        name: title ? data?.name : '',
        view: data?.view ?? 'user',
      })
    }
  }, [data, title, open, reset])

  const onSubmit = async (formData: FormData) => {
    setLoading(true)

    if (selectedCheckbox.length === 0) {
      setLoading(false)

      return toast.info('Checklist permission is required')
    }

    const postData = {
      id: data?.id,
      name: formData.name,

      // Map ulang berdasarkan href
      permission: mapActions(menuData, selectedCheckbox),
      view: formData.view,
    }

    try {
      const res = await ApiSend({
        url: `/role`,
        method: title ? 'PATCH' : 'POST',
        data: postData
      })

      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

      if (res?.valid) {
        toast.success(res.message)
        if (res.data) updateData(res.data)
        await sleep(500)
        handleClose()
      } else if (res?.status === 401) {
        toast.info(res.message)
      } else {
        toast.error(res?.message || 'Something went wrong')
        await sleep(500)
      }
    } catch (error) {
      console.error(error)
      toast.error("Network or Server Error")
    }

    setLoading(false)
  }

  return (
    <Dialog fullWidth maxWidth='md' scroll='body' open={open} onClose={handleClose}>
      <DialogTitle variant='h4' className='flex flex-col gap-2 text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        {title ? 'Edit Role' : 'Add Role'}
        <Typography component='span' className='flex flex-col text-center'>
          Set Role Permissions
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent className='overflow-visible pbs-0 sm:pbe-6 sm:pli-16'>
          <IconButton onClick={handleClose} className='absolute block-start-4 inline-end-4'>
            <i className='ri-close-line text-textSecondary' />
          </IconButton>

          <Controller
            name='name'
            control={control}
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                label='Name'
                placeholder='ADMIN'
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Controller
            name='view'
            control={control}
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <Autocomplete
                className='mt-6'
                disableClearable
                fullWidth
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'User', value: 'user' }
                ]}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option?.value === value?.value}
                onChange={(_, newValue) => field.onChange(newValue?.value)}
                value={
                  [
                    { label: 'All', value: 'all' },
                    { label: 'User', value: 'user' }
                  ].find(option => option.value === field.value) ?? { label: 'User', value: 'user' }
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    label="View"
                  />
                )}
              />
            )}
          />

          <div className='flex flex-col overflow-x-auto mt-3'>
            <table className={tableStyles.table}>
              <tbody className='border-be'>
                <tr>
                  <th className='pis-0'>
                    <Typography variant='h5' className='text-left'>
                      Role Permissions
                    </Typography>
                  </th>
                  <th className='text-end! pie-0'>
                    <FormControlLabel
                      className='mie-0 capitalize'
                      control={
                        <Checkbox
                          onChange={handleSelectAllCheckbox}
                          indeterminate={isIndeterminateCheckbox}
                          checked={flatMenuData.length > 0 && selectedCheckbox.length === flatMenuData.length * 4}
                        />
                      }
                      label='Select All'
                    />
                  </th>
                </tr>
                {flatMenuData.map((item, index) => {
                  // Key menggunakan item.href agar unik dan konsisten
                  const rowKey = item.href

                  return (
                    <tr key={`${rowKey}-${index}`}>
                      <td className='pis-0'>
                        <Typography
                          className='font-medium whitespace-nowrap grow min-inline-56.25'
                          color='text.primary'
                        >
                          {/* Tetap tampilkan label untuk user */}
                          {item.label}
                        </Typography>
                      </td>
                      <td className='text-end! pie-0'>
                        <FormGroup className='flex-row justify-end flex-nowrap gap-6'>
                          {(['read', 'write', 'create', 'delete'] as const).map((action) => {
                            // ID Unik kombinasi href + action
                            const uniqueId = `${rowKey}${ACTION_SEPARATOR}${action}`

                            return (
                              <FormControlLabel
                                key={action}
                                className='mie-0'
                                control={
                                  <Checkbox

                                    // id untuk DOM attribute bisa dibersihkan sedikit jika perlu
                                    id={uniqueId}
                                    onChange={() => togglePermission(uniqueId)}
                                    checked={selectedCheckbox.includes(uniqueId)}
                                  />
                                }
                                label={action.charAt(0).toUpperCase() + action.slice(1)}
                              />
                            )
                          })}
                        </FormGroup>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </DialogContent>
        <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
          <Button disabled={loading} variant='contained' type='submit' className='gap-2'>
            {loading && <CircularProgress size={20} color='inherit' />}
            Submit
          </Button>
          <Button variant='outlined' type='reset' color='secondary' onClick={handleClose}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default RoleDialogEdit
