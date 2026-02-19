'use client'

import { useEffect, useState } from 'react'

import {
  Card, Button, TextField, Typography, Grid, Box, Chip, IconButton,
  Tooltip, Divider, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, Autocomplete, CircularProgress, MenuItem, useTheme,
  Alert
} from '@mui/material'
import classnames from 'classnames'
import { toast } from 'react-toastify'
import axios from 'axios'

// --- KONFIGURASI API ---
const BASE_URL = process.env.API_MONITORING_URL;
const API_AUTH = process.env.API_AUTH;

// --- 1. DEFINISI TIPE DATA ---
interface DeviceProps {
  i_id: string
  c_device: string
  c_serial_number: string
  c_device_type: string
  n_device_name: string
  c_direction: number
  c_project: string
  c_terminal_sn: string
  b_active: boolean
  sub_item_type: string | null
  sub_item_code: string | null
  sub_item_serial_code: string | null
}

interface selectDevicesOption {
  c_device: string
  c_device_type: string
  n_device_type: string
  c_project: string
  n_number: string
}

interface TerminalProps {
  i_id: string
  c_terminal_sn: string | null
  c_terminal_type: string
  c_project?: string | null
  c_station?: string | null
  n_terminal_name: string
  item: DeviceProps[]
}

export interface SyncSubItem {
  sub_item_type: string;
  sub_model_code: string;
  sub_model_name: string;
  sub_serial_number: string;
  sub_item_serial_code: string;
}

export interface SyncTerminalProps {
  i_id: string;
  item_serial_code: string;
  client_name: string;
  model_code: string;
  model_name: string;
  station_code: string;
  station_name: string;
  location: string;
  note: string;
  d_sync: string;
  b_mapping: boolean;
  c_signature: string;
  serial_number: string;
  item: SyncSubItem[]
}

interface ApiResponse {
  terminal: TerminalProps | null
  sync_terminal: SyncTerminalProps | null
}

interface SyncDetailViewProps {
  rowData: {
    sync_id: string
    item_serial_code: string
    serial_number: string
    client_name: string
    model_code: string
    model_name: string
    station_code: string
    station_name: string
    d_sync: string
    b_mapping: boolean
    b_active: boolean

    terminal_id: string | null
    c_terminal_sn: string | null
    c_project: string | null
    c_station: string | null
    c_terminal_type: string | null

    match_status: 'MATCH' | 'NOT_MATCH' | string
    signature_status: 'SIGNATURE_VALID' | 'SIGNATURE_INVALID' | 'SIGNATURE_NOT_IDENTIC' | null | string
  }
  onClose: () => void
}

