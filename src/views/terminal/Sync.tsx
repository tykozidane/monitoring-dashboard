'use client'

import { useEffect, useState, useMemo, Fragment } from 'react'

import type {
  ExpandedState
} from '@tanstack/react-table';
import {
  createColumnHelper, flexRender, getCoreRowModel, useReactTable,
  getFilteredRowModel, getSortedRowModel, getPaginationRowModel,
  getExpandedRowModel
} from '@tanstack/react-table'
import {
  Typography, TablePagination,
  Grow, LinearProgress, Chip, IconButton, Tooltip
} from '@mui/material'
import classnames from 'classnames'
import axios from 'axios'
import { toast } from 'react-toastify'

import tableStyles from '@core/styles/table.module.css'
import { DebouncedInput, fuzzyFilter } from '@/utils/helper'
import SyncDetailView from './SyncDetailView'

const BASE_URL = process.env.API_MONITORING_URL;
const API_URL = `${BASE_URL}terminal/get-sync-terminal-status`;
const API_AUTH = 'Basic aGlzbnV0ZWNoOm51dGVjaDEyMw==';

const columnHelper = createColumnHelper<SyncDataProps>()

interface SyncProps {
  onUpdateCount: (count: number) => void
}

const Sync = ({ onUpdateCount }: SyncProps) => {
  const [data, setData] = useState<SyncDataProps[]>([])
  const [loading, setLoading] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')
  const [expanded, setExpanded] = useState<ExpandedState>({})

  // --- 3. Fungsi Fetch API ---
  const fetchSyncData = async () => {
    setLoading(true)

    try {
      const response = await axios({
        method: 'GET',
        url: API_URL,
        headers: {
          'Authorization': API_AUTH,
          'Content-Type': 'application/json'
        },
        data: {
          c_project: "KCI"
        }
      })

      const apiResult = response.data?.data || []

      const mappedData: SyncDataProps[] = apiResult.map((item: any) => ({
        sync_id: item.i_id,
        item_serial_code: item.c_terminal_sn || '-',
        model_name: item.n_terminal_name || 'Unknown Device',
        station_code: item.c_station || 'N/A',
        station_name: item.n_station_name || item.c_station || 'Unknown Station',
        d_sync: item.d_created_at || new Date().toISOString(),
        match_status: 'NOT_MATCH',
        signature_status: null,
        ...item
      }))

      setData(mappedData)
      onUpdateCount(mappedData.length)

    } catch (error) {
      console.error("Failed to fetch sync data:", error)
      toast.error("Gagal mengambil data terminal.")
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSyncData()
  }, [])

  // --- 4. Definisi Kolom ---
  const columns = useMemo(() => [
    columnHelper.accessor('item_serial_code', {
      header: 'Serial / Model',
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <div className='cursor-pointer p-1 rounded-full hover:bg-action-hover' onClick={() => row.toggleExpanded()}>
            <i className={classnames('tabler-chevron-right text-xl transition-transform text-text-secondary', { 'rotate-90': row.getIsExpanded() })} />
          </div>
          <div className='flex flex-col'>
            <Typography color='text.primary' className='font-medium text-sm'>{row.original.item_serial_code}</Typography>
            <Typography variant='caption' color='text.secondary'>{row.original.model_name}</Typography>
          </div>
        </div>
      )
    }),
    columnHelper.accessor('station_name', {
      header: 'Station',
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <Typography color='text.primary' className='text-sm'>{row.original.station_name}</Typography>
          <Typography variant='caption' color='text.secondary'>{row.original.station_code}</Typography>
        </div>
      )
    }),
    columnHelper.accessor('d_sync', {
      header: 'Created / Sync',
      cell: ({ row }) => <Typography variant='body2' className='text-sm'>{new Date(row.original.d_sync).toLocaleString('id-ID')}</Typography>
    }),
    columnHelper.accessor('match_status', {
      header: 'Status',
      cell: ({ row }) => (
        <Chip
          label={row.original.match_status}
          color={row.original.match_status === 'MATCH' ? 'success' : 'warning'}
          size="small"
          variant="tonal"
          className="font-semibold text-xs"
        />
      )
    }),
  ], [])

  const table = useReactTable({
    data, columns, state: { globalFilter, expanded }, filterFns: { fuzzy: fuzzyFilter },
    onExpandedChange: setExpanded, getRowCanExpand: () => true, getExpandedRowModel: getExpandedRowModel(),
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    onGlobalFilterChange: setGlobalFilter,
  })

  return (
    <>
      <div className='flex justify-between gap-4 p-5 flex-col items-start sm:flex-row sm:items-center'>
        <div className='text-left h3 flex items-center gap-4'>
          <Tooltip title="Refresh Data">
            <IconButton
              color="primary"
              onClick={fetchSyncData}
              disabled={loading}
              className='border border-primary-main/20 hover:bg-primary-main/10 p-2'
            >
              <i className={classnames("tabler-refresh text-xl", { "animate-spin": loading })}></i>
            </IconButton>
          </Tooltip>
          {loading && <Typography variant="caption" color="text.secondary">Fetching API...</Typography>}
        </div>
        <DebouncedInput value={globalFilter ?? ''} onChange={v => setGlobalFilter(String(v))} placeholder='Search Terminal...' className='is-full sm:is-auto' />
      </div>

      <div className='overflow-x-auto border-t'>
        <table className={tableStyles.table}>
          <thead>{table.getHeaderGroups().map(hg => <tr key={hg.id}>{hg.headers.map(h => <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>)}</thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="text-center py-4"><LinearProgress className='w-full py-4' /></td></tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className='text-center py-8 text-text-disabled'>No data available form API</td></tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => row.toggleExpanded()}
                    className={classnames('cursor-pointer hover:bg-action-hover hover:bg-gray-500/10 transition-colors', { 'bg-action-selected': row.getIsExpanded() })}
                  >
                    {row.getVisibleCells().map(cell => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                  </tr>

                  {/* EXPANDED ROW - TRANSPARAN */}
                  {row.getIsExpanded() && (
                    <tr>
                      <td colSpan={columns.length} className='p-0 border-b relative'>
                        {/* Menghapus background color dan border samping */}
                        <div className="w-full">
                          <Grow in={true}>
                            <div><SyncDetailView rowData={row.original} onClose={() => row.toggleExpanded(false)} /></div>
                          </Grow>
                        </div>
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
        className='border-t'
        count={table.getFilteredRowModel().rows.length}
        rowsPerPage={table.getState().pagination.pageSize}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, p) => table.setPageIndex(p)}
        onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
      />
    </>
  )
}

export default Sync
