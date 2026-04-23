'use client'

import { useEffect, useState, useMemo } from 'react'

import { toast } from 'react-toastify'
import type {
  RowData
} from '@tanstack/react-table';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getSortedRowModel
} from '@tanstack/react-table'
import {
  TextField,
  Typography,
  LinearProgress,
  Autocomplete,
  CircularProgress,
  InputAdornment,
  Card,
  Grow,
  Grid,
} from '@mui/material'
import { getSession } from 'next-auth/react'

import tableStyles from '@core/styles/table.module.css'
import { DebouncedInput, fuzzyFilter } from '@/utils/helper'
import { ApiAxios } from '@/libs/ApiAxios'

// --- KONFIGURASI URL ---
const BASE_URL = process.env.API_MONITORING_URL;
const THRESHOLD_API_URL = 'https://da-device.devops-nutech.com/api/v1/data-type';

// --- TIPE DATA ---
interface ProjectProps {
  c_project: string;
  n_project?: string;
}

interface TerminalTypeProps {
  c_terminal_type: string;
  n_terminal_type?: string;
}

interface ThresholdData {
  i_id: string;
  c_data_type: string;
  c_project: string;
  n_measure: string | null;
  c_terminal_type: string;
  l_warning_up: number | null;
  l_warning_down: number | null;
  l_danger_up: number | null;
  l_danger_down: number | null;
}

// Deklarasi meta custom
declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    updateRow: (rowId: string, updatedPayload: Partial<ThresholdData>) => Promise<void>;
    permission: string[];
  }
}

const columnHelper = createColumnHelper<ThresholdData>()

