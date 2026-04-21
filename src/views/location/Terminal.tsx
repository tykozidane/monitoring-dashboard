'use client'

import { useEffect, useState, useMemo } from 'react'

import dynamic from 'next/dynamic'

import { toast } from 'react-toastify'
import {
  createColumnHelper, flexRender, getCoreRowModel, useReactTable,
  getFilteredRowModel, getSortedRowModel, getPaginationRowModel
} from '@tanstack/react-table'
import {
  Button, TextField, Typography, TablePagination, CircularProgress,
  LinearProgress, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions, Box, Tooltip
} from '@mui/material'

import { getSession } from 'next-auth/react'

import tableStyles from '@core/styles/table.module.css'
import { DebouncedInput, fuzzyFilter } from '@/utils/helper'
import { ApiAxios } from '@/libs/ApiAxios'
import 'leaflet/dist/leaflet.css'

// Dynamic import Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false })

interface ProjectProps { c_project: string; n_project: string; }
interface StationProps { c_project: string; c_station: string; n_station: string; }
interface TerminalData {
  c_project: string; c_station: string; c_terminal_01: string;
  c_terminal_type: string; n_terminal_name: string;
  n_lat: string | null; n_lng: string | null;
}

const columnHelper = createColumnHelper<TerminalData>()
const BASE_URL = process.env.API_MONITORING_URL;

