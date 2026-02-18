'use client'

import { useEffect, useState } from 'react'

import {
  Card, Button, TextField, Typography, Grid, Box, Chip, IconButton,
  Tooltip, Divider, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, Autocomplete, CircularProgress, MenuItem, useTheme
} from '@mui/material'
import classnames from 'classnames'
import { toast } from 'react-toastify'

import json from './json.json'

// --- 1. DEFINISI TIPE DATA ---
interface DeviceProps {
  i_id: string
  c_device: string
  c_serial_number: string
  c_device_type: string
  n_device_name: string
  c_direction?: number
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
  t_m_device: DeviceProps[]
}

interface SyncItemParsed {
  sub_item_type: string
  sub_model_code: string
  sub_model_name: string
  sub_serial_number: string
}

interface SyncTerminalProps {
  i_id: string
  item_serial_code: string
  model_name: string
  model_code?: string
  station_name: string
  station_code: string
  item: string
  c_signature: string | null
}

interface ApiResponse {
  t_m_terminal: TerminalProps[]
  t_m_sync_terminal: SyncTerminalProps[]
}

interface SyncDetailViewProps {
  rowData: {
    sync_id: string
    item_serial_code: string
    model_name: string
    model_code?: string
    station_name: string
    station_code: string
    terminal_id?: string | null
    c_terminal_sn?: string | null
    [key: string]: any
  }
  onClose: () => void
}

