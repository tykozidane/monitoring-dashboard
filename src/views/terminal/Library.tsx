'use client'

import { useEffect, useState, useMemo, Fragment } from 'react'

import dynamic from 'next/dynamic'

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
  TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions
} from '@mui/material'

import { getSession } from 'next-auth/react'

import tableStyles from '@core/styles/table.module.css'
import { DebouncedInput, fuzzyFilter } from '@/utils/helper'
import { ApiAxios } from '@/libs/ApiAxios'

// Interface Definitions
interface ProjectProps {
  c_project: string;
  n_project: string;
}

interface StationProps {
  c_project: string;
  c_station: string;
  n_station: string;
  n_project_name?: string;
}

interface DataWithAction {
  c_project: string;
  c_station: string;
  n_station: string;
  c_terminal_sn: string;
  c_terminal_type: string;
  c_terminal_01?: string;
  c_terminal_02?: string;
  status?: string;
  n_terminal_name?: string;
}

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

const AddTerminalModal = dynamic(
  () => import('./AddTerminalModal').then((mod) => mod.AddTerminalModal),
  {
    ssr: false,
  }
);

const columnHelper = createColumnHelper<DataWithAction>()

const BASE_URL = process.env.API_MONITORING_URL;
const API_AUTH = process.env.NEXT_PUBLIC_API_AUTH_JWT;

