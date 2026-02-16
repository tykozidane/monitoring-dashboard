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
  Button, Typography, TablePagination, CircularProgress,
  Grow, LinearProgress, Chip, IconButton, Tooltip
} from '@mui/material'
import classnames from 'classnames'

import tableStyles from '@core/styles/table.module.css'
import { DebouncedInput, fuzzyFilter } from '@/utils/helper'
import SyncDetailView from './SyncDetailView'

const DUMMY_SYNC_DATA: SyncDataProps[] = [
  // 1. Kasus MATCH (Juanda) - Signature Not Identic
  {
    "sync_id": "a646fb58-f857-4378-a2f7-faacdb29369a",
    "item_serial_code": "072-1293",
    "client_name": "KCI",
    "model_code": "0110501",
    "model_name": "Magnetic-Gate MPP 122",
    "station_code": "JUA",
    "station_name": "JUANDA",
    "d_sync": "2026-02-10T10:39:00.269Z",
    "b_mapping": false,
    "b_active": true,
    "terminal_id": "8bf3a7fe-7f8a-464a-93e8-ef11e3a82789",
    "c_terminal_sn": "072-1293",
    "c_project": "KCI",
    "c_station": "JUA",
    "c_terminal_type": "G10",
    "match_status": "MATCH",
    "signature_status": "SIGNATURE_NOT_IDENTIC"
  },

  // 2. Kasus NOT_MATCH (Juanda) - Barang Baru / Belum Terdaftar
  {
    "sync_id": "676428eb-f0e6-46f0-a7f5-86e81cf79ec6",
    "item_serial_code": "930-036",
    "client_name": "KCI",
    "model_code": "0110501",
    "model_name": "Magnetic-Gate MPP 122",
    "station_code": "JUA",
    "station_name": "JUANDA",
    "d_sync": "2026-02-10T07:31:56.803Z",
    "b_mapping": false,
    "b_active": true,
    "terminal_id": null,
    "c_terminal_sn": null,
    "c_project": null,
    "c_station": null,
    "c_terminal_type": null,
    "match_status": "NOT_MATCH",
    "signature_status": null
  },

  // 3. Kasus MATCH (Manggarai) - Signature Valid
  {
    "sync_id": "b1234567-c890-1234-d567-e89012345678",
    "item_serial_code": "072-1301",
    "client_name": "KCI",
    "model_code": "0110501",
    "model_name": "Magnetic-Gate MPP 122",
    "station_code": "MRI",
    "station_name": "MANGGARAI",
    "d_sync": "2026-02-11T08:15:00.000Z",
    "b_mapping": true,
    "b_active": true,
    "terminal_id": "term-mri-01",
    "c_terminal_sn": "072-1301",
    "c_project": "KCI",
    "c_station": "MRI",
    "c_terminal_type": "G10",
    "match_status": "MATCH",
    "signature_status": "SIGNATURE_VALID"
  },

  // 4. Kasus NOT_MATCH (Bogor) - Data Baru
  {
    "sync_id": "c2345678-d901-2345-e678-f90123456789",
    "item_serial_code": "930-045",
    "client_name": "KCI",
    "model_code": "0110502",
    "model_name": "Flap-Gate FPP 200",
    "station_code": "BOG",
    "station_name": "BOGOR",
    "d_sync": "2026-02-12T09:00:00.000Z",
    "b_mapping": false,
    "b_active": true,
    "terminal_id": null,
    "c_terminal_sn": null,
    "c_project": null,
    "c_station": null,
    "c_terminal_type": null,
    "match_status": "NOT_MATCH",
    "signature_status": null
  },

  // 5. Kasus MATCH (Tanah Abang) - Signature Not Identic
  {
    "sync_id": "d3456789-e012-3456-f789-a01234567890",
    "item_serial_code": "072-1350",
    "client_name": "KCI",
    "model_code": "0110501",
    "model_name": "Magnetic-Gate MPP 122",
    "station_code": "TNH",
    "station_name": "TANAH ABANG",
    "d_sync": "2026-02-12T11:45:20.100Z",
    "b_mapping": true,
    "b_active": true,
    "terminal_id": "term-tnh-05",
    "c_terminal_sn": "072-1350",
    "c_project": "KCI",
    "c_station": "TNH",
    "c_terminal_type": "G10",
    "match_status": "MATCH",
    "signature_status": "SIGNATURE_NOT_IDENTIC"
  },

  // 6. Kasus NOT_MATCH (Sudirman)
  {
    "sync_id": "e4567890-f123-4567-a890-b12345678901",
    "item_serial_code": "930-050",
    "client_name": "KCI",
    "model_code": "0110501",
    "model_name": "Magnetic-Gate MPP 122",
    "station_code": "SUD",
    "station_name": "SUDIRMAN",
    "d_sync": "2026-02-13T14:20:10.500Z",
    "b_mapping": false,
    "b_active": true,
    "terminal_id": null,
    "c_terminal_sn": null,
    "c_project": null,
    "c_station": null,
    "c_terminal_type": null,
    "match_status": "NOT_MATCH",
    "signature_status": null
  },

  // 7. Kasus MATCH (Gondangdia) - Signature Valid
  {
    "sync_id": "f5678901-a234-5678-b901-c23456789012",
    "item_serial_code": "072-1400",
    "client_name": "KCI",
    "model_code": "0110501",
    "model_name": "Magnetic-Gate MPP 122",
    "station_code": "GDD",
    "station_name": "GONDANGDIA",
    "d_sync": "2026-02-13T16:00:00.000Z",
    "b_mapping": true,
    "b_active": true,
    "terminal_id": "term-gdd-02",
    "c_terminal_sn": "072-1400",
    "c_project": "KCI",
    "c_station": "GDD",
    "c_terminal_type": "G10",
    "match_status": "MATCH",
    "signature_status": "SIGNATURE_VALID"
  },

  // 8. Kasus NOT_MATCH (Jakarta Kota)
  {
    "sync_id": "a1234567-b345-6789-c012-d34567890123",
    "item_serial_code": "930-088",
    "client_name": "KCI",
    "model_code": "0110503",
    "model_name": "Vending Machine VM-100",
    "station_code": "JAKK",
    "station_name": "JAKARTA KOTA",
    "d_sync": "2026-02-14T10:10:10.000Z",
    "b_mapping": false,
    "b_active": true,
    "terminal_id": null,
    "c_terminal_sn": null,
    "c_project": null,
    "c_station": null,
    "c_terminal_type": null,
    "match_status": "NOT_MATCH",
    "signature_status": null
  },

  // 9. Kasus MATCH (Bekasi) - Warning Status
  {
    "sync_id": "b9876543-c210-9876-d543-e21098765432",
    "item_serial_code": "072-1500",
    "client_name": "KCI",
    "model_code": "0110501",
    "model_name": "Magnetic-Gate MPP 122",
    "station_code": "BKS",
    "station_name": "BEKASI",
    "d_sync": "2026-02-14T13:30:00.000Z",
    "b_mapping": true,
    "b_active": true,
    "terminal_id": "term-bks-10",
    "c_terminal_sn": "072-1500",
    "c_project": "KCI",
    "c_station": "BKS",
    "c_terminal_type": "G10",
    "match_status": "MATCH",
    "signature_status": "SIGNATURE_INVALID"
  },

  // 10. Kasus NOT_MATCH (Depok)
  {
    "sync_id": "c1122334-d445-5667-e778-f88990011223",
    "item_serial_code": "930-099",
    "client_name": "KCI",
    "model_code": "0110501",
    "model_name": "Magnetic-Gate MPP 122",
    "station_code": "DEP",
    "station_name": "DEPOK",
    "d_sync": "2026-02-15T09:45:00.000Z",
    "b_mapping": false,
    "b_active": true,
    "terminal_id": null,
    "c_terminal_sn": null,
    "c_project": null,
    "c_station": null,
    "c_terminal_type": null,
    "match_status": "NOT_MATCH",
    "signature_status": null
  }
]

