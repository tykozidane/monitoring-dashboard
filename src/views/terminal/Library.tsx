'use client'

import { useEffect, useState, useMemo, Fragment } from 'react'

import axios from 'axios'
import { toast } from 'react-toastify'
import classnames from 'classnames'
import type { ExpandedState } from '@tanstack/react-table';
import {
  createColumnHelper, flexRender, getCoreRowModel, useReactTable,
  getFilteredRowModel, getSortedRowModel, getPaginationRowModel,
  getExpandedRowModel
} from '@tanstack/react-table'
import {
  Button, TextField, Typography, TablePagination, CircularProgress,
  Grow, LinearProgress, Box, Autocomplete
} from '@mui/material'

import tableStyles from '@core/styles/table.module.css'
import { DebouncedInput, fuzzyFilter } from '@/utils/helper'

const columnHelper = createColumnHelper<DataWithAction>()

const BASE_URL = process.env.API_MONITORING_URL;
const API_AUTH = process.env.API_AUTH;

// 1. BEST PRACTICE: Pisahkan komponen Action Button untuk mengisolasi state 'loading'
// Ini mencegah seluruh tabel re-render saat satu tombol di-klik
const ActionButton = ({ terminal }: { terminal: DataWithAction }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Mencegah baris tabel ikut terklik/expand
    setIsDownloading(true);

    try {
      const response = await axios.post(`${BASE_URL}/terminal/get-terminal-config`, {
        c_project: terminal.c_project,
        c_terminal_sn: terminal.c_terminal_sn
      }, {
        headers: {
          'Authorization': API_AUTH,
          'Content-Type': 'application/json'
        },
      });

      const jsonString = JSON.stringify(response?.data?.data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;
      a.download = `${terminal.c_terminal_type}-config-${terminal.c_terminal_sn}.json`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Gagal mengunduh config");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Button
      variant='outlined'
      size='small'
      color='primary'
      disabled={isDownloading}
      onClick={handleDownload}
      className="action-btn" // Class ini digunakan sebagai trigger di CSS :has() pada tag <tr>
    >
      {isDownloading ? <CircularProgress size={16} color="inherit" /> : 'Config'}
    </Button>
  )
}


const Library = () => {
  const [data, setData] = useState<DataWithAction[]>([])
  const [loading, setLoading] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const [stationActive, setStationActive] = useState<string>()
  const [stationData, setStationData] = useState<StationProps[]>([])
  const [loadingStation, setLoadingStation] = useState(false)

  const [expandedData, setExpandedData] = useState<Record<string, DeviceDetail[]>>({})
  const [loadingExpanded, setLoadingExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let isMounted = true; // Cleanup preventer

    setLoadingStation(true)

    axios.get(`${BASE_URL}/station/mini?c_project=KCI`, {
      headers: { 'Authorization': API_AUTH, 'Content-Type': 'application/json' },
    })
      .then(res => {
        if (isMounted) setStationData(res.data.data?.code ? [] : res.data.data ?? [])
      })
      .catch(err => {
        console.error(err);
        if (isMounted) toast.error("Gagal terhubung ke server API")
      })
      .finally(() => {
        if (isMounted) setLoadingStation(false)
      })

    return () => { isMounted = false };
  }, [])

  useEffect(() => {
    if (!stationActive) return;

    let isMounted = true;

    setLoading(true)
    const dataStation = stationData.find(s => s.c_station === stationActive)

    if (dataStation) {
      axios.post(`${BASE_URL}/output/terminal-by-station`, {
        c_station: dataStation.c_station,
        c_project: dataStation.n_project_name ?? 'KCI'
      }, {
        headers: { 'Authorization': API_AUTH, 'Content-Type': 'application/json' }
      })
        .then(res => {
          if (isMounted) setData(res.data.data?.code ? [] : res.data.data ?? [])
        })
        .catch(err => {
          console.error(err);
          if (isMounted) toast.error("Gagal load terminal")
        })
        .finally(() => {
          if (isMounted) setLoading(false)
        })
    }

    return () => { isMounted = false };
  }, [stationActive, stationData])

  const fetchTerminalDevices = async (row: DataWithAction) => {
    const sn = row.c_terminal_sn;

    if (expandedData[sn]) return;

    setLoadingExpanded(prev => ({ ...prev, [sn]: true }));

    try {
      const response = await axios.post(`${process.env.API_MONITORING_URL}/output/device-by-station`, {
        c_station: row.c_station,
        c_project: row.n_project_name ?? 'KCI'
      })

      const allDevices: DeviceDetail[] = response.data.data?.code ? [] : response.data.data ?? [];

      setExpandedData(prev => ({ ...prev, [sn]: allDevices.filter(d => d.c_terminal === sn) }));
    } catch (error) {
      console.error(error);
      setExpandedData(prev => ({ ...prev, [sn]: [] }));
    } finally {
      setLoadingExpanded(prev => ({ ...prev, [sn]: false }));
    }
  }

  // 2. Kolom sudah direfactor menjadi jauh lebih bersih dan tidak terikat dependency loading state
  const columns = useMemo(() => [
    columnHelper.accessor('c_terminal_type', {
      header: 'Type',
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          {/* Arrow indicator untuk expand */}
          <div className='w-6 flex justify-center'>
            <i className={classnames('tabler-chevron-right text-xl transition-transform text-text-secondary', { 'rotate-90': row.getIsExpanded() })} />
          </div>
          <div className='flex flex-col'>
            <Typography color='text.primary' className='font-medium'>{row.original.c_terminal_type}</Typography>
            <Typography variant='caption' color='text.secondary'>{row.original.c_terminal_sn}</Typography>
          </div>
        </div>
      )
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: ({ row }) => (
        <Typography
          color={row.original.status === 'DANGER' ? 'error.main' : 'text.primary'}
          className={row.original.status === 'DANGER' ? 'font-bold' : ''}
        >
          {row.original.status}
        </Typography>
      )
    }),
    columnHelper.display({
      id: 'actions',

      // 3. Action column ditaruh rata kanan (Paling Pinggir)
      header: () => <div className="text-right w-full pe-4">Action</div>,
      cell: ({ row }) => (
        <div className="flex justify-end pe-4">
          <ActionButton terminal={row.original} />
        </div>
      )
    })
  ], []) // Array dependency kosong karena tidak butuh lagi loadingConfigs

  const table = useReactTable({
    data, columns, state: { rowSelection, globalFilter, expanded },
    filterFns: { fuzzy: fuzzyFilter }, onExpandedChange: setExpanded, getRowCanExpand: () => true,
    getExpandedRowModel: getExpandedRowModel(), getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(), onGlobalFilterChange: setGlobalFilter, onRowSelectionChange: setRowSelection,
  })

  return (
    <>
      <div className='flex justify-between gap-4 p-5 flex-col items-start sm:flex-row sm:items-center'>
        <div className='text-left h3 flex flex-col sm:flex-row gap-4 w-1/2 max-sm:w-full'>
          <Autocomplete
            disablePortal
            disableClearable
            value={((stationActive ? stationData.find(s => s.c_station === stationActive) : stationData[0]) || null) as StationProps}
            options={stationData}
            onChange={(_, v) => v && setStationActive(v.c_station)}
            loading={loadingStation}
            renderInput={(params) => <TextField {...params} label="Station" />}
            getOptionLabel={(o) => o?.n_station ?? ''}
            className='min-w-60'
            size='small'
          />
        </div>
        <DebouncedInput value={globalFilter ?? ''} onChange={v => setGlobalFilter(String(v))} placeholder='Search Library...' className='is-full sm:is-auto' />
      </div>

      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="text-center py-4"><LinearProgress className='w-full py-4' /></td></tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className='text-center py-4'>No data available</td></tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => {
                      row.toggleExpanded();
                      if (!row.getIsExpanded()) fetchTerminalDevices(row.original);
                    }}

                    // 4. Mematikan Hover row saat tombol aksi disentuh menggunakan CSS selector `:has()`
                    className={classnames(
                      'cursor-pointer transition-colors',
                      {
                        'bg-gray-50/10': row.getIsExpanded(),

                        // hover normal, KECUALI jika child dengan class .action-btn sedang di-hover
                        'hover:bg-gray-50/10 [&:has(.action-btn:hover)]:bg-transparent!': !row.getIsExpanded()
                      }
                    )}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>

                  {row.getIsExpanded() && (
                    <tr key={row.id + '-det'}>
                      <td colSpan={columns.length} className='p-0 border-b-2'>
                        <Grow in={true}>
                          <Box sx={{ p: 2, bgcolor: 'background.paper', borderLeft: '4px solid #primary' }}>
                            {loadingExpanded[row.original.c_terminal_sn] ? (
                              <CircularProgress />
                            ) : (
                              <Typography variant="body2">Device details loaded here...</Typography>
                            )}
                          </Box>
                        </Grow>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component='div'
        className='border-bs'
        count={table.getFilteredRowModel().rows.length}
        rowsPerPage={table.getState().pagination.pageSize}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, p) => table.setPageIndex(p)}
        onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
      />
    </>
  )
}

export default Library