const ActionButton = ({ terminal, onSuccess }: { terminal: DataWithAction, onSuccess: () => void }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);

    try {
      const response = await ApiAxios.post(`${BASE_URL}/terminal/get-terminal-config`, {
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
      toast.error("Failed to download config");
    } finally {
      setIsDownloading(false);
    }
  }

  const handleRelease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsReleasing(true);

    try {
      const session = await getSession();

      await ApiAxios.post(`${BASE_URL}/terminal/release-terminal`, {
        c_project: terminal.c_project,
        c_terminal_sn: terminal.c_terminal_sn
      }, {
        headers: {
          'Authorization': `Bearer ${session?.user?.accessToken}`,
          'Content-Type': 'application/json'
        },
      });

      toast.success(`Terminal ${terminal.c_terminal_sn} released successfully.`);
      setIsConfirmOpen(false);
      onSuccess(); // Trigger refresh table
    } catch (error) {
      console.error(error);
      toast.error("Failed to release terminal.");
    } finally {
      setIsReleasing(false);
    }
  }

  return (
    <div className="flex gap-2 justify-end">
      <Button
        variant='outlined'
        size='small'
        color='primary'
        disabled={isDownloading || isReleasing}
        onClick={handleDownload}
        className="action-btn"
      >
        {isDownloading ? <CircularProgress size={16} color="inherit" /> : 'Config'}
      </Button>

      <Button
        variant='outlined'
        size='small'
        color='error'
        disabled={isReleasing || isDownloading}
        onClick={(e) => { e.stopPropagation(); setIsConfirmOpen(true); }}
        className="action-btn"
      >
        {isReleasing ? <CircularProgress size={16} color="inherit" /> : 'Release'}
      </Button>

      {/* Confirmation Modal for S/N Release */}
      <Dialog
        open={isConfirmOpen}
        onClose={(e: React.MouseEvent) => { e.stopPropagation(); setIsConfirmOpen(false); }}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Confirm Terminal Release</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to release the terminal with S/N <strong>{terminal.c_terminal_sn}</strong>?
            This action cannot be undone and will permanently remove the S/N.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={(e) => { e.stopPropagation(); setIsConfirmOpen(false); }}
            color="inherit"
            disabled={isReleasing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRelease}
            color="error"
            variant="contained"
            disabled={isReleasing}
            autoFocus
          >
            {isReleasing ? <CircularProgress size={20} color="inherit" /> : 'Yes, Release'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

const Library = (props: { permission: string[] }) => {
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

  const [projectsActive, setprojectsActive] = useState<string>()
  const [projects, setProjects] = useState<ProjectProps[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchProjects(isMounted);

    return () => { isMounted = false };
  }, [])

  const fetchProjects = async (isMounted: boolean) => {
    if (isMounted) setLoadingProjects(true);
    const session = await getSession();

    try {
      const response = await ApiAxios.get(`${BASE_URL}/project/get-all-project`, {
        headers: {
          'Authorization': `Bearer ${session?.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (isMounted) {
        const projectData = response.data?.data || [];

        setProjects(projectData);

        if (projectData.length > 0 && !projectsActive) {
          setprojectsActive(projectData[0].c_project);
        }
      }
    } catch (error) {
      console.error("Error fetching projects", error);
      if (isMounted) toast.error("Failed to load project data");
    } finally {
      if (isMounted) setLoadingProjects(false);
    }
  };

  const fetchStationData = async (isMounted: boolean) => {
    if (isMounted) setLoadingStation(true);

    const currentProject = projectsActive ?? projects[0]?.c_project;

    if (!currentProject) {
      if (isMounted) setLoadingStation(false);

      return;
    }

    const session = await getSession();

    ApiAxios.get(`${BASE_URL}/station/mini?c_project=${currentProject}`, {
      headers: { 'Authorization': `Bearer ${session?.user.accessToken}`, 'Content-Type': 'application/json' },
    })
      .then(res => {
        if (!isMounted) return;

        const newStation = res.data.data ?? [];
        const isErrorOrEmpty = res.data.data?.code;

        if (isErrorOrEmpty) {
          setStationData([]);
        } else {
          const formattedStations = [{
            "c_project": "ALL",
            "c_station": "ALL",
            "n_station": "ALL"
          }, ...newStation];

          setStationData(formattedStations);
          setStationActive("ALL");
        }
      })
      .catch(err => {
        console.error(err);

        if (isMounted) {
          toast.error("Failed to connect to API server");
          setStationData([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingStation(false)
      })
  }

  const fetchTerminalData = async () => {
    if (!stationActive) return;

    setLoading(true)
    const dataStation = stationData.find(s => s.c_station === stationActive)

    const projectName = dataStation?.n_project_name ??
      projects.find(p => p.c_project === projectsActive)?.n_project ??
      'KCI';

    const payload = {
      c_station: stationActive,
      c_project: projectName
    };

    const session = await getSession();

    ApiAxios.post(`${BASE_URL}/output/terminal-by-station`, payload, {
      headers: { 'Authorization': `Bearer ${session?.user.accessToken}`, 'Content-Type': 'application/json' }
    })
      .then(res => {
        setData(res.data.data?.code ? [] : res.data.data ?? [])
      })
      .catch(err => {
        console.error(err);
        toast.error("Failed to load terminals")
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    let isMounted = true;

    if (projectsActive || projects.length > 0) {
      fetchStationData(isMounted)
    }


    return () => { isMounted = false };
  }, [projectsActive, projects])

  useEffect(() => {
    let isMounted = true;

    if (isMounted && stationActive) {
      fetchTerminalData();
    }


    return () => { isMounted = false };
  }, [stationActive])

  const fetchTerminalDevices = async (row: DataWithAction) => {
    const sn = row.c_terminal_sn;

    if (expandedData[sn]) return;

    setLoadingExpanded(prev => ({ ...prev, [sn]: true }));

    try {
      const session = await getSession();

      const response = await ApiAxios.get(`${BASE_URL}/device/get-device-by-terminal`, {
        params: {
          c_terminal_sn: sn,
          c_project: row.c_project ?? 'KCI'
        },
        headers: {
          'Authorization': `Bearer ${session?.user.accessToken}`,
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
            <i className={classnames('tabler-chevron-right text-xl transition-transform text-text-secondary', {
              'rotate-90': row.getIsExpanded()
            })} />
          </div>
          <div className='flex flex-col'>
            <Typography color='text.primary' className='font-medium'>
              {row.original.c_terminal_type}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {row.original.c_station || '-'}
            </Typography>
          </div>
        </div>
      )
    }),
    columnHelper.accessor('n_station', {
      header: 'Station',
      cell: ({ row }) => (
        <Typography variant="body2">
          {row.original.n_station || '-'}
        </Typography>
      )
    }),
    columnHelper.accessor('c_terminal_sn', {
      header: 'S/N',
      cell: ({ row }) => (
        <Typography variant="body2" className="font-mono">
          {row.original.c_terminal_sn || '-'}
        </Typography>
      )
    }),
    columnHelper.accessor('n_terminal_name', {
      header: 'Terminal name',
      cell: ({ row }) => (
        <Typography variant="body2">
          {row.original.n_terminal_name || '-'}
        </Typography>
      )
    }),
    columnHelper.accessor('c_terminal_01', {
      header: 'Terminal 01',
      cell: ({ row }) => (
        <Typography variant="body2">
          {row.original.c_terminal_01 || '-'}
        </Typography>
      )
    }),
    columnHelper.accessor('c_terminal_02', {
      header: 'Terminal 02',
      cell: ({ row }) => (
        <Typography variant="body2">
          {row.original.c_terminal_02 || '-'}
        </Typography>
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
          {row.original.c_terminal_sn ?
            <ActionButton
              terminal={row.original}
              onSuccess={() => fetchTerminalData()}
            /> : '-'}
        </div>
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [stationActive, stationData, projectsActive, projects])

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
            disableClearable={!!projectsActive}
            options={projects}
            loading={loadingProjects}
            getOptionLabel={(option) => option.n_project || option.c_project || ""}
            renderInput={(params) => <TextField {...params} label="Project" />}
            className='min-w-28'
            size='small'
            value={projects.find(p => p.c_project === projectsActive) ?? null}
            onChange={(_, v) => {
              if (v) {
                setprojectsActive(v.c_project)
                setData([]);
              }
            }}
            isOptionEqualToValue={(option, value) => option.c_project === value.c_project}
          />
          <Autocomplete
            disablePortal
            disableClearable={!!stationActive && stationActive !== 'ALL'}
            value={stationData.find(s => s.c_station === stationActive) ?? null}
            options={stationData}
            onChange={(_, v) => v && setStationActive(v.c_station)}
            loading={loadingStation}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Station"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <Fragment>
                      {loadingStation ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </Fragment>
                  ),
                }}
              />
            )}
            getOptionLabel={(o) => o?.n_station ?? ''}
            className='min-w-60'
            size='small'
            isOptionEqualToValue={(option, value) => option.c_station === value.c_station}
            disabled={loadingProjects || loadingStation}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={v => setGlobalFilter(String(v))}
            placeholder='Search Library...'
            className='is-full sm:is-auto'
          />
          {props.permission?.includes('create') &&
            <Button
              variant="contained"
              color="primary"
              onClick={() => setIsAddModalOpen(true)}
              className="whitespace-nowrap"
            >
              Add Terminal
            </Button>}
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
