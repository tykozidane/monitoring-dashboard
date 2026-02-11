/* eslint-disable react-hooks/exhaustive-deps */
'use client'

// React Imports
import { useEffect, useState, useMemo } from 'react'

import { toast } from 'react-toastify'

import { useForm, Controller } from 'react-hook-form'


import { valibotResolver } from '@hookform/resolvers/valibot'
import { object, minLength, string, pipe } from 'valibot'

// MUI Imports
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import TablePagination from '@mui/material/TablePagination'
import type { TextFieldProps } from '@mui/material/TextField'
import Grid from '@mui/material/Grid'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogActions from '@mui/material/DialogActions'
import { Autocomplete, CircularProgress, Grow, InputAdornment, LinearProgress } from '@mui/material'

// Third-party Imports
import classnames from 'classnames'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'

// Component Imports
import axios, { isAxiosError } from 'axios'

import OptionMenu from '@core/components/option-menu'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

type DataWithAction = TerminalMonitoringProps & {
  action?: string
}


const fuzzyFilter: FilterFn<DataWithAction> = (row, columnId, value, addMeta) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value)

  // Store the itemRank info
  addMeta({
    itemRank
  })

  // Return if the item should be filtered in/out
  return itemRank.passed
}

const DebouncedInput = ({
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

  return <TextField {...props} value={value} onChange={e => setValue(e.target.value)} size='small' />
}


// Column Definitions
const columnHelper = createColumnHelper<DataWithAction>()

const ListTable = ({ subject }: {
  subject: string,
}) => {
  // States
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [loading, setLoading] = useState(false)

  const [data, setData] = useState([] as DataWithAction[]);
  const [dataFilter, setDataFilter] = useState<DataWithAction[]>([]);
  const [stationActive, setStationActive] = useState<string>();
  const [stationActiveData, setStationActiveData] = useState<StationProps[]>([])
  const [loadingStation, setloadingStation] = useState(false)

  useEffect(() => {
    setloadingStation(true)
    fetchDataStation().finally(() => setloadingStation(false));
  }, []);

  useEffect(() => {
    if (stationActive) {
      setLoading(true)
      const dataStation = stationActiveData.find(s => s.c_station === stationActive);

      fetchTerminal(dataStation).then((val) => {
        setData(val);
        setDataFilter(val);
        setLoading(false)
      }).finally(() => setLoading(false))
    }
  }, [stationActive])


  const fetchDataStation = async () => {
    try {
      const response = await axios.post('http://192.168.62.90:4003/api/v1/output/all-station');

      response.data.data.code ?? setStationActiveData(response.data.data ?? []);
    } catch (error) {
      if (isAxiosError(error)) {
        console.error(error);
      } else {
        console.error('Unexpected Error:', error);
      }

      toast.error("Gagal terhubung ke server API");
    }
  };

  const fetchTerminal = async (item?: StationProps) => {
    if (!item) return

    try {
      const response = await axios.post('http://192.168.62.90:4003/api/v1/output/terminal-by-station', {
        c_station: item.c_station,
        c_project: item.n_project_name ?? 'KCI'
      });

      return response.data.data.code ? [] : response.data.data ?? [];
    } catch (error) {
      if (isAxiosError(error)) {
        console.error(error);
      } else {
        console.error('Unexpected Error:', error);
      }

      toast.error("Gagal terhubung ke server API");
    }
  }


  const columns = useMemo<ColumnDef<DataWithAction>[]>(
    () => {
      const HeaderTable: any = [
        columnHelper.accessor('c_terminal_type', {
          header: 'Type',
          cell: ({ row }) => (
            <div className='flex items-center gap-3'>
              <div className='flex flex-col'>
                <Typography color='text.primary' className='font-medium'>
                  {row.original.c_terminal_type}
                </Typography>
              </div>
            </div>
          )
        }),
        columnHelper.accessor('status', {
          header: 'Status',
          cell: ({ row }) => <Typography>{row.original.status}</Typography>
        })
      ]

      return HeaderTable;

    },
    []
  )

  const table = useReactTable<DataWithAction>({
    data: dataFilter,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      rowSelection,
      globalFilter
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    },
    enableRowSelection: true, //enable row selection for all rows
    // enableRowSelection: row => row.original.age > 18, // or enable row selection conditionally per row
    globalFilterFn: fuzzyFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues()
  })

  return (
    <Grow in={true}>
      <Grid size={12}>
        <Card>
          <div className='flex justify-between gap-4 p-5 flex-col items-start sm:flex-row sm:items-center'>
            <div className='text-left h3 flex  flex-col sm:flex-row gap-4 w-1/2   max-sm:w-full'>
              <Autocomplete
                disablePortal
                disableClearable
                value={
                  ((stationActive
                    ? stationActiveData.find(s => s.c_station === stationActive)
                    : stationActiveData[0]) || null) as StationProps // Paksa anggap sebagai StationProps
                } options={stationActiveData}
                onChange={(_, newValue) => {
                  // Tambahkan pengecekan newValue agar tidak error saat null
                  if (newValue) {
                    setStationActive(newValue.c_station);
                    setDataFilter(data?.filter(e => e.c_station === newValue.c_station));
                  }
                }}
                loading={loadingStation}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Station"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                getOptionLabel={(option) => option?.n_station ?? ''}
                className='min-w-60'
                size='small'
              />
            </div>
            <div className='flex items-center gap-x-4 max-sm:gap-y-4 is-full flex-col sm:is-auto sm:flex-row'>
              <DebouncedInput
                value={globalFilter ?? ''}
                onChange={value => setGlobalFilter(String(value))}
                placeholder='Search...'
                className='is-full sm:is-auto'
              />
            </div>
          </div>
          <div className='overflow-x-auto'>
            <table className={tableStyles.table}>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className={`${header.id === 'action' && 'w-10'}`}>
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
              {loading || loadingStation ?
                <tbody>
                  <tr>
                    <td colSpan={table.getVisibleFlatColumns().length} className="text-center py-4">
                      <LinearProgress color='secondary' className='h-10' />
                    </td>
                  </tr>
                </tbody>
                : table.getFilteredRowModel().rows.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                        No data available
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {table
                      .getRowModel()
                      .rows.slice(0, table.getState().pagination.pageSize)
                      .map(row => {
                        return (
                          <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                            {row.getVisibleCells().map(cell => (
                              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                            ))}
                          </tr>
                        )
                      })}
                  </tbody>
                )}
            </table>
          </div>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component='div'
            className='border-bs'
            count={table.getFilteredRowModel().rows.length}
            rowsPerPage={table.getState().pagination.pageSize}
            page={table.getState().pagination.pageIndex}
            onPageChange={(_, page) => {
              table.setPageIndex(page)
            }}
            onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
          />
        </Card>
      </Grid>
    </Grow>
  )
}

export default ListTable