// Table Geocoding Helper Component (On-Demand Fetching to avoid Rate Limits)
const AddressCell = ({ lat, lng }: { lat: string | null, lng: string | null }) => {
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchAddress = async () => {
    if (!lat || !lng) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/geocode?type=reverse&lat=${lat}&lng=${lng}`);
      const data = await res.json();

      if (data.error) {
        setAddress('Failed: API Limit');
      } else {
        setAddress(data.display_name || 'Unknown location');
      }
    } catch (error) {
      setAddress('Failed to load address');
    } finally {
      setLoading(false);
    }
  };

  if (!lat || !lng) return <Typography variant="body2" color="text.secondary">-</Typography>;

  if (!address) {
    return (
      <Button
        size="small"
        variant="text"
        color="info"
        onClick={(e) => { e.stopPropagation(); fetchAddress(); }}
        disabled={loading}
        sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0, minWidth: 'auto' }}
      >
        {loading ? <CircularProgress size={14} color="inherit" /> : 'View Address'}
      </Button>
    );
  }

  return (
    <Box sx={{ maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
      <Typography variant="body2" className="line-clamp-2 text-xs" title={address}>
        {address}
      </Typography>
    </Box>
  );
}

const Terminal = (props: { permission: string[] }) => {
  const [data, setData] = useState<TerminalData[]>([])
  const [loading, setLoading] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')

  const [projectsActive, setProjectsActive] = useState<string>()
  const [projects, setProjects] = useState<ProjectProps[]>([])

  const [stationActive, setStationActive] = useState<string>()
  const [stations, setStations] = useState<StationProps[]>([])

  // --- MAP DIALOG STATE ---
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [selectedTerminal, setSelectedTerminal] = useState<TerminalData | null>(null)
  const [tempLocation, setTempLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName] = useState<string>('')

  const [locationOptions, setLocationOptions] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Fix Marker Leaflet untuk Next.js
  useEffect(() => {
    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    });
  }, []);

  // Map Click Listener
  useEffect(() => {
    if (mapInstance) {
      const handleMapClick = (e: any) => {
        setTempLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        fetchAddressByCoords(e.latlng.lat, e.latlng.lng);
      };

      mapInstance.on('click', handleMapClick);

      return () => { mapInstance.off('click', handleMapClick); };
    }
  }, [mapInstance]);

  // Autocomplete Geocoding Search
  useEffect(() => {
    if (inputValue.length < 4) {
      setLocationOptions([]);

      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);

      try {
        const res = await fetch(`/api/geocode?type=search&q=${inputValue}`);

        setLocationOptions(await res.json());
      } catch (error) { console.error(error); } finally { setIsSearching(false); }
    }, 1000);


    return () => clearTimeout(delayDebounceFn);
  }, [inputValue]);

  // Initial Fetch
  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      const session = await getSession();

      try {
        const res = await ApiAxios.get(`${BASE_URL}/project/get-all-project`, { headers: { 'Authorization': `Bearer ${session?.user.accessToken}` } });

        if (isMounted) {
          const pData = res.data?.data || [];

          setProjects(pData);
          if (pData.length > 0 && !projectsActive) setProjectsActive(pData[0].c_project);
        }
      } catch (error) { toast.error("Failed to load projects"); }
    };

    loadProjects();

    return () => { isMounted = false };
  }, []);

  const fetchStations = async () => {
    if (!projectsActive) return;
    const session = await getSession();

    try {
      const res = await ApiAxios.get(`${BASE_URL}/station/mini?c_project=${projectsActive}`, { headers: { 'Authorization': `Bearer ${session?.user.accessToken}` } });
      const sData = res.data?.data?.code ? [] : res.data.data ?? [];

      setStations(sData);
      if (sData.length > 0) setStationActive(sData[0].c_station);
    } catch (error) { toast.error("Failed to load stations"); }
  };

  const fetchTerminalData = async () => {
    if (!projectsActive || !stationActive) return;
    setLoading(true);
    const session = await getSession();

    try {
      const res = await ApiAxios.post(
        `${BASE_URL}/terminal/list-terminal-coordinate?c_project=${projectsActive}`,
        { c_project: projectsActive, c_station: stationActive },
        { headers: { 'Authorization': `Bearer ${session?.user.accessToken}` } }
      );

      setData(res.data.data?.code ? [] : res.data.data ?? []);
    } catch (error) { toast.error("Failed to load terminals"); } finally { setLoading(false); }
  };

  useEffect(() => { if (projectsActive) fetchStations(); }, [projectsActive]);
  useEffect(() => { if (stationActive) fetchTerminalData(); }, [stationActive]);

  const fetchAddressByCoords = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/geocode?type=reverse&lat=${lat}&lng=${lng}`);
      const data = await res.json();

      setLocationName(data.display_name || 'Location name not found');
    } catch (error) { setLocationName('Failed to fetch location name'); }
  }

  const handleOpenUpdate = (row: TerminalData) => {
    setSelectedTerminal(row);

    if (row.n_lat && row.n_lng) {
      const lat = parseFloat(row.n_lat);
      const lng = parseFloat(row.n_lng);

      setTempLocation({ lat, lng });
      fetchAddressByCoords(lat, lng);
    } else {
      setTempLocation(null);
      setLocationName('');
    }

    setInputValue('');
    setLocationOptions([]);
    setIsMapOpen(true);
  };

  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;

        setTempLocation({ lat: latitude, lng: longitude });
        fetchAddressByCoords(latitude, longitude);
        if (mapInstance) mapInstance.flyTo([latitude, longitude], 18);
      }, () => toast.error("Izin akses lokasi ditolak oleh browser."));
    } else toast.error("Browser Anda tidak mendukung Geolocation.");
  };

  const handleConfirmLocation = async () => {
    if (!selectedTerminal || !tempLocation) return;
    setIsUpdating(true);
    const session = await getSession();

    try {
      await ApiAxios.put(
        `${BASE_URL}/terminal/update-coordinate-terminal?c_project=${projectsActive}`,
        {
          c_project: projectsActive,
          c_station: selectedTerminal.c_station,
          c_terminal_01: selectedTerminal.c_terminal_01,
          n_lat: tempLocation.lat.toString(),
          n_lng: tempLocation.lng.toString()
        },
        { headers: { 'Authorization': `Bearer ${session?.user.accessToken}` } }
      );
      toast.success("Terminal coordinate updated successfully");
      setIsMapOpen(false);
      fetchTerminalData();
    } catch (error) { toast.error("Failed to update terminal coordinate"); } finally { setIsUpdating(false); }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('c_terminal_01', {
      header: 'Terminal 01',
      cell: ({ row }) => <Typography variant="body2" className="font-mono">{row.original.c_terminal_01 || '-'}</Typography>
    }),
    columnHelper.accessor('n_terminal_name', {
      header: 'Name',
      cell: ({ row }) => <Typography variant="body2">{row.original.n_terminal_name || '-'}</Typography>
    }),
    columnHelper.accessor('n_lat', {
      header: 'Coordinate',
      cell: ({ row }) => (
        <Typography variant="caption" className="text-gray-500 block">
          {row.original.n_lat && row.original.n_lng ? `${row.original.n_lat}, ${row.original.n_lng}` : '-'}
        </Typography>
      )
    }),
    columnHelper.display({
      id: 'address',
      header: 'Location Name',
      cell: ({ row }) => <AddressCell lat={row.original.n_lat} lng={row.original.n_lng} />
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right w-full pe-4">Action</div>,
      cell: ({ row }) => (
        <div className="flex justify-end pe-4">
          {props.permission?.includes('write') && (
            <Button variant='outlined' size='small' color='primary' onClick={(e) => { e.stopPropagation(); handleOpenUpdate(row.original); }}>
              Update Location
            </Button>
          )}
        </div>
      )
    })
  ], [props.permission]);

  const table = useReactTable({
    data, columns, state: { globalFilter }, filterFns: { fuzzy: fuzzyFilter },
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    onGlobalFilterChange: setGlobalFilter,
  })

  return (
    <>
      <div className='flex justify-between gap-4 p-5 flex-col items-start sm:flex-row sm:items-center'>
        <div className='text-left h3 flex flex-col sm:flex-row gap-4 w-1/2 max-sm:w-full'>
          <Autocomplete
            disablePortal disableClearable={!!projectsActive} options={projects}
            getOptionLabel={(option) => option.n_project || option.c_project || ""}
            renderInput={(params) => <TextField {...params} label="Project" />}
            className='min-w-32' size='small'
            value={projects.find(p => p.c_project === projectsActive) ?? null}
            onChange={(_, v) => { if (v) { setProjectsActive(v.c_project); setStationActive(''); setData([]); } }}
            isOptionEqualToValue={(option, value) => option.c_project === value.c_project}
          />
          <Autocomplete
            disablePortal disableClearable={!!stationActive} options={stations}
            getOptionLabel={(option) => option.n_station || option.c_station || ""}
            renderInput={(params) => <TextField {...params} label="Station" />}
            className='min-w-60' size='small'
            value={stations.find(s => s.c_station === stationActive) ?? null}
            onChange={(_, v) => { if (v) { setStationActive(v.c_station); setData([]); } }}
            isOptionEqualToValue={(option, value) => option.c_station === value.c_station}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <DebouncedInput value={globalFilter ?? ''} onChange={v => setGlobalFilter(String(v))} placeholder='Search Terminal...' className='is-full sm:is-auto' />
        </div>
      </div>

      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>)}
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
                <tr key={row.id} className="hover:bg-gray-50/10 transition-colors">
                  {row.getVisibleCells().map(cell => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination count={table.getFilteredRowModel().rows.length} rowsPerPage={table.getState().pagination.pageSize} page={table.getState().pagination.pageIndex} onPageChange={(_, p) => table.setPageIndex(p)} onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))} rowsPerPageOptions={[10, 25, 50]} component='div' className='border-bs' />

      {/* --- MAP SELECTION SUB-DIALOG --- */}
      <Dialog open={isMapOpen} onClose={() => !isUpdating && setIsMapOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Select Location for Terminal: {selectedTerminal?.n_terminal_name || selectedTerminal?.c_terminal_01}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '550px' }}>
          <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Autocomplete
              fullWidth size="small" options={locationOptions} getOptionLabel={(option: any) => option.display_name || ""} filterOptions={(x) => x}
              noOptionsText={isSearching ? "Searching..." : inputValue.length < 4 ? "Type at least 4 characters..." : "Location not found"}
              onChange={(_, newValue: any) => {
                if (newValue) {
                  const lat = parseFloat(newValue.lat);
                  const lng = parseFloat(newValue.lon);

                  setTempLocation({ lat, lng });
                  fetchAddressByCoords(lat, lng);
                  if (mapInstance) mapInstance.flyTo([lat, lng], 18);
                }
              }}
              onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
              renderInput={(params) => (
                <TextField {...params} placeholder="Search location..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isSearching ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Tooltip title="Use My Current Location">
              <Button variant="contained" color="secondary" onClick={handleGetCurrentLocation} sx={{ minWidth: '160px' }}>
                My Location
              </Button>
            </Tooltip>
          </Box>

          <Box sx={{ flexGrow: 1, position: 'relative' }} className="rounded overflow-hidden mx-5 mt-1 border">
            <MapContainer
              center={tempLocation ? [tempLocation.lat, tempLocation.lng] : [-6.200000, 106.816666]}
              zoom={tempLocation ? 18 : 13}
              style={{ height: '100%', width: '100%' }}
              ref={setMapInstance}
            >
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
              {tempLocation && <Marker position={[tempLocation.lat, tempLocation.lng]} />}
            </MapContainer>
          </Box>

          <Box sx={{ px: 3, pt: 2, pb: 1, minHeight: '70px', width: '100%' }}>
            <Typography variant="subtitle2" color="primary" className="font-semibold">Selected Location:</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
              {locationName ? locationName : tempLocation ? "Fetching address..." : "Silakan cari alamat atau klik pada peta"}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions className='pt-3 pb-3'>
          <Box sx={{ width: '100%', px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="text-sm text-gray-500 font-mono">
              {tempLocation ? `Lat: ${tempLocation.lat.toFixed(6)} | Lng: ${tempLocation.lng.toFixed(6)}` : '-'}
            </div>
            <div>
              <Button onClick={() => setIsMapOpen(false)} color="inherit" sx={{ mr: 1 }} disabled={isUpdating}>Cancel</Button>
              <Button onClick={handleConfirmLocation} variant="contained" disabled={!tempLocation || isUpdating}>
                {isUpdating ? <CircularProgress size={20} color="inherit" /> : 'Confirm Location'}
              </Button>
            </div>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default Terminal
