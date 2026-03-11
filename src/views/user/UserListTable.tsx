'use client'

// React Imports
import { useEffect, useState, useMemo, useCallback } from 'react'

import { toast } from 'react-toastify'
import { useForm, Controller } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { object, minLength, string, pipe } from 'valibot'

// MUI Imports
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { styled } from '@mui/material/styles'
import TablePagination from '@mui/material/TablePagination'
import Grid from '@mui/material/Grid'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import { CircularProgress, Grow, InputAdornment } from '@mui/material'

// Third-party Imports
import classnames from 'classnames'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel
} from '@tanstack/react-table'
import type {
  ColumnDef,
  PaginationState
} from '@tanstack/react-table'

// Type Imports
import type { ThemeColor } from '@core/types'

// Component Imports
import AddUserDrawer from './AddUserDrawer'
import OptionMenu from '@core/components/option-menu'
import CustomAvatar from '@core/components/mui/Avatar'

// Util Imports
import { getInitials } from '@/utils/getInitials'

// Style Imports
import tableStyles from '@core/styles/table.module.css'
import ApiSend from '@/components/ApiSend'
import Edit from './Edit'
import type { OptionType } from '@/@core/components/option-menu/types'
import type { RoleDefaultProps, UserDefaultProps } from '@/libs/prisma-selects'
import { DebouncedInput } from '@/utils/helperClient'
import { GetAvatar } from '@/utils/helpers'


type UserRoleType = {
  [key: string]: { icon: string; color: string }
}

type UserStatusType = {
  [key: string]: ThemeColor
}

// Styled Components
const Icon = styled('i')({})

// Vars
const userRoleObj: UserRoleType = {
  admin: { icon: 'ri-vip-crown-line', color: 'error' },
  author: { icon: 'ri-computer-line', color: 'warning' },
  editor: { icon: 'ri-edit-box-line', color: 'info' },
  maintainer: { icon: 'ri-pie-chart-2-line', color: 'success' },
  subscriber: { icon: 'ri-user-3-line', color: 'primary' }
}

const userStatusObj: UserStatusType = {
  active: 'success',
  pending: 'warning',
  inactive: 'secondary',
  suspended: 'error'
}

// Column Definitions
const columnHelper = createColumnHelper<UserDefaultProps>()

const schemaChangePass = object({
  password: pipe(
    string('This field is required'),
    minLength(1, 'This field is required'),
    minLength(8, 'Password must be at least 8 characters long')
  ),
})