const SyncDetailView = ({ rowData, onClose }: SyncDetailViewProps) => {
  const theme = useTheme() // Hook Theme untuk Dark Mode logic
  const [loading, setLoading] = useState(true)
  const [detailData, setDetailData] = useState<ApiResponse | null>(null)

  const [selectedTerminal, setSelectedTerminal] = useState<TerminalProps | null>(null)
  const [parsedSyncItems, setParsedSyncItems] = useState<SyncItemParsed[]>([])
  const [isLocked, setIsLocked] = useState(false)
  const [filteredTerminals, setFilteredTerminals] = useState<TerminalProps[]>([])
  const [restoredItems, setRestoredItems] = useState<string[]>([])
  const [optionDevice, setOptionDevice] = useState<selectDevicesOption[]>([])

  // Edit & Mapping State
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(false)

  // Mapping Store: Key bisa "src-INDEX" (untuk source) atau "ID-EXISTING" (untuk unmatched target)
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
            c_direction: 0
          };
        }
      });

      setMappedDevices(prev => ({ ...prev, ...newMapping }));
    }
  }, [parsedSyncItems, optionDevice, rowData.station_code]);

  const fecthOptionDevice = async () => {
    setTimeout(() => {
      setOptionDevice([
        { "c_device_type": "CD", "n_device_type": "Card Dispenser", "c_device": "card_dispenser", "c_project": "KCI", "n_number": "01" },
        { "c_device_type": "CR", "n_device_type": "Card Reader", "c_device": "card_reader_01", "c_project": "KCI", "n_number": "01" },
        { "c_device_type": "CR", "n_device_type": "Card Reader", "c_device": "card_reader_02", "c_project": "KCI", "n_number": "02" },
        { "c_device_type": "PRINT", "n_device_type": "Printer", "c_device": "printer", "c_project": "KCI", "n_number": "01" },
        { "c_device_type": "QRS", "n_device_type": "QR Scanner", "c_device": "qr_scanner_01", "c_project": "KCI", "n_number": "01" },
        { "c_device_type": "BARCODE SCANNER", "n_device_type": "Barcode Scanner", "c_device": "0720301", "c_project": "KCI", "n_number": "01" },
        { "c_device_type": "RP", "n_device_type": "READER PREPAID", "c_device": "reader_prepaid", "c_project": "KCI", "n_number": "01" },
        { "c_device_type": "SAM", "n_device_type": "SAM Card", "c_device": "sam_mandiri_01", "c_project": "KCI", "n_number": "01" },
        { "c_device_type": "SCAN", "n_device_type": "SCANNER", "c_device": "scan", "c_project": "KCI", "n_number": "01" },
        { "c_device_type": "TRS", "n_device_type": "TURNSTILE", "c_device": "turnstile", "c_project": "KCI", "n_number": "01" }
      ])
    }, 800)
  }

  const fetchDetail = async () => {
    setLoading(true)
    setTimeout(() => {
      const MOCK_TERMINALS: TerminalProps[] = json as unknown as TerminalProps[];

      const mockResponse: ApiResponse = {
        "t_m_terminal": MOCK_TERMINALS,
        "t_m_sync_terminal": [
          {
            "i_id": rowData.sync_id || "gen-id",
            "item_serial_code": rowData.item_serial_code,
            "model_name": rowData.model_name,
            "station_name": rowData.station_name,
            "station_code": rowData.station_code,
            "item": JSON.stringify([
              { "sub_item_type": "MODULE READER", "sub_model_code": "0120201", "sub_model_name": "DE-AFCMI Reader 6 SAM", "sub_serial_number": "1071137441" },
              { "sub_item_type": "BARCODE SCANNER", "sub_model_code": "0720301", "sub_model_name": "Code CR 5210", "sub_serial_number": "1070037881" },
              { "sub_item_type": "DISPLAY", "sub_model_code": "DISP01", "sub_model_name": "LCD Display", "sub_serial_number": "SN-BARU-001" }
            ]),
            "c_signature": "mQ1n1a3NsZNiHOMUfq09QV3H3yHce+qnxyFFqH+krmM="
          }
        ]
      }

      setDetailData(mockResponse)

      if (mockResponse.t_m_sync_terminal?.[0]?.item) {
        try {
          const items = JSON.parse(mockResponse.t_m_sync_terminal[0].item) as SyncItemParsed[];

          setParsedSyncItems(items)
        } catch (e) { console.error("JSON Parse Error:", e) }
      }

      setFilteredTerminals(mockResponse.t_m_terminal)

      let targetTerminal: TerminalProps | undefined;

      if (rowData.terminal_id) targetTerminal = mockResponse.t_m_terminal.find((t) => t.i_id === rowData.terminal_id);
      if (!targetTerminal && rowData.c_terminal_sn) targetTerminal = mockResponse.t_m_terminal.find((t) => t.c_terminal_sn === rowData.c_terminal_sn);

      if (targetTerminal) {
        setSelectedTerminal(targetTerminal);
        setIsLocked(rowData.item_serial_code === targetTerminal.c_terminal_sn);
      } else {
        setSelectedTerminal(null);
        setIsLocked(false);
      }

      setLoading(false)
    }, 800)
  }

  const handleToggleRestore = (deviceId: string) => {
    setRestoredItems(prev => prev.includes(deviceId) ? prev.filter(id => id !== deviceId) : [...prev, deviceId])
  }

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
          n_device_name: mapping.n_device_name
        });
      }
    });

    // 2. Devices existing (Unmatched) yang di-restore atau di-edit manual
    selectedTerminal.t_m_device.forEach((targetDev) => {
      // Cek apakah item ini sudah diedit manual?
      const manualMap = mappedDevices[targetDev.i_id];

      if (manualMap) {
        // Jika sudah di-map manual, ambil data baru
        devicesPayload.push({
          c_device: manualMap.c_device,
          c_serial_number: targetDev.c_serial_number, // SN Tetap dari fisik
          c_device_type: manualMap.c_device_type,
          c_direction: manualMap.c_direction ?? 0,
          n_device_name: manualMap.n_device_name
        });
      } else if (restoredItems.includes(targetDev.i_id)) {
        // Jika hanya di-restore tanpa edit, ambil data lama
        devicesPayload.push({ ...targetDev, c_direction: 0 })
      }
    });

    const syncData = detailData?.t_m_sync_terminal[0];

    const payload = {
      c_project: selectedTerminal.c_project || "Unknown",
      c_terminal_sn: selectedTerminal.c_terminal_sn,
      n_terminal_name: selectedTerminal.n_terminal_name,
      i_sync_id: syncData?.i_id,
      devices: devicesPayload
    };

    console.log("=== PAYLOAD ===", payload);
    toast.success(`Sync Success! Check Console.`);
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
      // Jika belum ada mapping (misal Unmatched item yg belum di edit), coba cari berdasarkan kode device yang lama
      const deviceRaw = selectedTerminal?.t_m_device.find(d => d.i_id === id);

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

    // A. JIKA EDIT SOURCE ITEM
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
          c_direction: tempDirection
        };

        setMappedDevices(prev => ({ ...prev, [editingItemId]: newMapping }));
      }
    }

    // B. JIKA EDIT UNMATCHED TARGET ITEM
    else {
      // Ambil SN asli dari device target
      const originalDev = selectedTerminal?.t_m_device.find(d => d.i_id === editingItemId);
      const targetSN = originalDev?.c_serial_number || "";

      if (tempFormOption) {
        const generatedName = `${tempFormOption.n_device_type} ${rowData.station_code} ${tempFormOption.n_number}`;

        const newMapping: DeviceProps = {
          i_id: `manual-target-${Date.now()}`,
          c_device: tempFormOption.c_device,
          c_device_type: tempFormOption.c_device_type,
          n_device_name: generatedName,
          c_serial_number: targetSN, // SN tetap pakai yang lama
          c_direction: tempDirection
        };

        // Simpan mapping dengan Key ID original device
        setMappedDevices(prev => ({ ...prev, [editingItemId]: newMapping }));

        // Otomatis "Restore" item ini agar tidak terhapus
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

    // --- BAGIAN 1: SOURCE ITEMS (Incoming) ---
    const mergedView = parsedSyncItems.map((sourceItem, idx) => {
      const itemId = `src-${idx}`
      const mapping = mappedDevices[itemId]
      const isMapped = !!mapping;

      let statusLabel = "UNMAPPED";
      let statusColor: "success" | "info" | "warning" = "warning";

      // Theme Aware Colors
      let borderColor = theme.palette.mode === 'dark' ? 'rgba(255, 167, 38, 0.5)' : '#fdba74'; // Orange

      if (isMapped) {
        const isExactMatch = selectedTerminal.t_m_device.some(
          t => t.c_serial_number === sourceItem.sub_serial_number && t.c_device === mapping.c_device
        );

        if (isExactMatch) {
          statusLabel = "MATCH";
          statusColor = "success";
          borderColor = theme.palette.mode === 'dark' ? 'rgba(102, 187, 106, 0.5)' : '#4ade80'; // Green
        } else {
          statusLabel = "CREATE";
          statusColor = "info";
          borderColor = theme.palette.mode === 'dark' ? 'rgba(41, 182, 246, 0.5)' : '#60a5fa'; // Blue
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
                <div className="flex justify-between"><Typography variant="caption" color="text.secondary">SN (Source)</Typography><span className="font-mono font-bold text-xs">{sourceItem.sub_serial_number}</span></div>
              </div>

              <div className="mt-2 p-2 border border-gray-200 rounded text-xs animate-in fade-in zoom-in duration-300 dark:border-gray-700">
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
                          <Chip label="No Direction" size="small" className='h-5 text-[10px] opacity-70 font-bold' />}
                    </span>

                    <Typography variant="caption" color="text.secondary">SN (Target):</Typography>
                    <span className="font-mono font-bold text-blue-500">{mapping.c_serial_number}</span>
                  </div>
                ) : (
                  <Typography variant="caption" className="italic opacity-50">No device definition selected. Please edit to map.</Typography>
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

    // --- BAGIAN 2: UNMATCHED VIEW (Existing Target Items) ---
    const targetDeletedView = selectedTerminal.t_m_device.map((dev, idx) => {
      const isRestored = restoredItems.includes(dev.i_id);
      const manualMap = mappedDevices[dev.i_id]; // Cek jika sudah diedit manual

      // Cari info mapping library
      const mappedInfo = manualMap
        ? { c_device: manualMap.c_device, n_device_type: manualMap.n_device_name } // Jika sudah manual map
        : optionDevice.find(opt => opt.c_device === dev.c_device); // Jika belum, cari default

      // Logic Style Card
      const cardOpacity = isRestored ? 1 : 0.5;
      const cardBorderColor = isRestored ? theme.palette.success.main : theme.palette.text.disabled;
      const cardBg = isRestored ? (theme.palette.mode === 'dark' ? 'rgba(27, 94, 32, 0.2)' : '#f0fdf4') : 'transparent';

      return (
        <div key={`del-${idx}`} className="relative mb-2 mt-2 group">
          <Card variant="outlined"
            sx={{
              p: 1.5,
              opacity: cardOpacity,
              borderColor: cardBorderColor,
              borderStyle: isRestored ? 'solid' : 'dashed',
              bgcolor: cardBg,
              borderWidth: isRestored ? 1 : 1,
              borderLeftWidth: isRestored ? 4 : 1,
              transition: 'all 0.3s ease'
            }}>
            <div className="absolute -top-2 -right-1 z-10">
              <Chip
                label={isRestored ? (manualMap ? "MAPPED MANUAL" : "KEEP EXISTING") : "UNMATCHED"}
                color={isRestored ? "success" : "error"}
                size="small"
                className="font-bold h-4 text-[9px]"
              />
            </div>

            <div className="flex justify-between items-start">
              <div className='w-full'>
                <Typography variant="subtitle2" className="text-xs font-bold" color={isRestored ? "success.main" : "error.main"}>
                  {manualMap ? manualMap.n_device_name : dev.n_device_name}
                </Typography>

                <div className="mt-2 p-2 sx={{ bgcolor: 'background.default' }} border border-gray-200 rounded text-xs dark:border-gray-700">
                  <div className="flex items-center gap-1 mb-1 font-bold border-b pb-1 dark:border-gray-700 opacity-70">
                    <i className="tabler-database text-xs"></i> Existing Device Info:
                  </div>
                  <div className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-1">
                    <Typography variant="caption" color="text.secondary">Device Code:</Typography>
                    <span className="font-mono font-medium">{manualMap ? manualMap.c_device : dev.c_device}</span>

                    <Typography variant="caption" color="text.secondary">Device Name:</Typography>
                    <span>{mappedInfo ? (manualMap ? manualMap.n_device_name : `${mappedInfo.n_device_type} ${rowData.station_code} ${mappedInfo?.n_number}`) : dev.n_device_name}</span>

                    <Typography variant="caption" color="text.secondary">SN (Target):</Typography>
                    <span className="font-mono font-bold">{dev.c_serial_number}</span>

                    {manualMap && (
                      <>
                        <Typography variant="caption" color="text.secondary">Direction:</Typography>
                        <span>{manualMap.c_direction === 1 ? "IN" : manualMap.c_direction === 2 ? "OUT" : "None"}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* TOMBOL EDIT UNTUK UNMATCHED */}
            <div className="absolute top-2 right-2 z-20">
              <Tooltip title="Edit this existing device mapping">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => { e.stopPropagation(); handleEditClick(dev.i_id); }}
                  sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
                >
                  <i className="tabler-pencil text-sm" />
                </IconButton>
              </Tooltip>
            </div>
          </Card>

          {/* Restore Button (Toggle Keep/Delete) */}
          <div className={classnames("absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none", { "opacity-0 group-hover:opacity-100": isRestored, "opacity-100": !isRestored })}>
            <Tooltip title={isRestored ? "Undo Keep (Remove)" : "Keep this item"}>
              <IconButton
                size="small"
                onClick={() => handleToggleRestore(dev.i_id)}
                className="pointer-events-auto shadow-md border"
                sx={{
                  bgcolor: 'background.paper',
                  color: isRestored ? 'error.main' : 'success.main',
                  '&:hover': { bgcolor: isRestored ? 'error.lighter' : 'success.lighter' }
                }}
              >
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
        {selectedTerminal.t_m_device.length > 0 && (
          <Divider className="my-4">
            <Typography variant="caption" className="font-bold" color="text.secondary">Unmatched Devices (In Terminal but not in Source)</Typography>
          </Divider>
        )}
        {targetDeletedView}
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center"><CircularProgress /></div>
  const syncData = detailData?.t_m_sync_terminal[0]

  if (!syncData) return null

  return (
    <Box sx={{ p: 3, borderLeft: '4px solid', borderColor: 'primary.main', bgcolor: 'background.default' }}>
      <Typography variant="h6" className="mb-4 flex items-center gap-2"><i className="tabler-arrows-diff"></i> Data Synchronization & Mapping</Typography>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} variant="outlined" sx={{ p: 2, height: '100%', bgcolor: 'background.paper' }}>
            <div className="flex items-center gap-2 mb-3"><Chip label="SOURCE" color="warning" size="small" className="font-bold" /><Typography variant="subtitle1" fontWeight="bold">Incoming Sync Data</Typography></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Typography variant="caption" color="text.secondary">Serial Code:</Typography><span className="font-mono font-medium">{syncData.item_serial_code}</span>
                <Typography variant="caption" color="text.secondary">Model:</Typography><span>{syncData.model_name}</span>
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
            <div className="mb-4">
              <Autocomplete
                options={filteredTerminals}
                getOptionLabel={(o) => `${o.n_terminal_name} ${o.c_terminal_sn ? `(${o.c_terminal_sn})` : '(No SN)'}`}
                value={selectedTerminal}
                onChange={(_, v) => setSelectedTerminal(v)}
                disabled={isLocked}
                renderInput={(p) => <TextField {...p} size="small" placeholder="Select Target Terminal" />}
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
                renderInput={(p) => <TextField {...p} label="Select Device Definition" helperText="Choose from library" />}
                isOptionEqualToValue={(option, value) => option.c_device === value.c_device}
              />

              <TextField
                select
                label="Direction"
                value={tempDirection}
                onChange={(e) => setTempDirection(Number(e.target.value))}
                size="small"
                variant="outlined"
              >
                <MenuItem value={0}>No Direction</MenuItem>
                <MenuItem value={1}>IN</MenuItem>
                <MenuItem value={2}>OUT</MenuItem>
              </TextField>

              {/* Read Only Info */}
              <TextField label="Device Type" value={tempFormOption?.c_device_type || ''} disabled variant="filled" size='small' />

              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover', borderLeft: '4px solid', borderColor: 'info.main' }}>
                <Typography variant="caption" color="text.secondary" component="div" className="flex items-center gap-1">
                  <i className="tabler-info-circle"></i> Device Name Preview:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {tempFormOption ? `${tempFormOption.n_device_type} ${rowData.station_code} ${tempFormOption.n_number}` : 'Select definition to generate name'}
                </Typography>
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