const SyncDetailView = ({ rowData, onClose }: SyncDetailViewProps) => {
  const theme = useTheme()
  const [loading, setLoading] = useState(true)
  const [detailData, setDetailData] = useState<ApiResponse | null>(null)

  const [selectedTerminal, setSelectedTerminal] = useState<TerminalProps | null>(null)
  const [parsedSyncItems, setParsedSyncItems] = useState<SyncSubItem[]>([])

  // State untuk Autocomplete
  const [isLocked, setIsLocked] = useState(false)
  const [terminalOptions, setTerminalOptions] = useState<TerminalProps[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  const [restoredItems, setRestoredItems] = useState<string[]>([])
  const [optionDevice, setOptionDevice] = useState<selectDevicesOption[]>([])

  // Edit & Mapping State
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(false)

  // Mapping Store
  const [mappedDevices, setMappedDevices] = useState<Record<string, DeviceProps | null>>({})

  // Temp State untuk Dialog
  const [tempFormOption, setTempFormOption] = useState<selectDevicesOption | null>(null)
  const [tempDirection, setTempDirection] = useState<number>(0)

  useEffect(() => {
    fetchDetail()
    fecthOptionDevice()
  }, [])

  // --- LOGIC AUTO MAPPING ---
  useEffect(() => {
    if (parsedSyncItems.length > 0 && optionDevice.length > 0) {
      const newMapping: Record<string, DeviceProps> = {};

      parsedSyncItems.forEach((sourceItem, idx) => {
        const itemId = `src-${idx}`;

        const matchOption = optionDevice.find((opt) =>
          opt.c_device === sourceItem.sub_model_code ||
          opt.c_device_type === sourceItem.sub_item_type ||
          opt.n_device_type.toUpperCase() === sourceItem.sub_item_type.toUpperCase()
        );

        if (matchOption) {
          const generatedName = `${matchOption.n_device_type} ${rowData.station_code} ${matchOption.n_number}`;

          newMapping[itemId] = {
            i_id: `generated-${idx}`,
            c_device: matchOption.c_device,
            c_device_type: matchOption.c_device_type,
            n_device_name: generatedName,
            c_serial_number: sourceItem.sub_serial_number,
            c_direction: 0,
            c_project: rowData.c_project || "KCI",
            c_terminal_sn: rowData.c_terminal_sn || "",
            b_active: true,
            sub_item_type: sourceItem.sub_item_type,
            sub_item_code: sourceItem.sub_model_code,
            sub_item_serial_code: sourceItem.sub_item_serial_code
          };
        }
      });

      setMappedDevices(prev => ({ ...prev, ...newMapping }));
    }
  }, [parsedSyncItems, optionDevice, rowData.station_code]);

  // --- API: FETCH OPTION TERMINAL (GET FREE TERMINAL) ---
  const fetchFreeTerminals = async () => {
    setLoadingOptions(true);

    try {
      // PERUBAHAN: Menggunakan GET dan Params
      const response = await axios.get(`${BASE_URL}/terminal/get-free-terminal`, {
        headers: {
          'Authorization': API_AUTH,
          'Content-Type': 'application/json'
        },
        params: {
          c_project: "KCI" // Dikirim sebagai query param: ?c_project=KCI
        }
      });

      // Asumsi response: { status: ..., data: [TerminalProps, ...] }
      const data = response.data?.data;

      if (Array.isArray(data)) {
        setTerminalOptions(data);
      } else if (data && typeof data === 'object') {
        setTerminalOptions([data]);
      } else {
        setTerminalOptions([]);
      }

    } catch (error) {
      console.error("Error fetching free terminals:", error);
      toast.error("Gagal memuat data terminal yang tersedia.");
    } finally {
      setLoadingOptions(false);
    }
  };

  // --- API 1: LOAD OPTION DEVICE (Static / Library) ---
  const fecthOptionDevice = async () => {
    // Optional: Anda bisa menambahkan loading state khusus jika perlu
    try {
      const response = await axios.post(`${BASE_URL}/device/device-type`, {
        c_project: "KCI"
      }, {
        headers: {
          'Authorization': API_AUTH,
          'Content-Type': 'application/json'
        }
      });

      // Sesuaikan dengan struktur response API Anda
      // Biasanya response.data.data atau response.data
      const data = response.data?.data || response.data;

      if (Array.isArray(data)) {
        setOptionDevice(data);
      } else {
        console.warn("Format data device options tidak valid (bukan array)");
        setOptionDevice([]);
      }
    } catch (error) {
      console.error("Error fetching option device:", error);
      toast.error("Gagal mengambil data referensi device.");
    }
  }

  // --- API 2: FETCH DETAIL (POST) ---
  const fetchDetail = async () => {
    setLoading(true)

    try {
      const payload = {
        serial_number: rowData.serial_number,
        c_project: rowData.c_project || "KCI"
      }

      const response = await axios.post(`${BASE_URL}/terminal/get-data-mapping-terminal-sync`, payload, {
        headers: {
          'Authorization': API_AUTH,
          'Content-Type': 'application/json'
        }
      });

      const apiRes = response.data?.data;

      if (!apiRes) {
        throw new Error("Data not found");
      }

      const formattedData: ApiResponse = {
        terminal: apiRes.terminal,
        sync_terminal: apiRes.sync_terminal
      }

      setDetailData(formattedData)

      // 1. Parse Sync Item
      if (formattedData.sync_terminal?.item) {
        try {
          const rawItem = formattedData.sync_terminal.item;
          const items = Array.isArray(rawItem) ? rawItem : JSON.parse(rawItem);

          setParsedSyncItems(items as SyncSubItem[]);
        } catch (e) {
          console.error("JSON Parse Error:", e);
          setParsedSyncItems([]);
        }
      }

      // 2. LOGIC PENENTUAN TARGET TERMINAL & LOCKING
      const existingTerminal: TerminalProps | null = formattedData.terminal;

      if (existingTerminal) {
        // KASUS 1: Data Terminal SUDAH ADA (Mapping ditemukan)
        setSelectedTerminal(existingTerminal);
        setTerminalOptions([existingTerminal]); // Masukkan ke opsi agar autocomplete terisi
        setIsLocked(true); // DISABLE AUTOCOMPLETE
      } else {
        // KASUS 2: Data Terminal BELUM ADA
        setSelectedTerminal(null);
        setIsLocked(false); // ENABLE AUTOCOMPLETE
      }

    } catch (error) {
      console.error("Fetch Detail Error:", error);
      toast.error("Gagal mengambil detail mapping terminal.");
      setDetailData(null);
    } finally {
      setLoading(false)
    }
  }

  const handleToggleRestore = (deviceId: string) => {
    setRestoredItems(prev => prev.includes(deviceId) ? prev.filter(id => id !== deviceId) : [...prev, deviceId])
  }

  // --- API 3: SUBMIT / CONFIRM ---
  const handleSyncSubmit = () => {
    if (!selectedTerminal) return toast.error("Please select a target terminal first!")

    let isAllMapped = true;

    parsedSyncItems.forEach((_, idx) => {
      if (!mappedDevices[`src-${idx}`]) isAllMapped = false;
    });

    if (!isAllMapped) return toast.error("Please map ALL Source Items before syncing!");

    const devicesPayload: any[] = [];

    // 1. Devices dari Source (Mapped)
    parsedSyncItems.forEach((_, idx) => {
      const mapping = mappedDevices[`src-${idx}`];

      if (mapping) {
        devicesPayload.push({
          c_device: mapping.c_device,
          c_serial_number: mapping.c_serial_number,
          c_device_type: mapping.c_device_type,
          c_direction: mapping.c_direction ?? 0,
          n_device_name: mapping.n_device_name,
          c_project: mapping.c_project || "KCI",
          c_terminal_sn: mapping.c_terminal_sn || "",
          b_active: mapping.b_active,
          sub_item_type: mapping.sub_item_type,
          sub_item_code: mapping.sub_item_code,
          sub_item_serial_code: mapping.sub_item_serial_code
        });
      }
    });

    // 2. Devices existing (Unmatched)
    selectedTerminal.item?.forEach((targetDev) => {
      const manualMap = mappedDevices[targetDev.i_id];

      if (manualMap) {
        devicesPayload.push({
          c_device: manualMap.c_device,
          c_serial_number: targetDev.c_serial_number,
          c_device_type: manualMap.c_device_type,
          c_direction: manualMap.c_direction ?? 0,
          n_device_name: manualMap.n_device_name,
          c_project: manualMap.c_project || "KCI"

        });
      } else if (restoredItems.includes(targetDev.i_id)) {
        devicesPayload.push({ ...targetDev, c_direction: 0 })
      }
    });

    const syncData = detailData?.sync_terminal;

    const payload = {
      ...selectedTerminal,
      c_project: selectedTerminal.c_project || "KCI",
      c_signature: syncData?.c_signature,
      i_sync_id: syncData?.i_id,
      c_model_code: syncData?.model_code,
      c_model_name: syncData?.model_name,
      c_terminal_sn: syncData?.serial_number,
      c_item_serial_code: syncData?.item_serial_code,
      devices: devicesPayload
    };

    console.log("=== PAYLOAD SUBMIT ===", payload);
    toast.success(`Sync Confirmed (Check Console)`);
  }

  // --- LOGIC EDIT ---
  const handleEditClick = (id: string) => {
    setEditingItemId(id)
    setEditDialogOpen(true)
    setLoadingConfig(true)

    const existingMap = mappedDevices[id];

    if (existingMap) {
      const matchingOption = optionDevice.find(opt => opt.c_device === existingMap.c_device);

      if (matchingOption) {
        setTempFormOption(matchingOption);
      } else {
        setTempFormOption({
          c_device: existingMap.c_device,
          c_device_type: existingMap.c_device_type,
          n_device_type: existingMap.n_device_name.split(' ')[0] || existingMap.n_device_name,
          c_project: "KCI",
          n_number: "00"
        });
      }

      setTempDirection(existingMap.c_direction ?? 0);
    } else {
      const deviceRaw = selectedTerminal?.item?.find(d => d.i_id === id);

      if (deviceRaw) {
        const matchingOption = optionDevice.find(opt => opt.c_device === deviceRaw.c_device);

        if (matchingOption) setTempFormOption(matchingOption);
      } else {
        setTempFormOption(null);
      }

      setTempDirection(0);
    }

    setTimeout(() => setLoadingConfig(false), 300)
  }

  // --- LOGIC SAVE MAPPING ---
  const handleSaveMapping = () => {
    if (!editingItemId) return;

    // Logic Simpan Mapping
    if (editingItemId.startsWith('src-')) {
      const idx = parseInt(editingItemId.split('-')[1]);
      const sourceSN = parsedSyncItems[idx]?.sub_serial_number || "";

      if (tempFormOption) {
        const generatedName = `${tempFormOption.n_device_type} ${rowData.station_code} ${tempFormOption.n_number}`;

        const newMapping: DeviceProps = {
          i_id: `manual-${Date.now()}`,
          c_device: tempFormOption.c_device,
          c_device_type: tempFormOption.c_device_type,
          n_device_name: generatedName,
          c_serial_number: sourceSN,
          c_direction: tempDirection,
          c_project: rowData.c_project || "KCI",
          c_terminal_sn: rowData.c_terminal_sn || "",
          b_active: rowData.b_active,
          sub_item_type: parsedSyncItems[idx].sub_item_type,
          sub_item_code: parsedSyncItems[idx].sub_model_code,
          sub_item_serial_code: parsedSyncItems[idx].sub_item_serial_code
        };

        setMappedDevices(prev => ({ ...prev, [editingItemId]: newMapping }));
      }
    } else {
      const originalDev = selectedTerminal?.item?.find(d => d.i_id === editingItemId);
      const targetSN = originalDev?.c_serial_number || "";

      if (tempFormOption) {
        const generatedName = `${tempFormOption.n_device_type} ${rowData.station_code} ${tempFormOption.n_number}`;

        const newMapping: DeviceProps = {
          i_id: `manual-target-${Date.now()}`,
          c_device: tempFormOption.c_device,
          c_device_type: tempFormOption.c_device_type,
          n_device_name: generatedName,
          c_serial_number: targetSN,
          c_direction: tempDirection,
          c_project: rowData.c_project || "KCI",
          c_terminal_sn: rowData.c_terminal_sn || "",
          b_active: rowData.b_active,
          sub_item_type: originalDev?.sub_item_type || "",
          sub_item_code: originalDev?.sub_item_code || "",
          sub_item_serial_code: originalDev?.sub_item_serial_code || ""
        };

        setMappedDevices(prev => ({ ...prev, [editingItemId]: newMapping }));

        if (!restoredItems.includes(editingItemId)) {
          setRestoredItems(prev => [...prev, editingItemId]);
        }
      }
    }

    setEditDialogOpen(false)
    setEditingItemId(null)
    setTempFormOption(null)
    setTempDirection(0);
  }

  const renderTargetComparison = () => {
    if (!selectedTerminal) return null

    // SOURCE ITEMS
    const mergedView = parsedSyncItems.map((sourceItem, idx) => {
      const itemId = `src-${idx}`
      const mapping = mappedDevices[itemId]
      const isMapped = !!mapping;

      // ... Style logic same as before
      let statusLabel = "UNMAPPED";
      let statusColor: "success" | "info" | "warning" = "warning";
      let borderColor = theme.palette.mode === 'dark' ? 'rgba(255, 167, 38, 0.5)' : '#fdba74';

      if (isMapped) {
        const isExactMatch = selectedTerminal.item?.some(
          t => t.c_serial_number === sourceItem.sub_serial_number && t.c_device === mapping.c_device
        );

        if (isExactMatch) {
          statusLabel = "MATCH"; statusColor = "success"; borderColor = theme.palette.mode === 'dark' ? 'rgba(102, 187, 106, 0.5)' : '#4ade80';
        } else {
          statusLabel = "CREATE"; statusColor = "info"; borderColor = theme.palette.mode === 'dark' ? 'rgba(41, 182, 246, 0.5)' : '#60a5fa';
        }
      }

      return (
        <Card key={itemId} variant="outlined" sx={{ mb: 1, p: 2, overflow: 'visible', borderColor: borderColor, borderWidth: 2, bgcolor: 'background.paper' }} className={classnames("mt-3 group relative")}>
          <div className="absolute -top-3 -right-1">
            <Chip label={statusLabel} color={statusColor} size="small" className="font-bold h-5 text-[10px]" />
          </div>
          <div className="flex justify-between items-start">
            <div className='w-full'>
              <Typography variant="subtitle2" className="text-md font-bold text-primary mb-3 mt-2">{sourceItem.sub_item_type}</Typography>
              <div className="flex flex-col text-xs mt-1 gap-1">
                <div className="flex justify-between"><Typography variant="caption" color="text.secondary">Model</Typography><Typography variant="caption">{sourceItem.sub_model_name}</Typography></div>
                <div className="flex justify-between"><Typography variant="caption" color="text.secondary">Serial Number</Typography><span className="font-mono font-bold text-xs">{sourceItem.sub_serial_number}</span></div>
              </div>
              <div className="mt-2 p-2 border rounded text-xs animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-1 mb-1 font-bold border-b pb-1 dark:border-gray-700">
                  <Typography variant="caption" fontWeight="bold" color="primary"><i className="tabler-link text-xs"></i> Mapped to:</Typography>
                </div>
                {mapping ? (
                  <div className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-1">
                    <Typography variant="caption" color="text.secondary">Device Code:</Typography>
                    <span className="font-mono font-medium">{mapping.c_device}</span>
                    <Typography variant="caption" color="text.secondary">Device Name:</Typography>
                    <span>{mapping.n_device_name}</span>
                    <Typography variant="caption" color="text.secondary">Direction:</Typography>
                    <span>
                      {mapping.c_direction === 1 ? <Chip label="IN" size="small" color="success" className='h-5 text-[10px]' /> :
                        mapping.c_direction === 2 ? <Chip label="OUT" size="small" color="error" className='h-5 text-[10px]' /> :
                          <Chip label="No Direction" size="small" className='h-5 text-[10px] font-bold' />}
                    </span>
                  </div>
                ) : (
                  <Typography variant="caption" className="italic">No device definition selected. Please edit to map.</Typography>
                )}
              </div>
            </div>
            <div className="absolute top-3.5 right-2 group-hover:opacity-100 transition-opacity">
              <Tooltip title="Edit Mapping">
                <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleEditClick(itemId); }} sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
                  <i className="tabler-pencil text-lg" />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </Card>
      )
    })

    // UNMATCHED VIEW
    const targetDeletedView = selectedTerminal.item?.map((dev, idx) => {
      const isRestored = restoredItems.includes(dev.i_id);
      const manualMap = mappedDevices[dev.i_id];
      const libraryInfo = optionDevice.find(opt => opt.c_device === dev.c_device);

      const cardOpacity = isRestored ? 1 : 0.5;
      const cardBorderColor = isRestored ? theme.palette.success.main : theme.palette.text.disabled;
      const cardBg = isRestored ? (theme.palette.mode === 'dark' ? 'rgba(27, 94, 32, 0.2)' : '#f0fdf4') : 'transparent';

      return (
        <div key={`del-${idx}`} className="relative mb-2 mt-2 group">
          <Card variant="outlined"
            sx={{
              p: 1.5, opacity: cardOpacity, borderColor: cardBorderColor,
              borderStyle: isRestored ? 'solid' : 'dashed', bgcolor: cardBg,
              borderWidth: isRestored ? 1 : 1, borderLeftWidth: isRestored ? 4 : 1,
              transition: 'all 0.3s ease'
            }}>
            <div className="absolute -top-2 -right-1 z-10">
              <Chip label={isRestored ? (manualMap ? "MAPPED MANUAL" : "KEEP EXISTING") : "UNMATCHED"} color={isRestored ? "success" : "error"} size="small" className="font-bold h-4 text-[9px]" />
            </div>
            <div className="flex justify-between items-start">
              <div className='w-full'>
                <Typography variant="subtitle2" className="text-xs font-bold" color={isRestored ? "success.main" : "error.main"}>{manualMap ? manualMap.n_device_name : dev.n_device_name}</Typography>
                <div className="mt-2 p-2 sx={{ bgcolor: 'background.default' }} border border-gray-200 rounded text-xs dark:border-gray-700">
                  <div className="flex items-center gap-1 mb-1 font-bold border-b pb-1 dark:border-gray-700 opacity-70"><i className="tabler-database text-xs"></i> Existing Device Info:</div>
                  <div className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-1">
                    <Typography variant="caption" color="text.secondary">Device Code:</Typography>
                    <span className="font-mono font-medium">{manualMap ? manualMap.c_device : dev.c_device}</span>
                    <Typography variant="caption" color="text.secondary">Device Name:</Typography>
                    <span>{manualMap ? manualMap.n_device_name : (libraryInfo ? `${libraryInfo.n_device_type} ${rowData.station_code} ${libraryInfo.n_number}` : dev.n_device_name)}</span>
                    <Typography variant="caption" color="text.secondary">SN (Target):</Typography>
                    <span className="font-mono font-bold">{dev.c_serial_number}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-2 right-2 z-20">
              <Tooltip title="Edit this existing device mapping">
                <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleEditClick(dev.i_id); }} sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
                  <i className="tabler-pencil text-sm" />
                </IconButton>
              </Tooltip>
            </div>
          </Card>
          <div className={classnames("absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none", { "opacity-0 group-hover:opacity-100": isRestored, "opacity-100": !isRestored })}>
            <Tooltip title={isRestored ? "Undo Keep (Remove)" : "Keep this item"}>
              <IconButton size="small" onClick={() => handleToggleRestore(dev.i_id)} className="pointer-events-auto shadow-md border" sx={{ bgcolor: 'background.paper', color: isRestored ? 'error.main' : 'success.main' }}>
                <i className={classnames(isRestored ? "tabler-minus" : "tabler-plus")}></i>
              </IconButton>
            </Tooltip>
          </div>
        </div>
      )
    })

    return (
      <div className="max-h-80 overflow-y-auto pr-1">
        {mergedView}
        {selectedTerminal.item?.length > 0 && <Divider className="my-4"><Typography variant="caption" className="font-bold" color="text.secondary">Unmatched Devices</Typography></Divider>}
        {targetDeletedView}
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center"><CircularProgress /></div>

  const syncData = detailData?.sync_terminal;

  if (!syncData) return (<Box sx={{ p: 4, textAlign: 'center' }}><Alert severity="error">Data not found.</Alert><Button onClick={onClose} sx={{ mt: 2 }}>Close</Button></Box>)

  return (
    <Box sx={{ p: 3, borderLeft: '4px solid', borderColor: 'primary.main', bgcolor: 'background.default' }}>
      <Typography variant="h6" className="mb-4 flex items-center gap-2"><i className="tabler-arrows-diff"></i> Data Synchronization & Mapping</Typography>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} variant="outlined" sx={{ p: 2, height: '100%', borderColor: 'warning.main', bgcolor: 'background.paper' }}>
            <div className="flex items-center gap-2 mb-3"><Chip label="SOURCE" color="warning" size="small" className="font-bold" /><Typography variant="subtitle1" fontWeight="bold">Incoming Sync Data</Typography></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Typography variant="caption" color="text.secondary">Serial No (Short):</Typography><span className="font-mono font-bold text-primary">{syncData.serial_number}</span>
                <Typography variant="caption" color="text.secondary">Item Serial (Long):</Typography><span className="font-mono text-xs">{syncData.item_serial_code}</span>
                <Typography variant="caption" color="text.secondary">Model:</Typography><span>{syncData.model_name}</span>
                <Typography variant="caption" color="text.secondary">Station:</Typography><span>{syncData.station_name} ({syncData.station_code})</span>
              </div>
              <Divider textAlign="left"><Typography variant="caption" color="textSecondary">INCLUDED DEVICES</Typography></Divider>
              <div className="max-h-60 overflow-y-auto pr-1">
                {parsedSyncItems.map((item, idx) => (
                  <Card key={idx} variant="outlined" sx={{ mb: 1, p: 1.5, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" className="text-xs font-bold" color="warning.main">{item.sub_item_type}</Typography>
                    <div className="flex justify-between text-xs mt-1"><span>{item.sub_model_name}</span><span className="font-mono">{item.sub_serial_number}</span></div>
                  </Card>
                ))}
              </div>
            </div>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} variant="outlined" sx={{ p: 2, height: '100%', borderColor: 'primary.main', bgcolor: 'background.paper' }}>
            <div className="flex items-center gap-2 mb-3"><Chip label="TARGET" color="primary" size="small" className="font-bold" /><Typography variant="subtitle1" fontWeight="bold">Result After Sync</Typography></div>
            <div className="mb-4 pt-3">
              <Autocomplete
                options={terminalOptions}
                getOptionLabel={(o) => `${o.n_terminal_name} ${o.c_terminal_sn ? `(${o.c_terminal_sn})` : '(No SN)'}`}
                value={selectedTerminal}
                onChange={(_, v) => setSelectedTerminal(v)}
                disabled={isLocked}
                loading={loadingOptions}
                onOpen={() => {
                  if (!isLocked && terminalOptions.length === 0) fetchFreeTerminals();
                }}
                renderInput={(p) => (
                  <TextField
                    {...p}
                    size="small"
                    label={isLocked ? "Terminal Locked" : "Search Target Terminal"}
                    placeholder={isLocked ? "Terminal Locked" : "Search Free Terminal..."}
                    InputProps={{
                      ...p.InputProps,
                      endAdornment: (
                        <>
                          {loadingOptions ? <CircularProgress color="inherit" size={20} /> : null}
                          {p.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </div>
            {selectedTerminal ? <div className="animate-in fade-in slide-in-from-bottom-2 duration-300"><Divider sx={{ my: 2 }} />{renderTargetComparison()}</div> : <div className="h-40 flex items-center justify-center border-2 border-dashed rounded opacity-50"><Typography variant="body2" color="text.secondary">Select a terminal first</Typography></div>}
          </Paper>
        </Grid>
      </Grid>

      {/* --- EDIT DIALOG --- */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle className='flex justify-between items-center'>Map to Device Definition<IconButton onClick={() => setEditDialogOpen(false)} size='small'><i className='tabler-x' /></IconButton></DialogTitle>
        <DialogContent dividers>
          {loadingConfig ? <div className="flex justify-center p-5"><CircularProgress /></div> : (
            <div className="flex flex-col gap-4 pt-1">
              <Autocomplete
                options={optionDevice}
                getOptionLabel={(o) => `${o.n_device_type} (${o.c_device})`}
                value={tempFormOption}
                onChange={(_, v) => setTempFormOption(v)}
                renderInput={(p) => <TextField {...p} label="Select Device Definition" />}
                isOptionEqualToValue={(option, value) => option.c_device === value.c_device}
              />
              <TextField select label="Direction" value={tempDirection} onChange={(e) => setTempDirection(Number(e.target.value))} size="small" variant="outlined">
                <MenuItem value={0}>No Direction</MenuItem>
                <MenuItem value={1}>IN</MenuItem>
                <MenuItem value={2}>OUT</MenuItem>
              </TextField>
              <TextField label="Device Type" value={tempFormOption?.c_device_type || ''} disabled variant="filled" size='small' />
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover', borderLeft: '4px solid', borderColor: 'info.main' }}>
                <Typography variant="caption" color="text.secondary" component="div" className="flex items-center gap-1"><i className="tabler-info-circle"></i> Device Name Preview:</Typography>
                <Typography variant="body2" fontWeight="bold">{tempFormOption ? `${tempFormOption.n_device_type} ${rowData.station_code} ${tempFormOption.n_number}` : 'Select definition to generate name'}</Typography>
              </Paper>
            </div>
          )}
        </DialogContent>
        <DialogActions className='pt-3'><Button onClick={() => setEditDialogOpen(false)} color="secondary">Cancel</Button><Button onClick={handleSaveMapping} variant="contained" disabled={loadingConfig}>Save Mapping</Button></DialogActions>
      </Dialog>

      <div className="mt-6 flex justify-end gap-3 border-t pt-4">
        <Button variant="outlined" color="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="primary" startIcon={<i className="tabler-check" />} disabled={!selectedTerminal} onClick={handleSyncSubmit}>Confirm Sync & Map</Button>
      </div>
    </Box>
  )
}

export default SyncDetailView