// --- KOMPONEN EDITABLE CELL ---
const EditableNumberCell = ({
  getValue,
  row,
  column,
  table
}: {
  getValue: () => number | null;
  row: { original: ThresholdData };
  column: { id: string };
  table: any;
}) => {
  const initialValue = getValue()
  const [value, setValue] = useState<string | number>(initialValue === null ? '' : initialValue)
  const [isSaving, setIsSaving] = useState(false)

  const canWrite = table.options.meta?.permission?.includes('write')

  useEffect(() => {
    setValue(initialValue === null ? '' : initialValue)
  }, [initialValue])

  const handleSave = async () => {
    const finalValue = value === '' ? null : Number(value)

    if (finalValue === initialValue) return

    setIsSaving(true)

    try {
      await table.options.meta?.updateRow(row.original.i_id, {
        ...row.original,
        [column.id]: finalValue
      })
    } catch (error) {
      setValue(initialValue === null ? '' : initialValue)
    } finally {
      setIsSaving(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  if (!canWrite) {
    return <Typography variant="body2">{value === '' ? '-' : value}</Typography>
  }

  return (
    <TextField
      variant="standard"
      type="number"
      size="small"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={onKeyDown}
      disabled={isSaving}
      sx={{ maxWidth: '80px' }}
      InputProps={{
        disableUnderline: !isSaving,
        endAdornment: isSaving ? (
          <InputAdornment position="end">
            <CircularProgress size={14} color="inherit" />
          </InputAdornment>
        ) : null,
      }}
    />
  )
}

// --- KOMPONEN UTAMA ---
const ThresholdTable = ({ permission }: { permission: string[] }) => {
  const Subject = 'Parameter Threshold';

  const [data, setData] = useState<ThresholdData[]>([])
  const [loading, setLoading] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')

  // State Project
  const [projects, setProjects] = useState<ProjectProps[]>([])
  const [projectsActive, setProjectsActive] = useState<string>('')
  const [loadingProjects, setLoadingProjects] = useState(false)

  // State Terminal Type (Dependent on Project)
  const [terminalTypes, setTerminalTypes] = useState<TerminalTypeProps[]>([])
  const [terminalTypeActive, setTerminalTypeActive] = useState<string>('')
  const [loadingTypes, setLoadingTypes] = useState(false)

  // 1. Fetch Projects
  useEffect(() => {
    let isMounted = true;

    const fetchProjects = async () => {
      setLoadingProjects(true);
      const session = await getSession();

      try {
        const response = await ApiAxios.get(`${BASE_URL}/project/get-all-project`, {
          headers: { 'Authorization': `Bearer ${session?.user.accessToken}` }
        });

        if (isMounted) {
          const projectData = response.data?.data || [];

          setProjects(projectData);

          if (projectData.length > 0 && !projectsActive) {
            setProjectsActive(projectData[0].c_project);
          }
        }
      } catch (error) {
        if (isMounted) toast.error("Failed to load project data");
      } finally {
        if (isMounted) setLoadingProjects(false);
      }
    };

    fetchProjects();

    return () => { isMounted = false };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Fetch Terminal Types
  useEffect(() => {
    let isMounted = true;

    if (projectsActive) {
      const fetchTypes = async () => {
        setLoadingTypes(true);

        try {
          const session = await getSession();

          const response = await ApiAxios.get(`${BASE_URL}/terminal/type?c_project=${projectsActive}`, {
            headers: {
              'Authorization': `Bearer ${session?.user.accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (isMounted) {
            const types = response.data?.data || [];

            setTerminalTypes(types);

            if (types.length > 0) {
              setTerminalTypeActive(types[0].c_terminal_type);
            } else {
              setTerminalTypeActive('');
              setData([]);
            }
          }
        } catch (error) {
          console.error("Failed to fetch terminal types", error);
        } finally {
          if (isMounted) setLoadingTypes(false);
        }
      };

      fetchTypes();
    } else {
      setTerminalTypes([]);
      setTerminalTypeActive('');
    }

    return () => { isMounted = false };
  }, [projectsActive]);

  // 3. Fetch Data Threshold
  useEffect(() => {
    let isMounted = true;

    const fetchThresholdData = async () => {
      if (!projectsActive || !terminalTypeActive) return;
      setLoading(true);
      const session = await getSession();

      try {
        const response = await ApiAxios.post(
          `${THRESHOLD_API_URL}/get-threshold`,
          {
            c_project: projectsActive,
            c_terminal_type: terminalTypeActive
          },
          {
            headers: {
              'Authorization': `Bearer ${session?.user.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (isMounted) {
          setData(response.data.data ?? []);
        }
      } catch (error) {
        if (isMounted) toast.error("Failed to load threshold data");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchThresholdData();

    return () => { isMounted = false };
  }, [projectsActive, terminalTypeActive]);

  // 4. Konfigurasi Kolom
  const columns = useMemo(() => [
    columnHelper.accessor('c_data_type', {
      header: 'Data Type',
      cell: ({ row }) => (
        <Typography variant="body2" className="font-medium whitespace-nowrap">
          {row.original.c_data_type?.toUpperCase().replace(/_/g, ' ')}
        </Typography>
      )
    }),
    columnHelper.accessor('n_measure', {
      header: 'Unit',
      cell: ({ row }) => <Typography variant="caption" color="textSecondary">{row.original.n_measure || '-'}</Typography>
    }),
    columnHelper.accessor('l_warning_up', {
      header: 'Warning Up',
      cell: EditableNumberCell
    }),
    columnHelper.accessor('l_warning_down', {
      header: 'Warning Down',
      cell: EditableNumberCell
    }),
    columnHelper.accessor('l_danger_up', {
      header: 'Danger Up',
      cell: EditableNumberCell
    }),
    columnHelper.accessor('l_danger_down', {
      header: 'Danger Down',
      cell: EditableNumberCell
    })
  ], []);

  // 5. Inisiasi Table
  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    filterFns: { fuzzy: fuzzyFilter },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    meta: {
      permission,
      updateRow: async (rowId: string, updatedPayload: Partial<ThresholdData>) => {
        const session = await getSession();

        try {
          await ApiAxios.put(
            `${THRESHOLD_API_URL}/update-threshold`,
            {
              i_id: updatedPayload.i_id,
              l_warning_up: updatedPayload.l_warning_up,
              l_warning_down: updatedPayload.l_warning_down,
              l_danger_up: updatedPayload.l_danger_up,
              l_danger_down: updatedPayload.l_danger_down
            },
            {
              headers: {
                'Authorization': `Bearer ${session?.user.accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          setData((oldData) =>
            oldData.map((row) => (row.i_id === rowId ? { ...row, ...updatedPayload } : row))
          );
          toast.success("Threshold updated successfully");

        } catch (error) {
          toast.error("Failed to update threshold");
          throw error;
        }
      }
    }
  });

  return (
    <Grow in={true}>
      <Grid container spacing={6}>
        {/* --- HEADER TITLE (Luar Card) --- */}
        <Grid size={12}>
          <div className="col-12 flex flex-col gap-1">
            {/* dark:text-white memastikan teks terlihat saat dark mode aktif */}
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white">
              {Subject}
            </h1>
          </div>
        </Grid>

        {/* --- MAIN CARD --- */}
        <Grid size={12}>
          <Card>
            <div className='flex justify-between gap-4 p-5 flex-col items-start lg:flex-row lg:items-center'>
              <div className='flex flex-col sm:flex-row gap-4 w-full lg:w-2/3'>
                {/* Filter Project */}
                <Autocomplete
                  disablePortal
                  disableClearable={!!projectsActive}
                  options={projects}
                  loading={loadingProjects}
                  getOptionLabel={(option) => option.n_project || option.c_project || ""}
                  renderInput={(params) => <TextField {...params} label="Project" />}
                  className='w-full sm:w-1/2'
                  size='small'
                  value={projects.find(p => p.c_project === projectsActive) ?? null}
                  onChange={(_, v) => {
                    if (v) {
                      setProjectsActive(v.c_project);
                      setData([]);
                    }
                  }}
                  isOptionEqualToValue={(option, value) => option.c_project === value.c_project}
                />

                {/* Filter Terminal Type */}
                <Autocomplete
                  disablePortal
                  disableClearable={!!terminalTypeActive}
                  options={terminalTypes}
                  loading={loadingTypes}
                  getOptionLabel={(option) => option.n_terminal_type || option.c_terminal_type || ""}
                  renderInput={(params) => <TextField {...params} label="Terminal Type" />}
                  className='w-full sm:w-1/2'
                  size='small'
                  value={terminalTypes.find(t => t.c_terminal_type === terminalTypeActive) ?? null}
                  onChange={(_, v) => {
                    if (v) {
                      setTerminalTypeActive(v.c_terminal_type);
                      setData([]);
                    }
                  }}
                  isOptionEqualToValue={(option, value) => option.c_terminal_type === value.c_terminal_type}
                  disabled={!projectsActive || loadingTypes}
                />
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <DebouncedInput
                  value={globalFilter ?? ''}
                  onChange={v => setGlobalFilter(String(v))}
                  placeholder='Search Data Type...'
                  className='is-full lg:is-auto'
                />
              </div>
            </div>

            <div className='overflow-x-auto'>
              <table className={tableStyles.table} style={{ width: '100%' }}>
                {/* Menggunakan var(--mui-palette-background-paper) agar
                  background sticky header menyesuaikan background asli Card (terang/gelap)
                */}
                <thead
                  className="sticky top-0 z-10 shadow-sm"
                  style={{ backgroundColor: 'var(--mui-palette-background-paper)' }}
                >
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(h => (
                        <th key={h.id} className="whitespace-nowrap">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-4">
                        <LinearProgress className='w-full py-4' />
                      </td>
                    </tr>
                  ) : table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className='text-center py-10 text-gray-500'>
                        {!terminalTypeActive ? 'Pilih Terminal Type terlebih dahulu' : 'No data available'}
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map(row => (
                      <tr key={row.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </Grid>
      </Grid>
    </Grow>
  )
}

export default ThresholdTable