const columnHelper = createColumnHelper<SyncDataProps>()

interface SyncProps {
  onUpdateCount: (count: number) => void
}

const Sync = ({ onUpdateCount }: SyncProps) => {
  const [data, setData] = useState<SyncDataProps[]>([])
  const [loading, setLoading] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const fetchSyncData = () => {
    setLoading(true)
    setTimeout(() => {
      setData(DUMMY_SYNC_DATA)
      const pendingSync = DUMMY_SYNC_DATA.filter(item => item.match_status === 'NOT_MATCH').length

      onUpdateCount(pendingSync)
      setLoading(false)
    }, 1500)
  }

  useEffect(() => {
    fetchSyncData()
  }, [])

  const columns = useMemo(() => [
    columnHelper.accessor('item_serial_code', {
      header: 'Serial / Model',
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <i className={classnames('ri-arrow-right-s-line text-2xl transition-transform', { 'rotate-90': row.getIsExpanded() })} />
          <div className='flex flex-col'><Typography color='text.primary' className='font-medium'>{row.original.item_serial_code}</Typography><Typography variant='caption' color='text.secondary'>{row.original.model_name}</Typography></div>
        </div>
      )
    }),
    columnHelper.accessor('station_name', { header: 'Station', cell: ({ row }) => <div className='flex flex-col'><Typography color='text.primary'>{row.original.station_name}</Typography><Typography variant='caption' color='text.secondary'>{row.original.station_code}</Typography></div> }),
    columnHelper.accessor('d_sync', { header: 'Sync Date', cell: ({ row }) => <Typography variant='body2'>{new Date(row.original.d_sync).toLocaleString('id-ID')}</Typography> }),
    columnHelper.accessor('match_status', { header: 'Match Status', cell: ({ row }) => <Chip label={row.original.match_status} color={row.original.match_status === 'MATCH' ? 'success' : 'error'} size="small" variant="tonal" className="font-semibold" /> }),
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
          <Tooltip title="Sync Now"><IconButton color="primary" onClick={fetchSyncData} disabled={loading} className='border border-primary-main/20 hover:bg-primary-main/10 p-2'><i className={classnames("tabler-refresh text-2xl", { "animate-spin": loading })}></i></IconButton></Tooltip>
          {loading && <Typography variant="caption" color="text.secondary">Syncing...</Typography>}
        </div>
        <DebouncedInput value={globalFilter ?? ''} onChange={v => setGlobalFilter(String(v))} placeholder='Search Sync...' className='is-full sm:is-auto' />
      </div>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>{table.getHeaderGroups().map(hg => <tr key={hg.id}>{hg.headers.map(h => <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>)}</thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="text-center py-4"><LinearProgress className='p-4' /></td></tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className='text-center py-4'>No sync data</td></tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <Fragment key={row.id}>
                  <tr onClick={() => row.toggleExpanded()} className={classnames('cursor-pointer hover:bg-gray-50/10', { 'bg-gray-50/10': row.getIsExpanded() })}>
                    {row.getVisibleCells().map(cell => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                  </tr>
                  {row.getIsExpanded() && (
                    <tr>
                      <td colSpan={columns.length} className='p-0 border-b-2'>
                        <Grow in={true}>
                          <div><SyncDetailView rowData={row.original} onClose={() => row.toggleExpanded(false)} /></div>
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
      <TablePagination rowsPerPageOptions={[10, 25, 50]} component='div' className='border-bs' count={table.getFilteredRowModel().rows.length} rowsPerPage={table.getState().pagination.pageSize} page={table.getState().pagination.pageIndex} onPageChange={(_, p) => table.setPageIndex(p)} onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))} />
    </>
  )
}

export default Sync
