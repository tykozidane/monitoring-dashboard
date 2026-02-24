'use client'

import { useEffect, useState, useMemo, Fragment } from 'react'

import dynamic from 'next/dynamic'

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
  Grow, LinearProgress, Box, Autocomplete, Chip, Table, TableBody,
  TableCell, TableHead, TableRow
} from '@mui/material'

import tableStyles from '@core/styles/table.module.css'
import { DebouncedInput, fuzzyFilter } from '@/utils/helper'

const AddTerminalModal = dynamic(
  () => import('./AddTerminalModal').then((mod) => mod.AddTerminalModal),
  {
    ssr: false,
  }
);

// Pastikan tipe data ini sesuai dengan global types Anda, atau biarkan jika sudah ada di file terpisah
interface DeviceDetail {
  c_device: string;
  c_serial_number: string;
  c_device_type: string;
  c_direction: number;
  n_device_name: string;
  c_project: string;
  c_terminal_sn: string;
  b_active: boolean;
  sub_item_type: string;
  sub_item_code: string;
  sub_item_serial_code: string;
  n_device_type: string;
}

const columnHelper = createColumnHelper<DataWithAction>()

const BASE_URL = process.env.API_MONITORING_URL;
const API_AUTH = process.env.API_AUTH;

const ActionButton = ({ terminal }: { terminal: DataWithAction }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
      className="action-btn"
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)


  const initialFormState = {
    c_terminal_01: "",
    c_terminal_02: "",
    c_terminal_type: "CVIM",
    c_project: "KCI",
    c_station: "",
    n_terminal_name: "",
    n_lat: "",
    n_lng: ""
  }

  const [formData, setFormData] = useState(initialFormState)

  useEffect(() => {
    let isMounted = true;

    setLoadingStation(true)
    fetchStationData(isMounted)

    return () => { isMounted = false };
  }, [])

  const fetchStationData = (isMounted: boolean) => {
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
  }

  const fetchTerminalData = () => {
    if (!stationActive) return;

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
          setData(res.data.data?.code ? [] : res.data.data ?? [])
        })
        .catch(err => {
          console.error(err);
          toast.error("Gagal load terminal")
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }

  useEffect(() => {
    let isMounted = true;

    if (isMounted) fetchTerminalData();

    return () => { isMounted = false };
  }, [stationActive, stationData])

  // FUNGSI FETCH DETAIL DEVICE YANG SUDAH DIREVISI
  const fetchTerminalDevices = async (row: DataWithAction) => {
    const sn = row.c_terminal_sn;

    if (expandedData[sn]) return; // Cegah hit API berkali-kali jika data sudah ada

    setLoadingExpanded(prev => ({ ...prev, [sn]: true }));

    try {
      // Perhatikan penggunaan params untuk method GET
      const response = await axios.get(`${BASE_URL}/device/get-device-by-terminal`, {
        params: {
          c_terminal_sn: sn,
          c_project: row.c_project ?? 'KCI'
        },
        headers: {
          'Authorization': API_AUTH,
          'Content-Type': 'application/json'
        }
      })

      const responseData = response.data.data;
      const allDevices: DeviceDetail[] = responseData?.code ? [] : (Array.isArray(responseData) ? responseData : []);

      setExpandedData(prev => ({ ...prev, [sn]: allDevices }));
    } catch (error) {
      console.error(error);
      setExpandedData(prev => ({ ...prev, [sn]: [] }));
    } finally {
      setLoadingExpanded(prev => ({ ...prev, [sn]: false }));
    }
  }

  const columns = useMemo(() => [
    columnHelper.accessor('c_terminal_type', {
      header: 'Type',
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
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
      header: () => <div className="text-right w-full pe-4">Action</div>,
      cell: ({ row }) => (
        <div className="flex justify-end pe-4">
          <ActionButton terminal={row.original} />
        </div>
      )
    })
  ], [])

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

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={v => setGlobalFilter(String(v))}
            placeholder='Search Library...'
            className='is-full sm:is-auto'
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="whitespace-nowrap"
          >
            Add Terminal
          </Button>
        </div>
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
                    className={classnames(
                      `cursor-pointer transition-colors ${row.getValue('status') === 'DANGER' && 'bg-red-500/10'}`,
                      {
                        'bg-gray-50/10': row.getIsExpanded(),
                        'hover:bg-gray-50/10 [&:has(.action-btn:hover)]:bg-transparent!': !row.getIsExpanded()
                      }
                    )}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>

                  {/* BAGIAN EXPANDED ROW UNTUK TABLE DEVICE DETAIL */}
                  {row.getIsExpanded() && (
                    <tr key={row.id + '-det'}>
                      <td colSpan={columns.length} className='p-0 border-b-2'>
                        <Grow in={true}>
                          <Box sx={{ p: 3, borderLeft: '4px solid #1976d2' }}>
                            <Typography variant="subtitle2" gutterBottom className="font-semibold mb-3">
                              Device Details
                            </Typography>

                            {loadingExpanded[row.original.c_terminal_sn] ? (
                              <div className="flex items-center gap-3 py-2">
                                <CircularProgress size={20} />
                                <Typography variant="body2" color="text.secondary">Fetching devices...</Typography>
                              </div>
                            ) : expandedData[row.original.c_terminal_sn]?.length > 0 ? (
                              <Table size="small" aria-label="device-details-table" sx={{ borderRadius: 1, boxShadow: 1 }}>
                                <TableHead  >
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Device Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Serial Number</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Sub Item</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Status</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {expandedData[row.original.c_terminal_sn].map((device, idx) => (
                                    <TableRow key={`${device.c_serial_number}-${idx}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                      <TableCell component="th" scope="row">{device.n_device_name}</TableCell>
                                      <TableCell>{device.n_device_type}</TableCell>
                                      <TableCell sx={{ fontFamily: 'monospace' }}>{device.c_serial_number}</TableCell>
                                      <TableCell>{device.sub_item_type}</TableCell>
                                      <TableCell align="center">
                                        <Chip
                                          label={device.b_active ? "Active" : "Inactive"}
                                          color={device.b_active ? "success" : "default"}
                                          size="small"
                                          variant="outlined"
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <Typography variant="body2" color="text.secondary" className="py-2 italic">
                                No devices found for this terminal.
                              </Typography>
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

      <AddTerminalModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={() => { fetchStationData(true); fetchTerminalData(); }} />
    </>
  )
}

export default Library
