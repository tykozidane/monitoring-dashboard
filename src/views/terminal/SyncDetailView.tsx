'use client'

import { useEffect, useState } from 'react'

import {
  Card, Button, TextField, Typography, Grid, Box, Chip, IconButton,
  Tooltip, Divider, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, Autocomplete, CircularProgress, MenuItem
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
  const [loading, setLoading] = useState(true)
  const [detailData, setDetailData] = useState<ApiResponse | null>(null)

  const [selectedTerminal, setSelectedTerminal] = useState<TerminalProps | null>(null)
  const [parsedSyncItems, setParsedSyncItems] = useState<SyncItemParsed[]>([])
  const [isLocked, setIsLocked] = useState(false)
  const [filteredTerminals, setFilteredTerminals] = useState<TerminalProps[]>([])
  const [restoredItems, setRestoredItems] = useState<string[]>([])

  // Edit & Mapping State
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(false)

  const [mappedDevices, setMappedDevices] = useState<Record<string, DeviceProps | null>>({})

  // Temp State untuk Dialog
  const [tempFormDevice, setTempFormDevice] = useState<DeviceProps | null>(null)
  const [tempDirection, setTempDirection] = useState<number>(0)

  useEffect(() => {
    fetchDetail()
  }, [])

  useEffect(() => {
    if (selectedTerminal && parsedSyncItems.length > 0) {
      const newMapping: Record<string, DeviceProps> = {};

      parsedSyncItems.forEach((sourceItem, idx) => {
        const itemId = `src-${idx}`;

        const match = selectedTerminal.t_m_device.find((targetDev) =>
          targetDev.c_serial_number === sourceItem.sub_serial_number
        );

        if (match) {
          newMapping[itemId] = match;
        }
      });
      setMappedDevices(newMapping);
    } else {
      setMappedDevices({});
    }
  }, [selectedTerminal, parsedSyncItems]);

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

      if (rowData.terminal_id) {
        targetTerminal = mockResponse.t_m_terminal.find((t) => t.i_id === rowData.terminal_id);
      }

      if (!targetTerminal && rowData.c_terminal_sn) {
        targetTerminal = mockResponse.t_m_terminal.find((t) => t.c_terminal_sn === rowData.c_terminal_sn);
      }

      if (targetTerminal) {
        setSelectedTerminal(targetTerminal);

        if (rowData.item_serial_code === targetTerminal.c_terminal_sn) {
          setIsLocked(true);
        } else {
          setIsLocked(false);
        }
      } else {
        setSelectedTerminal(null);
        setIsLocked(false);
      }

      // Auto map useEffect akan berjalan setelah state ini update
      setLoading(false)
    }, 800)
  }

  const handleToggleRestore = (deviceId: string) => {
    setRestoredItems(prev => prev.includes(deviceId) ? prev.filter(id => id !== deviceId) : [...prev, deviceId])
  }

  // --- SUBMIT LOGIC ---
  const handleSyncSubmit = () => {
    if (!selectedTerminal) return toast.error("Please select a target terminal first!")

    // 1. VALIDASI: Cek apakah semua Source Items sudah di-mapping
    let isAllMapped = true;

    parsedSyncItems.forEach((_, idx) => {
      if (!mappedDevices[`src-${idx}`]) {
        isAllMapped = false;
      }
    });

    if (!isAllMapped) {
      return toast.error("Please map ALL Source Items before syncing!");
    }

    const devicesPayload: any[] = [];
    const usedTargetIds = new Set<string>(); // Untuk mencatat ID target yang sudah dipakai source

    // 2. Masukkan Source Mappings ke Payload
    parsedSyncItems.forEach((_, idx) => {
      const itemId = `src-${idx}`;
      const mapping = mappedDevices[itemId];

      if (mapping) {
        devicesPayload.push({
          c_device: mapping.c_device,
          c_serial_number: mapping.c_serial_number,
          c_device_type: mapping.c_device_type,
          c_direction: mapping.c_direction ?? 0,
          n_device_name: mapping.n_device_name
        });

        // Tandai ID ini sudah terpakai, agar tidak double di bagian unmatched
        usedTargetIds.add(mapping.i_id);
      }
    });

    // 3. Masukkan Unmatched Devices (Target) yang DI-RESTORE (dicentang +)
    selectedTerminal.t_m_device.forEach((targetDev) => {
      // Hanya proses jika belum dipakai di Source Mapping
      if (!usedTargetIds.has(targetDev.i_id)) {
        // Cek apakah user me-restore item ini
        if (restoredItems.includes(targetDev.i_id)) {

          // Cek apakah item ini pernah diedit (ada di mappedDevices dengan key ID-nya)
          const editedInfo = mappedDevices[targetDev.i_id];

          devicesPayload.push({
            c_device: targetDev.c_device,
            c_serial_number: targetDev.c_serial_number,
            c_device_type: targetDev.c_device_type,

            // Gunakan direction dari editan jika ada, atau default 0
            c_direction: editedInfo?.c_direction ?? 0,
            n_device_name: targetDev.n_device_name
          });
        }
      }
    });

    const syncData = detailData?.t_m_sync_terminal[0];

    const payload = {
      c_project: selectedTerminal.c_project || rowData.client_name || "Unknown",
      c_terminal_sn: selectedTerminal.c_terminal_sn,
      n_terminal_name: selectedTerminal.n_terminal_name,
      c_signature: syncData?.c_signature || "UNKNOWN_SIG",
      i_sync_id: syncData?.i_id || rowData.sync_id,
      c_model_code: rowData.model_code || "000000",
      c_model_name: rowData.model_name,
      c_item_serial_code: rowData.item_serial_code,
      devices: devicesPayload
    };

    console.log("=== FINAL PAYLOAD TO API ===");
    console.log(JSON.stringify(payload, null, 2));

    toast.success(`Sync Success! Check Console for JSON Payload.`);
  }

  const handleEditClick = (id: string) => {
    setEditingItemId(id)
    setEditDialogOpen(true)
    setLoadingConfig(true)

    if (id.startsWith('src-')) {
      const existingMap = mappedDevices[id];

      if (existingMap) {
        setTempFormDevice(existingMap);
        setTempDirection(existingMap.c_direction !== undefined ? existingMap.c_direction : 0);
      } else {
        setTempFormDevice(null);
        setTempDirection(0); // Default 0
      }
    } else {
      const dev = selectedTerminal?.t_m_device.find((d) => d.i_id === id);

      setTempFormDevice(dev || null);
      setTempDirection(0);
    }

    setTimeout(() => setLoadingConfig(false), 300)
  }

  const handleSaveMapping = () => {
    if (editingItemId && editingItemId.startsWith('src-')) {
      if (tempFormDevice) {
        const deviceWithDirection = {
          ...tempFormDevice,
          c_direction: tempDirection
        };

        setMappedDevices(prev => ({ ...prev, [editingItemId]: deviceWithDirection }));
      }
    }

    setEditDialogOpen(false)
    setEditingItemId(null)
    setTempFormDevice(null)
    setTempDirection(0);
  }

  const renderTargetComparison = () => {
    if (!selectedTerminal) return null

    const mergedView = parsedSyncItems.map((sourceItem, idx) => {
      const itemId = `src-${idx}`
      const mapping = mappedDevices[itemId]

      const isMapped = !!mapping;
      const isSnMatch = mapping && mapping.c_serial_number === sourceItem.sub_serial_number;

      let statusLabel = "CREATE";
      let statusColor: "warning" | "success" | "info" = "info";
      let borderColor = "border-blue-500";

      const potentialMatch = selectedTerminal.t_m_device.find(
        (d) => d.c_serial_number === sourceItem.sub_serial_number
      );

      if (isMapped) {
        if (isSnMatch) {
          statusLabel = "MATCH";
          statusColor = "success";
          borderColor = "border-green-500";
        } else {
          statusLabel = "CREATE";
          statusColor = "info";
          borderColor = "border-blue-500";
        }
      } else {
        if (potentialMatch) {
          statusLabel = "MATCH";
          statusColor = "success";
          borderColor = "border-green-500";
        } else {
          statusLabel = "CREATE";
          statusColor = "info";
          borderColor = "border-blue-500";
        }
      }

      return (
        <Card key={itemId} variant="outlined" sx={{ mb: 1, p: 2, overflow: 'visible' }} className={classnames(`mt-3 group border-2 relative ${borderColor}`)}>
          <div className="absolute -top-3 -right-1">
            <Chip label={statusLabel} color={statusColor} size="small" className="font-bold h-5 text-[10px]" />
          </div>
          <div className="flex justify-between items-start">
            <div className='w-full'>
              <Typography variant="subtitle2" className="text-md font-bold text-primary mb-3 mt-2">{sourceItem.sub_item_type}</Typography>
              <div className="flex flex-col text-xs mt-1 gap-1">
                <div className="flex justify-between"><span className="text-gray-500">Model</span><span>{sourceItem.sub_model_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SN (Source)</span><span className="font-mono font-bold">{sourceItem.sub_serial_number}</span></div>
              </div>

              {/* Tampilan "Mapped to" */}
              <div className="mt-2 p-2 border border-gray-200 rounded text-xs animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-1 mb-1 text-primary font-bold border-b border-gray-100 pb-1">
                  <i className="tabler-link text-xs"></i> Mapped to:
                </div>

                {mapping ? (

                  // 1. Jika MATCH (Auto Map) atau CREATE (Manual Map)
                  <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1">
                    <span className="text-gray-500">Device Code:</span><span className="font-mono font-medium">{mapping.c_device}</span>
                    <span className="text-gray-500">Device Name:</span><span>{mapping.n_device_name}</span>
                    <span className="text-gray-500">Direction:</span>
                    <span>
                      {mapping.c_direction === 1 ? <Chip label="IN" size="small" color="success" className='h-5 text-[10px]' /> :
                        mapping.c_direction === 2 ? <Chip label="OUT" size="small" color="error" className='h-5 text-[10px]' /> :
                          <Chip label="No Direction" size="small" className='h-5 text-[10px] bg-gray-100 text-gray-600 font-bold' />}
                    </span>

                    <span className="text-gray-500">SN (Target):</span>
                    <span className={classnames("font-mono flex items-center", {
                      "text-green-600 font-bold": isSnMatch,
                      "text-blue-400 font-bold": !isSnMatch
                    })}>
                      {mapping.c_serial_number}
                      {isSnMatch && <i className="tabler-check ml-1 text-sm" />}
                      {!isSnMatch && <i className="tabler-plus ml-1 text-sm" />}
                    </span>
                  </div>
                ) : (

                  // 2. Jika CREATE (Belum dipilih sama sekali / New)
                  <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-gray-400">
                    <span className="text-gray-500">Device Code:</span><span className="font-mono">-</span>
                    <span className="text-gray-500">Device Name:</span><span>-</span>
                    <span className="text-gray-500">Direction:</span><span>-</span>
                    <span className="text-gray-500">SN (Target):</span><span>-</span>
                  </div>
                )}
              </div>
            </div>

            <div className="absolute top-3.5 right-2 group-hover:opacity-100 transition-opacity">
              <Tooltip title="Edit Mapping">
                <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleEditClick(itemId); }} className="shadow-sm border border-gray-100 bg-white">
                  <i className="tabler-pencil text-lg" />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </Card>
      )
    })

    // --- BAGIAN 2: DELETED VIEW (Unmatched Target Items) ---
    const mappedTargetIds = Object.values(mappedDevices).filter(d => d !== null).map((d) => d!.i_id)
    const unmatchedTargetItems = selectedTerminal.t_m_device.filter((targetDev) => !mappedTargetIds.includes(targetDev.i_id))

    const targetDeletedView = unmatchedTargetItems.map((dev, idx) => {
      const isRestored = restoredItems.includes(dev.i_id)

      return (
        <div key={`del-${idx}`} className="relative mb-2 mt-2 group">
          <Card variant="outlined" sx={{ p: 1.5 }} className={classnames("transition-all duration-300", { "opacity-40 grayscale border-dashed border-gray-400": !isRestored, "border-l-4 border-l-green-500": isRestored })}>
            <div className="flex justify-between items-start">
              <div className='w-full'>
                <Typography variant="subtitle2" className="text-xs font-bold text-primary">{dev.n_device_name}</Typography>

                <div className="flex flex-col text-xs mt-1 text-gray-500 gap-1">
                  <div className="flex justify-between"><span className="text-gray-500">Code</span><span className="font-mono">{dev.c_device}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-mono font-bold">{dev.c_device_type}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">SN</span><span className="font-mono font-bold">{dev.c_serial_number}</span></div>
                </div>

                <div className="mt-2 p-2 border border-gray-200 rounded text-xs animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center gap-1 mb-1 text-primary font-bold border-b border-gray-100 pb-1">
                    <i className="tabler-link text-xs"></i> Mapped to:
                  </div>
                  <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1">
                    <span className="text-gray-500">Device Code:</span><span className="font-mono font-medium">{dev.c_device}</span>
                    <span className="text-gray-500">Device Name:</span><span>{dev.n_device_name}</span>
                    <span className="text-gray-500">SN (Target):</span><span className="font-mono font-bold">{dev.c_serial_number}</span>
                  </div>
                </div>

              </div>

              {isRestored && (
                <div className="z-20 absolute right-1">
                  <Tooltip title="Edit Device">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(dev.i_id);
                      }}
                      className="bg-white shadow-sm border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <i className="tabler-pencil text-lg" />
                    </IconButton>
                  </Tooltip>
                </div>
              )}
            </div>
          </Card>

          <div className={classnames("absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none", { "opacity-0 group-hover:opacity-100": isRestored, "opacity-100": !isRestored })}>
            <Tooltip title={isRestored ? "Undo Restore" : "Keep this item"}>
              <IconButton size="small" onClick={() => handleToggleRestore(dev.i_id)} className={classnames("shadow-md border pointer-events-auto", { "bg-white text-green-600 hover:bg-green-50": !isRestored, "bg-red-50 text-red-600 hover:bg-red-100": isRestored })}>
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
        {unmatchedTargetItems.length > 0 && (
          <Divider className="my-4">
            <Typography variant="caption" className="font-bold text-gray-500">Unmatched Devices (To Be Removed)</Typography>
          </Divider>
        )}
        {targetDeletedView}
        {mergedView.length === 0 && targetDeletedView.length === 0 && <div className="text-center p-4 border border-dashed rounded"><Typography variant="caption" color="text.secondary">No changes detected.</Typography></div>}
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center"><CircularProgress /></div>
  const syncData = detailData?.t_m_sync_terminal[0]

  if (!syncData) return null

  return (
    <Box sx={{ p: 3, borderLeft: '4px solid #1976d2' }}>
      <Typography variant="h6" className="mb-4 flex items-center gap-2"><i className="tabler-arrows-diff"></i> Data Synchronization & Mapping</Typography>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} variant="outlined" sx={{ p: 2, height: '100%' }}>
            <div className="flex items-center gap-2 mb-3"><Chip label="SOURCE" color="warning" size="small" className="font-bold" /><Typography variant="subtitle1" fontWeight="bold">Incoming Sync Data</Typography></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Serial Code:</span><span className="font-mono font-medium">{syncData.item_serial_code}</span>
                <span className="text-gray-500">Model:</span><span>{syncData.model_name}</span>
              </div>
              <Divider textAlign="left"><Typography variant="caption" color="textSecondary">INCLUDED DEVICES</Typography></Divider>
              <div className="max-h-60 overflow-y-auto pr-1">
                {parsedSyncItems.map((item, idx) => (
                  <Card key={idx} variant="outlined" sx={{ mb: 1, p: 1.5 }}>
                    <Typography variant="subtitle2" className="text-xs font-bold text-orange-500">{item.sub_item_type}</Typography>
                    <div className="flex justify-between text-xs mt-1"><span>{item.sub_model_name}</span><span className="font-mono">{item.sub_serial_number}</span></div>
                  </Card>
                ))}
              </div>
            </div>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} variant="outlined" sx={{ p: 2, height: '100%', borderColor: '#1976d2' }}>
            <div className="flex items-center gap-2 mb-3"><Chip label="TARGET" color="primary" size="small" className="font-bold" /><Typography variant="subtitle1" fontWeight="bold">Result After Sync</Typography></div>
            <div className="mb-4">
              <Autocomplete
                options={filteredTerminals}
                getOptionLabel={(o) => `${o.n_terminal_name} ${o.c_terminal_sn ? `(${o.c_terminal_sn})` : '(No SN)'}`}
                value={selectedTerminal}
                onChange={(_, v) => setSelectedTerminal(v)}
                disabled={isLocked}
                renderInput={(p) => <TextField {...p} size="small" placeholder={isLocked ? "Locked to existing SN" : "Search available terminal..."} />}
              />
            </div>
            {selectedTerminal ? <div className="animate-in fade-in slide-in-from-bottom-2 duration-300"><Divider sx={{ my: 2 }} />{renderTargetComparison()}</div> : <div className="h-40 flex items-center justify-center border-2 border-dashed rounded bg-gray-500/10"><Typography variant="body2" color="text.secondary">Select a terminal first</Typography></div>}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle className='flex justify-between items-center'>Map Sync Item to Device<IconButton onClick={() => setEditDialogOpen(false)} size='small'><i className='tabler-x' /></IconButton></DialogTitle>
        <DialogContent dividers>
          {loadingConfig ? <div className="flex justify-center p-5"><CircularProgress /></div> : (
            <div className="flex flex-col gap-4 pt-1">
              <Autocomplete
                options={selectedTerminal?.t_m_device || []}
                getOptionLabel={(o) => `${o.n_device_name} (${o.c_device})`}
                value={tempFormDevice}
                onChange={(_, v) => setTempFormDevice(v)}
                renderInput={(p) => <TextField {...p} label="Select Terminal Device" />}
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

              <TextField label="Device Type" value={tempFormDevice?.c_device_type || ''} disabled variant="filled" size='small' />
              <TextField label="Device SN" value={tempFormDevice?.c_serial_number || ''} disabled variant="filled" size='small' />
            </div>
          )}
        </DialogContent>
        <DialogActions className='pt-3'><Button onClick={() => setEditDialogOpen(false)} color="secondary">Cancel</Button><Button onClick={handleSaveMapping} variant="contained" disabled={loadingConfig}>Save</Button></DialogActions>
      </Dialog>

      <div className="mt-6 flex justify-end gap-3 border-t pt-4">
        <Button variant="outlined" color="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="primary" startIcon={<i className="tabler-check" />} disabled={!selectedTerminal} onClick={handleSyncSubmit}>Confirm Sync & Map</Button>
      </div>
    </Box>
  )
}

export default SyncDetailView