const UserListTable = ({
  permission,
  roleData,
  updateDataRole
}: {
  permission: string[],
  roleData: RoleDefaultProps[],
  updateDataRole?: (datas: RoleDefaultProps[]) => void
}) => {
  // Modals & Drawers States
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [Open, setOpen] = useState<UserDefaultProps>() // Edit
  const [Open2, setOpen2] = useState<UserDefaultProps>() // Delete
  const [Open3, setOpen3] = useState<UserDefaultProps>() // Change Password

  // Data Table States (Server-side)
  const [data, setData] = useState<UserDefaultProps[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rowSelection, setRowSelection] = useState({})

  // Pagination & Search States
  const [globalFilter, setGlobalFilter] = useState('')

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0, // React Table berbasis index 0
    pageSize: 10,
  })

  // Close All Modals & Reset Form
  const handleClose = useCallback(() => {
    setOpen(undefined)
    setOpen2(undefined)
    setOpen3(undefined)
    reset()
  }, [])

  // ==========================================
  // SERVER-SIDE FETCHING LOGIC
  // ==========================================
  const fetchUsers = useCallback(async () => {
    setLoading(true)

    // API biasanya meminta format page mulai dari 1
    const pageToFetch = pagination.pageIndex + 1

    const res = await ApiSend({
      url: `/user?page=${pageToFetch}&limit=${pagination.pageSize}&search=${globalFilter}`,
      method: 'GET'
    })

    if (res?.valid && res.data) {
      // Menyesuaikan dengan response API (data: array, total: number)
      setData(res.data.data ?? [])
      setTotalRows(res.data.total ?? 0)

      // Update role list jika ada
      if (res.data.role && updateDataRole) {
        updateDataRole(res.data.role)
      }
    } else if (!res?.valid) {
      toast.error('Gagal mengambil data user')
    }

    setLoading(false)
  }, [pagination.pageIndex, pagination.pageSize, globalFilter, updateDataRole])

  // Hit API setiap kali filter atau pagination berubah
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Handler Pencarian: Reset ke halaman 1 saat mengetik
  const handleSearchChange = (value: string | number) => {
    setGlobalFilter(String(value))
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  // ==========================================
  // ACTION HANDLERS
  // ==========================================
  const handleDelete = async () => {
    setLoading(true)

    const res = await ApiSend({ url: `/user`, method: 'DELETE', data: { id: Open2?.id } });
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    if (res?.valid) {
      toast.success(res.message)
      await fetchUsers() // Reload data via API

      if (res.data?.role && updateDataRole) {
        updateDataRole(res.data.role)
      }

      await sleep(500)
      handleClose()
    } else if (res.status === 401) {
      toast.info(res.message)
    } else {
      toast.error(res.message)
      await sleep(500)
      handleClose()
    }

    await sleep(100)
    reset()
    setLoading(false)
  }

  const handleChangePassword = async () => {
    setLoading(true)

    const payload = { ...getValues(), changePassword: true, id: Open3?.id }
    const res = await ApiSend({ url: `/user`, method: 'PATCH', data: payload });

    if (res?.valid) {
      toast.success(res.message)
    } else if (res.status === 401) {
      toast.info(res.message)
    } else {
      toast.error(res.message)
    }

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    await sleep(500)
    handleClose()
    await sleep(100)
    setLoading(false)
  }

  // ==========================================
  // TABLE COLUMNS DEFINITION
  // ==========================================
  const columns = useMemo(() => {
    const baseColumns = [
      columnHelper.accessor('name', {
        header: 'User',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            {GetAvatar({ image: row.original.image, name: row.original.name ?? row.original.username })}
            <div className='flex flex-col'>
              <Typography color='text.primary' className='font-medium'>
                {row.original.name}
              </Typography>
              <Typography variant='body2'>{row.original.username}</Typography>
            </div>
          </div>
        )
      }),
      columnHelper.accessor('role', {
        header: 'Role',
        cell: ({ row }) => {
          const roleName = row.original.role?.name.toLocaleLowerCase() || 'subscriber'
          const roleConfig = userRoleObj[roleName] || userRoleObj['subscriber']

          return (
            <div className='flex items-center gap-2'>
              <Icon
                className={classnames('text-[22px]', roleConfig.icon)}
                sx={{ color: `var(--mui-palette-${roleConfig.color}-main)` }}
              />
              <Typography className='capitalize' color='text.primary'>
                {row.original.role?.name}
              </Typography>
            </div>
          )
        }
      }),
    ];

    // 3. Jika ada permission, return array baru dengan menggunakan Spread Operator
    if (permission?.includes('write') || permission?.includes('delete')) {
      return [
        ...baseColumns,

        // Gunakan .display() untuk kolom UI yang tidak terikat langsung ke satu field data
        columnHelper.display({
          id: 'action',
          header: 'Action',
          cell: ({ row }) => {
            const action: OptionType[] = [];

            if (permission?.includes('write')) {
              action.push({
                text: <a onClick={() => setOpen(row.original)} className='flex w-full cursor-pointer'><i className={'tabler-pencil mr-2'} /> Edit </a>,
              })
              action.push({
                text: <a onClick={() => setOpen3(row.original)} className='flex w-full cursor-pointer'><i className={'tabler-edit mr-2'} /> Change Password</a>,
              })
            }

            if (permission?.includes('delete')) {
              action.push({
                text: <a onClick={() => setOpen2(row.original)} className='flex w-full cursor-pointer text-red-600!'><i className={'tabler-trash mr-2'} /> Delete</a>,
              })
            }

            return (
              <div className='flex items-center gap-0.5'>
                <OptionMenu iconClassName='text-textSecondary' options={action} />
              </div>
            )
          },
          enableSorting: false
        })
      ];
    }

    // 4. Return base columns jika tidak ada permission
    return baseColumns;
  }, [permission]);

  // ==========================================
  // TABLE INITIALIZATION
  // ==========================================
  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      globalFilter,
      pagination
    },
    manualPagination: true,
    manualFiltering: true,
    rowCount: totalRows,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  // Change Pass Form Hook
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const {
    control,
    reset,
    handleSubmit,
    getValues,
    formState: { errors }
  } = useForm({
    resolver: valibotResolver(schemaChangePass),
  })

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <Grow in={true}>
      <Grid size={12}>
        <Card>
          {/* Header Action & Search */}
          <div className='flex justify-between gap-4 p-5 flex-col items-start sm:flex-row sm:items-center'>
            <div className='text-left h3'>
              <Typography variant='h4'></Typography>
            </div>
            <div className='flex items-center gap-x-4 max-sm:gap-y-4 is-full flex-col sm:is-auto sm:flex-row'>
              <DebouncedInput
                value={globalFilter ?? ''}
                onChange={handleSearchChange}
                placeholder='Search User'
                className='is-full sm:is-auto'
              />
              {/* {permission?.includes('create') && ( */}
              <Button variant='contained' onClick={() => setAddUserOpen(true)} className='is-full sm:is-auto'>
                Add User
              </Button>
              {/* )} */}
            </div>
          </div>

          {/* Table Area with Loading Overlay */}
          <div className='relative overflow-visible'>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 backdrop-blur-[2px]">
                <CircularProgress />
              </div>
            )}

            <table className={tableStyles.table}>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id}>
                        {header.isPlaceholder ? null : (
                          <div
                            className={classnames({
                              'flex items-center': header.column.getIsSorted(),
                              'cursor-pointer select-none': header.column.getCanSort()
                            })}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: <i className='ri-arrow-up-s-line text-xl' />,
                              desc: <i className='ri-arrow-down-s-line text-xl' />
                            }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              {table.getRowModel().rows.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={table.getVisibleFlatColumns().length} className='text-center py-8'>
                      {loading ? 'Please wait...' : 'No data available'}
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>

          {/* Server-Side Pagination */}
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component='div'
            className='border-bs'
            count={totalRows}
            rowsPerPage={table.getState().pagination.pageSize}
            page={table.getState().pagination.pageIndex}
            onPageChange={(_, page) => table.setPageIndex(page)}
            onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
          />
        </Card>

        {/* Modals & Drawers */}
        <AddUserDrawer
          open={addUserOpen}
          handleClose={() => setAddUserOpen(false)}
          roleData={roleData}
          updateData={fetchUsers}
        />

        <Edit
          Open={Open}
          handleClose={handleClose}
          roleData={roleData}
          updateData={fetchUsers}
        />

        {/* Change Password Dialog */}
        <Dialog fullWidth open={!!Open3} onClose={handleClose} maxWidth='md' scroll='body'>
          <DialogTitle variant='h4' className='flex gap-2 flex-col items-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
            <div className='max-sm:inline-[80%] max-sm:text-center'>Edit User Information</div>
            <Typography component='span' className='flex flex-col text-center'>
              Updating password user.
            </Typography>
          </DialogTitle>
          <form onSubmit={handleSubmit(handleChangePassword)} >
            <DialogContent className='overflow-visible pbs-0 sm:pbe-6 sm:pli-16'>
              <IconButton onClick={handleClose} className='absolute block-start-4 inline-end-4'>
                <i className='ri-close-line text-textSecondary' />
              </IconButton>
              <Grid container spacing={5}>
                <Grid size={12}>
                  <Controller
                    name='password'
                    control={control}
                    rules={{ required: true }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label='New Password'
                        placeholder='············'
                        type={isPasswordShown ? 'text' : 'password'}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position='end'>
                              <IconButton
                                size='small'
                                edge='end'
                                onClick={handleClickShowPassword}
                                onMouseDown={e => e.preventDefault()}
                              >
                                <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions className='justify-center pbs-0 sm:pbe-16 sm:pli-16'>
              <Button disabled={loading} variant='contained' type='submit'>
                {loading ? <CircularProgress size={20} color='inherit' /> : 'Submit'}
              </Button>
              <Button disabled={loading} variant='outlined' color='secondary' type='reset' onClick={handleClose}>
                Cancel
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog fullWidth open={!!Open2} onClose={handleClose} maxWidth='md' scroll='body'>
          <DialogTitle variant='h4' className='flex gap-2 flex-col sm:pbs-16 sm:pbe-6 sm:pli-16'>
            <div className='max-sm:inline-[80%] max-sm:text-center'>Delete Data ?</div>
            <Typography component='span' className='flex flex-col'>
              You will delete {Open2?.name} data!!
            </Typography>
          </DialogTitle>
          <DialogActions className='pbs-0 sm:pbe-16 sm:pli-16'>
            <Button disabled={loading} variant='contained' onClick={handleDelete} color="error" type='button' className='gap-2'>
              {loading && <CircularProgress size={20} color='inherit' />}
              Delete
            </Button>
            <Button disabled={loading} variant='outlined' color='secondary' type='reset' onClick={handleClose}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </Grid>
    </Grow>
  )
}

export default UserListTable
