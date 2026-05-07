'use client'

import { useEffect, useState } from 'react'

import {
  Card, Button, TextField, Typography, Grid, Box, Chip, IconButton,
  Tooltip, Divider, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, Autocomplete, CircularProgress, MenuItem, useTheme,
  Alert, createFilterOptions
} from '@mui/material'
import classnames from 'classnames'
import { toast } from 'react-toastify'
import { getSession } from 'next-auth/react'

import { ApiAxios } from '@/libs/ApiAxios'

const BASE_URL = process.env.API_MONITORING_URL;

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

export interface selectDevicesOption {
  c_device: string
  c_device_type: string
  n_device_type: string
  c_project: string
  n_number: string
  inputValue?: string
}

interface TerminalProps {
  i_id: string
  c_terminal_sn: string | null
  c_terminal_type: string
  c_project?: string | null
  c_station?: string | null
  c_terminal_01?: string
  n_terminal_name: string
  devices: DeviceProps[]
  n_station: string
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
  onClose: (refresh?: boolean) => void
  permission: string[]
}

const filter = createFilterOptions<selectDevicesOption>();

const SyncDetailView = ({ rowData, onClose, permission }: SyncDetailViewProps) => {
  const theme = useTheme()
  const [loading, setLoading] = useState(true)
  const [detailData, setDetailData] = useState<ApiResponse | null>(null)

  const [selectedTerminal, setSelectedTerminal] = useState<TerminalProps | null>(null)
  const [parsedSyncItems, setParsedSyncItems] = useState<SyncSubItem[]>([])

  const [isLocked, setIsLocked] = useState(false)
  const [terminalOptions, setTerminalOptions] = useState<TerminalProps[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  const [restoredItems, setRestoredItems] = useState<string[]>([])
  const [optionDevice, setOptionDevice] = useState<selectDevicesOption[]>([])

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [loadingMapping, setLoadingMapping] = useState(false)

  const [mappedDevices, setMappedDevices] = useState<Record<string, DeviceProps | null>>({})

  const [selectMapping, setselectMapping] = useState<SyncSubItem>()
  const [tempFormOption, setTempFormOption] = useState<selectDevicesOption | null>(null)
  const [tempDirection, setTempDirection] = useState<number>(0)

  const [addDeviceDialogOpen, setAddDeviceDialogOpen] = useState(false);
  const [loadingAddDevice, setLoadingAddDevice] = useState(false);

  const [newDeviceForm, setNewDeviceForm] = useState({
    c_device_type: '',
    n_device_type: '',
    c_device: '',
    n_number: '1'
  });

  useEffect(() => {
    fetchDetail()
    fecthOptionDevice()
  }, [])

  useEffect(() => {
    if (parsedSyncItems.length > 0 && optionDevice.length > 0) {
      const newMapping: Record<string, DeviceProps> = {};

      const aliasMapping: Record<string, string> = {
        "MODULE READER": "Card Reader",
        "CONTROLLER": "MBC",
        "BARCODE SCANNER": "QR Scanner",
        "TRANSFORMER": "Trafo"
      };

      // 1. Cek apakah nama model terminal mengandung kata "gate" (case-insensitive)
      const isGateModel = (rowData.model_name || "").toLowerCase().includes("gate");

      const usedDeviceCodes = new Set<string>();

      parsedSyncItems.forEach((sourceItem, idx) => {
        const itemId = `src-${idx}`;

        const sourceItemTypeUpper = (sourceItem.sub_item_type || "").toUpperCase().trim();
        let mappedAlias = aliasMapping[sourceItemTypeUpper];

        // 2. Logic khusus: Jika MODULE READER tapi modelnya NFC, ubah aliasnya ke NFC Reader
        if (sourceItemTypeUpper === "MODULE READER" && (sourceItem.sub_model_name || "").toUpperCase().includes("NFC")) {
          mappedAlias = "NFC Reader";
        }

        // 1. Cari SEMUA kemungkinan device yang cocok
        const possibleMatches = optionDevice.filter((opt) => {
          const optNameUpper = (opt.n_device_type || "").toUpperCase().trim();

          const isMatch = (
            opt.c_device === sourceItem.sub_model_code ||
            opt.c_device_type === sourceItem.sub_item_type ||
            optNameUpper === sourceItemTypeUpper ||
            (mappedAlias && optNameUpper === mappedAlias.toUpperCase())
          );

          return isMatch && !usedDeviceCodes.has(opt.c_device);
        });

        // 2. Urutkan berdasarkan n_number secara ascending (agar 01, 1, dst terpilih lebih dulu)
        possibleMatches.sort((a, b) => {
          const numA = parseInt(a.n_number, 10) || 0;
          const numB = parseInt(b.n_number, 10) || 0;


          return numA - numB;
        });

        // 3. Ambil opsi dengan urutan pertama (paling kecil n_number-nya)
        const matchOption = possibleMatches[0];

        if (matchOption) {
          usedDeviceCodes.add(matchOption.c_device);

          let tempDir = 0; // Default direction (0 = No Direction)

          if (isGateModel) {
            const requiresDirection = ["MODULE READER", "CONTROLLER", "BARCODE SCANNER"].includes(sourceItemTypeUpper);

            if (requiresDirection) {
              const deviceCodeVal = matchOption.c_device.toLowerCase();
              const numVal = parseInt(matchOption.n_number, 10);

              if (deviceCodeVal.endsWith('01') || numVal === 1) {
                tempDir = 1; // 1 untuk 01 (IN)
              } else if (deviceCodeVal.endsWith('02') || numVal === 2) {
                tempDir = 2; // 2 untuk 02 (OUT)
              }
            }
          }

          const generatedName = `${matchOption.n_device_type} ${rowData.station_code} ${matchOption.n_number}`;

          newMapping[itemId] = {
            i_id: `generated-${idx}`,
            c_device: matchOption.c_device,
            c_device_type: matchOption.c_device_type,
            n_device_name: generatedName,
            c_serial_number: sourceItem.sub_serial_number,
            c_direction: tempDir, // Masukkan variabel direction di sini
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
  }, [parsedSyncItems, optionDevice, rowData.station_code, rowData.c_project, rowData.c_terminal_sn, rowData.model_name]);

  const fetchFreeTerminals = async (sourceSnToMatch?: string) => {
    setLoadingOptions(true);

    try {
      const session = await getSession();

      const response = await ApiAxios.get(`${BASE_URL}/terminal/get-free-terminal`, {
        headers: {
          'Authorization': `Barer ${session?.user.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: { c_project: "KCI" }
      });

      const data = response.data?.data;
      let options: TerminalProps[] = [];

      if (Array.isArray(data)) {
        options = data;
      } else if (data && typeof data === 'object') {
        options = [data];
      }

      setTerminalOptions(options);

      // --- LOGIKA AUTO SELECT BARU ---
      // Gunakan parameter yang dipassing, atau fallback ke rowData.serial_number
      const targetSn = sourceSnToMatch || rowData.serial_number;

      if (targetSn) {
        let matchedTerminal: TerminalProps | undefined;

        // 1. Cek apakah SN ada di array custom mapping
        const mappedData = CUSTOM_TERMINAL_MAPPING.find(
          (item) => item["Serial No"] === targetSn
        );

        if (mappedData) {
          // Jika ada di mapping, cari terminal di options berdasarkan n_terminal_name
          matchedTerminal = options.find(
            (opt) => opt.n_terminal_name === mappedData.nama
          );
        }

        // 2. Fallback ke logika lama jika belum ketemu
        // (misal datanya tidak ada di array custom, cari berdasarkan c_terminal_01)
        if (!matchedTerminal) {
          matchedTerminal = options.find(
            (opt) => opt.c_terminal_01 === targetSn
          );
        }

        // Jika ketemu, langsung pilih secara otomatis
        if (matchedTerminal) {
          setSelectedTerminal(matchedTerminal);
        }
      }

    } catch (error) {
      console.error("Error fetching free terminals:", error);
      toast.error("Failed to load available terminals.");
    } finally {
      setLoadingOptions(false);
    }
  };

  const fecthOptionDevice = async () => {
    try {
      const session = await getSession();

      const response = await ApiAxios.post(`${BASE_URL}/device/device-type`, { c_project: "KCI" }, {
        headers: {
          'Authorization': `Barer ${session?.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = response.data?.data || response.data;

      if (Array.isArray(data)) {
        setOptionDevice(data);
      } else {
        setOptionDevice([]);
      }
    } catch (error) {
      console.error("Error fetching option device:", error);
      toast.error("Failed to fetch device references.");
    }
  }

  const fetchDetail = async () => {
    setLoading(true)

    try {
      const payload = {
        serial_number: rowData.serial_number,
        c_project: rowData.c_project || "KCI"
      }

      const session = await getSession();

      const response = await ApiAxios.post(`${BASE_URL}/terminal/get-data-mapping-terminal-sync`, payload, {
        headers: {
          'Authorization': `Barer ${session?.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const apiRes = response.data?.data;

      if (!apiRes) throw new Error("Data not found");

      const formattedData: ApiResponse = {
        terminal: apiRes.terminal,
        sync_terminal: apiRes.sync_terminal
      }

      setDetailData(formattedData)

      if (formattedData.sync_terminal?.item) {
        try {
          const rawItem = formattedData.sync_terminal.item;
          const items = Array.isArray(rawItem) ? rawItem : JSON.parse(rawItem);

          setParsedSyncItems(items as SyncSubItem[]);
        } catch (e) {
          setParsedSyncItems([]);
        }
      }

      const existingTerminal: TerminalProps | null = formattedData.terminal;

      if (existingTerminal) {
        setSelectedTerminal(existingTerminal);
        setTerminalOptions([existingTerminal]);
        setIsLocked(true);
      } else {
        setSelectedTerminal(null);
        setIsLocked(false);

        // --- TAMBAHKAN BARIS INI ---
        // Panggil pencarian terminal bebas dan passing SN dari source untuk auto-select
        fetchFreeTerminals(formattedData.sync_terminal?.serial_number || rowData.serial_number);
      }

    } catch (error) {
      console.error("Fetch Detail Error:", error);
      toast.error("Failed to fetch terminal mapping details.");
      setDetailData(null);
    } finally {
      setLoading(false)
    }
  }

  const handleToggleRestore = (deviceId: string) => {
    setRestoredItems(prev => prev.includes(deviceId) ? prev.filter(id => id !== deviceId) : [...prev, deviceId])
  }

  const handleSyncSubmit = async () => {
    if (!selectedTerminal) return toast.error("Please select a target terminal first!")

    setLoadingMapping(true)
    let isAllMapped = true;

    parsedSyncItems.forEach((_, idx) => {
      if (!mappedDevices[`src-${idx}`]) isAllMapped = false;
    });

    if (!isAllMapped) return toast.error("Please map ALL Source Items before syncing!");

    const devicesPayload: any[] = [];

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
          c_terminal_sn: detailData?.sync_terminal?.serial_number,
          b_active: mapping.b_active,
          sub_item_type: mapping.sub_item_type,
          sub_item_code: mapping.sub_item_code,
          sub_item_serial_code: mapping.sub_item_serial_code
        });
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

    try {
      const session = await getSession();

      const response = await ApiAxios.post(`${BASE_URL}/terminal/mapping-terminal`, payload, {
        headers: {
          'Authorization': `Barer ${session?.user.accessToken}`,
          'Content-Type': 'application/json'
        },
      });

      const data = response.data;

      if (data?.status === '00') {
        toast.success(data?.message || "Terminal synchronization successful!");
        onClose(true);
        setNewDeviceForm({
          c_device_type: '',
          n_device_type: '',
          c_device: '',
          n_number: '1'
        })
      } else {
        toast.error(data?.message?.eng || "Failed to synchronize terminal.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to synchronize terminal.");
    } finally {
      setLoadingMapping(false)
    }
  }

  const handleEditClick = (id: string, sub_serial_number: string | null) => {
    setEditingItemId(id)
    setEditDialogOpen(true)
    setLoadingConfig(true)

    const existingMap = mappedDevices[id];

    setselectMapping(parsedSyncItems.find(item => item.sub_serial_number === sub_serial_number));

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
      const deviceRaw = selectedTerminal?.devices?.find(d => d.i_id === id);

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

  const handleSaveMapping = () => {
    if (!editingItemId) return;

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
      const originalDev = selectedTerminal?.devices?.find(d => d.i_id === editingItemId);
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

  const handleCreateNewDevice = async () => {
    setLoadingAddDevice(true);

    try {
      const payload = {
        ...newDeviceForm,
        c_project: rowData.c_project || "KCI",
      };


      const session = await getSession();

      const response = await ApiAxios.post(`${BASE_URL}/device/create-device-type`, payload, {
        headers: {
          'Authorization': `Barer ${session?.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        toast.success("Successfully added a new Device Type!");
        await fecthOptionDevice();
        setTempFormOption(payload);
        setAddDeviceDialogOpen(false);
      } else {
        toast.error("Failed to add a new Device Type.");
      }
    } catch (error: any) {
      console.error("Create device type error:", error);
      toast.error(error?.response?.data?.message || "Failed to create device type.");
    } finally {
      setLoadingAddDevice(false);
    }
  }

  // Filter mapped device options to prevent duplicating mappings
  const mappedDeviceCodes = Object.entries(mappedDevices)
    .filter(([key, val]) => key !== editingItemId && val !== null)
    .map(([_, val]) => val!.c_device);

  const availableOptions = optionDevice.filter(
    opt => !mappedDeviceCodes.includes(opt.c_device)
  );

  const renderTargetComparison = () => {
    if (!selectedTerminal) return null

    const mergedView = parsedSyncItems.map((sourceItem, idx) => {
      const itemId = `src-${idx}`
      const mapping = mappedDevices[itemId]
      const isMapped = !!mapping;

      let statusLabel = "UNMAPPED";
      let statusColor: "success" | "info" | "warning" = "warning";
      let borderColor = theme.palette.mode === 'dark' ? 'rgba(255, 167, 38, 0.5)' : '#fdba74';

      if (isMapped) {
        const isExactMatch = selectedTerminal.devices?.some(
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
                <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleEditClick(itemId, sourceItem.sub_serial_number); }} sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
                  <i className="tabler-pencil text-lg" />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </Card>
      )
    })

    const targetDeletedView = selectedTerminal.devices?.map((dev, idx) => {
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
                <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleEditClick(dev.i_id, dev.sub_item_serial_code); }} sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
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
        {selectedTerminal.devices?.length > 0 && <Divider className="my-4"><Typography variant="caption" className="font-bold" color="text.secondary">Unmatched Devices</Typography></Divider>}
        {targetDeletedView}
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center"><CircularProgress /></div>

  const syncData = detailData?.sync_terminal;

  if (!syncData) return (<Box sx={{ p: 4, textAlign: 'center' }}><Alert severity="error">Data not found.</Alert><Button onClick={() => onClose(false)} sx={{ mt: 2 }}>Close</Button></Box>)

  return (
    <Box sx={{ p: 3, borderLeft: '4px solid', borderColor: 'primary.main', bgcolor: 'background.default' }}>
      <Typography variant="h6" className="mb-4 flex items-center gap-2"><i className="tabler-arrows-diff"></i> Data Synchronization & Mapping</Typography>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} variant="outlined" sx={{ p: 2, height: '100%', borderColor: 'warning.main', bgcolor: 'background.paper' }}>
            <div className="flex items-center gap-2 mb-3"><Chip label="SOURCE" color="warning" size="small" className="font-bold" /><Typography variant="subtitle1" fontWeight="bold">Incoming Sync Data</Typography></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Typography variant="caption" color="text.secondary">Serial No:</Typography><span className="font-mono font-bold text-primary">{syncData.serial_number}</span>
                <Typography variant="caption" color="text.secondary">Item Serial:</Typography><span className="font-mono text-xs">{syncData.item_serial_code}</span>
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
                getOptionKey={(o) => o.i_id}
                getOptionLabel={(o) => `${o.n_terminal_name} ${o.n_station ?? ''} ${o.c_terminal_sn ? `(${o.c_terminal_sn})` : ''}`}
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
                    label={isLocked ? "Terminal" : "Search Target Terminal"}
                    placeholder={isLocked ? "Terminal " : "Search Free Terminal..."}
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
            {selectedTerminal ? <div className="animate-in fade-in slide-in-from-bottom-2 duration-300"><Divider sx={{ my: 2 }} />{renderTargetComparison()}</div> : <div className="h-82 flex items-center justify-center border-2 border-dashed rounded opacity-50"><Typography variant="body2" color="text.secondary">Select a terminal first</Typography></div>}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle className='flex justify-between items-center'>MAP FOR {selectMapping?.sub_item_type} ({selectMapping?.sub_serial_number})<IconButton onClick={() => setEditDialogOpen(false)} size='small'><i className='tabler-x' /></IconButton></DialogTitle>
        <DialogContent dividers>
          {loadingConfig ? <div className="flex justify-center p-5"><CircularProgress /></div> : (
            <div className="flex flex-col gap-4 pt-1">
              <Autocomplete
                options={availableOptions}
                value={tempFormOption}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  if (option.inputValue) return option.inputValue;

                  return option.n_device_type || '';
                }}
                filterOptions={(options, params) => {
                  const filtered = filter(options, params);
                  const { inputValue } = params;
                  const isExisting = options.some((option) => inputValue.toLowerCase() === option.n_device_type.toLowerCase());

                  if (inputValue !== '' && !isExisting) {
                    filtered.push({
                      inputValue,
                      n_device_type: `Add "${inputValue}"`,
                      c_device: `NEW-${inputValue}`,
                      c_device_type: '',
                      c_project: 'KCI',
                      n_number: ''
                    });
                  }

                  return filtered;
                }}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string') {
                    setNewDeviceForm(prev => ({ ...prev, n_device_type: newValue }));
                    setAddDeviceDialogOpen(true);
                  } else if (newValue && newValue.inputValue) {
                    setNewDeviceForm(prev => ({ ...prev, n_device_type: newValue.inputValue || '' }));
                    setAddDeviceDialogOpen(true);
                  } else {
                    setTempFormOption(newValue);
                  }
                }}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  const uniqueKey = option.inputValue ? `add-${option.inputValue}` : `opt-${option.c_device}`;

                  return (
                    <li key={uniqueKey} {...optionProps} className={`${optionProps.className} flex items-center gap-2`}>
                      {option.inputValue ? (
                        <>
                          <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary">
                            <i className="tabler-plus text-sm font-bold" />
                          </div>
                          <Typography color="primary" fontWeight="bold" variant="body2">
                            Add &quot;{option.inputValue}&quot;
                          </Typography>
                        </>
                      ) : (
                        <div className="flex flex-col w-full">
                          <Typography variant="body2">{option.n_device_type}</Typography>
                          <Typography variant="caption" color="text.secondary" className="font-mono">
                            {option.c_device}
                          </Typography>
                        </div>
                      )}
                    </li>
                  );
                }} renderInput={(params) => {
                  const isSelected = tempFormOption && !tempFormOption.inputValue && tempFormOption.c_device;

                  return (
                    <TextField
                      {...params}
                      label="Select Device Definition"
                      placeholder="Select Device Definition..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            {!isSelected && (
                              <div className="flex items-center justify-center w-8 h-8 ml-1 text-gray-400">
                                <i className="tabler-search text-lg" />
                              </div>
                            )}

                            {params.InputProps.startAdornment}

                            {isSelected && (
                              <div className="absolute left-[14px] top-1/2 -translate-y-1/2 flex flex-col pointer-events-none z-10 w-[calc(100%-60px)]">
                                <Typography variant="body2" className="truncate leading-tight">
                                  {tempFormOption.n_device_type}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" className="font-mono leading-none truncate">
                                  {tempFormOption.c_device}
                                </Typography>
                              </div>
                            )}
                          </>
                        ),
                      }}
                      sx={{
                        '& .MuiAutocomplete-input': {
                          paddingLeft: !isSelected ? '4px !important' : 'inherit',
                          color: isSelected ? 'transparent' : 'inherit',
                          '&::selection': {
                            backgroundColor: isSelected ? 'transparent' : 'auto',
                            color: isSelected ? 'transparent' : 'auto',
                          }
                        }
                      }}
                    />
                  );
                }}
                isOptionEqualToValue={(option, value) => option.c_device === value.c_device}

              />
              <TextField select label="Direction" value={tempDirection} onChange={(e) => setTempDirection(Number(e.target.value))} size="small" variant="outlined">
                <MenuItem value={0}>No Direction</MenuItem>
                <MenuItem value={1}>IN</MenuItem>
                <MenuItem value={2}>OUT</MenuItem>
              </TextField>

              <div className="flex gap-3 w-full">
                <TextField label="Device Type" value={tempFormOption?.c_device_type || ''} disabled variant="filled" size='small' fullWidth />
                <TextField label="Device Code" value={tempFormOption?.c_device || ''} disabled variant="filled" size='small' fullWidth />
              </div>

              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover', borderLeft: '4px solid', borderColor: 'info.main' }}>
                <Typography variant="caption" color="text.secondary" component="div" className="flex items-center gap-1"><i className="tabler-info-circle"></i> Device Name Preview:</Typography>
                <Typography variant="body2" fontWeight="bold">{tempFormOption?.n_device_type ? `${tempFormOption.n_device_type} ${rowData.station_code} ${tempFormOption.n_number || '00'}` : 'Select definition to generate name'}</Typography>
              </Paper>
            </div>
          )}
        </DialogContent>
        <DialogActions className='pt-3'><Button onClick={() => setEditDialogOpen(false)} color="secondary">Cancel</Button><Button onClick={handleSaveMapping} variant="contained" disabled={loadingConfig}>Save Mapping</Button></DialogActions>
      </Dialog>

      <Dialog open={addDeviceDialogOpen} onClose={() => setAddDeviceDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add New Device Type</DialogTitle>
        <DialogContent dividers className="flex flex-col gap-5 pt-5">
          <TextField
            label="Name"
            value={newDeviceForm.n_device_type}
            onChange={(e) => setNewDeviceForm({ ...newDeviceForm, n_device_type: e.target.value })}
            size="small"
            fullWidth
          />
          <TextField
            label="Type Code"
            placeholder="e.g., CR"
            value={newDeviceForm.c_device_type.toUpperCase()}
            onChange={(e) => setNewDeviceForm({ ...newDeviceForm, c_device_type: e.target.value.toUpperCase() })}
            size="small"
            fullWidth
          />
          <TextField
            label="Device Code"
            placeholder="e.g., card_reader_01"
            value={newDeviceForm.c_device.toLowerCase()}
            onChange={(e) => setNewDeviceForm({ ...newDeviceForm, c_device: e.target.value.toLowerCase() })}
            size="small"
            fullWidth
          />
          <TextField
            label="Number"
            placeholder="e.g., 1"
            value={newDeviceForm.n_number}
            onChange={(e) => setNewDeviceForm({ ...newDeviceForm, n_number: e.target.value })}
            size="small"
            type="number"
            fullWidth
          />
        </DialogContent>
        <DialogActions className='mt-5'>
          <Button onClick={() => setAddDeviceDialogOpen(false)} color="secondary">Cancel</Button>
          <Button variant="contained" onClick={handleCreateNewDevice} disabled={loadingAddDevice}>
            {loadingAddDevice ? <CircularProgress size={20} color="inherit" /> : 'Save Device Type'}
          </Button>
        </DialogActions>
      </Dialog>

      <div className="mt-6 flex justify-end gap-3 border-t pt-4">
        <Button variant="outlined" color="secondary" onClick={() => onClose(false)}>Cancel</Button>
        {permission?.includes('create') && <Button variant="contained" color="primary" startIcon={<i className="tabler-check" />} disabled={!selectedTerminal} onClick={handleSyncSubmit}>Confirm Sync & Map</Button>}
      </div>
    </Box>
  )
}

export default SyncDetailView

export const CUSTOM_TERMINAL_MAPPING = [
  { "Serial No": "309-142", "nama": "GATE 16 POC" },
  { "Serial No": "594-077", "nama": "GATE 01 AC" },
  { "Serial No": "577-077", "nama": "GATE 02 AC" },
  { "Serial No": "601-077", "nama": "GATE 03 AC" },
  { "Serial No": "623-200", "nama": "GATE 01 AK" },
  { "Serial No": "671-200", "nama": "GATE 02 AK" },
  { "Serial No": "614-200", "nama": "GATE 03 AK" },
  { "Serial No": "679-200", "nama": "GATE 04 AK" },
  { "Serial No": "267-142", "nama": "GATE 01 BPR" },
  { "Serial No": "268-142", "nama": "GATE 02 BPR" },
  { "Serial No": "269-142", "nama": "GATE 03 BPR" },
  { "Serial No": "270-142", "nama": "GATE 04 BPR" },
  { "Serial No": "638-200", "nama": "GATE 05 BPR" },
  { "Serial No": "639-200", "nama": "GATE 06 BPR" },
  { "Serial No": "664-200", "nama": "GATE 07 BPR" },
  { "Serial No": "744-200", "nama": "GATE 08 BPR" },
  { "Serial No": "692-200", "nama": "GATE 09 BPR" },
  { "Serial No": "871-031", "nama": "GATE 01 BKS" },
  { "Serial No": "869-031", "nama": "GATE 02 BKS" },
  { "Serial No": "864-031", "nama": "GATE 03 BKS" },
  { "Serial No": "860-031", "nama": "GATE 04 BKS" },
  { "Serial No": "859-031", "nama": "GATE 05 BKS" },
  { "Serial No": "857-031", "nama": "GATE 06 BKS" },
  { "Serial No": "856-031", "nama": "GATE 07 BKS" },
  { "Serial No": "850-031", "nama": "GATE 08 BKS" },
  { "Serial No": "849-031", "nama": "GATE 09 BKS" },
  { "Serial No": "848-031", "nama": "GATE 10 BKS" },
  { "Serial No": "847-031", "nama": "GATE 11 BKS" },
  { "Serial No": "841-031", "nama": "GATE 12 BKS" },
  { "Serial No": "843-031", "nama": "GATE 13 BKS" },
  { "Serial No": "845-031", "nama": "GATE 14 BKS" },
  { "Serial No": "846-031", "nama": "GATE 15 BKS" },
  { "Serial No": "852-031", "nama": "GATE 16 BKS" },
  { "Serial No": "853-031", "nama": "GATE 17 BKS" },
  { "Serial No": "854-031", "nama": "GATE 18 BKS" },
  { "Serial No": "858-031", "nama": "GATE 19 BKS" },
  { "Serial No": "751-200", "nama": "GATE 01 BKT" },
  { "Serial No": "768-200", "nama": "GATE 02 BKT" },
  { "Serial No": "711-200", "nama": "GATE 03 BKT" },
  { "Serial No": "717-200", "nama": "GATE 04 BKT" },
  { "Serial No": "723-200", "nama": "GATE 05 BKT" },
  { "Serial No": "709-200", "nama": "GATE 06 BKT" },
  { "Serial No": "757-200", "nama": "GATE 07 BKT" },
  { "Serial No": "754-200", "nama": "GATE 08 BKT" },
  { "Serial No": "715-200", "nama": "GATE 09 BKT" },
  { "Serial No": "001-197", "nama": "GATE 01 BOO" },
  { "Serial No": "002-197", "nama": "GATE 02 BOO" },
  { "Serial No": "003-197", "nama": "GATE 03 BOO" },
  { "Serial No": "004-197", "nama": "GATE 04 BOO" },
  { "Serial No": "005-197", "nama": "GATE 05 BOO" },
  { "Serial No": "006-197", "nama": "GATE 06 BOO" },
  { "Serial No": "198-142", "nama": "GATE 07 BOO" },
  { "Serial No": "199-142", "nama": "GATE 08 BOO" },
  { "Serial No": "200-142", "nama": "GATE 09 BOO" },
  { "Serial No": "201-142", "nama": "GATE 10 BOO" },
  { "Serial No": "202-142", "nama": "GATE 11 BOO" },
  { "Serial No": "203-142", "nama": "GATE 12 BOO" },
  { "Serial No": "204-142", "nama": "GATE 13 BOO" },
  { "Serial No": "007-197", "nama": "GATE 14 BOO" },
  { "Serial No": "008-197", "nama": "GATE 15 BOO" },
  { "Serial No": "009-197", "nama": "GATE 16 BOO" },
  { "Serial No": "010-197", "nama": "GATE 17 BOO" },
  { "Serial No": "567-077", "nama": "GATE 18 BOO" },
  { "Serial No": "595-077", "nama": "GATE 19 BOO" },
  { "Serial No": "624-200", "nama": "GATE 20 BOO" },
  { "Serial No": "750-200", "nama": "GATE 21 BOO" },
  { "Serial No": "580-077", "nama": "GATE 22 BOO" },
  { "Serial No": "234-142", "nama": "GATE 23 BOO" },
  { "Serial No": "243-142", "nama": "GATE 24 BOO" },
  { "Serial No": "239-142", "nama": "GATE 25 BOO" },
  { "Serial No": "241-142", "nama": "GATE 26 BOO" },
  { "Serial No": "240-142", "nama": "GATE 27 BOO" },
  { "Serial No": "228-142", "nama": "GATE 28 BOO" },
  { "Serial No": "233-142", "nama": "GATE 29 BOO" },
  { "Serial No": "232-142", "nama": "GATE 30 BOO" },
  { "Serial No": "231-142", "nama": "GATE 31 BOO" },
  { "Serial No": "593-077", "nama": "GATE 32 BOO" },
  { "Serial No": "382-050", "nama": "GATE 33 BOO" },
  { "Serial No": "178-197", "nama": "GATE 34 BOO" },
  { "Serial No": "1030-097", "nama": "GATE 35 BOO" },
  { "Serial No": "012-197", "nama": "GATE 03 BJD" },
  { "Serial No": "013-197", "nama": "GATE 05 BJD" },
  { "Serial No": "213-142", "nama": "GATE 07 BJD" },
  { "Serial No": "214-142", "nama": "GATE 08 BJD" },
  { "Serial No": "215-142", "nama": "GATE 09 BJD" },
  { "Serial No": "216-142", "nama": "GATE 10 BJD" },
  { "Serial No": "513-23.2", "nama": "GATE 11 BJD" },
  { "Serial No": "343-050", "nama": "GATE 12 BJD" },
  { "Serial No": "344-050", "nama": "GATE 13 BJD" },
  { "Serial No": "345-050", "nama": "GATE 14 BJD" },
  { "Serial No": "393-100", "nama": "GATE 15 BJD" },
  { "Serial No": "931-036", "nama": "GATE 16 BJD" },
  { "Serial No": "953-036", "nama": "GATE 17 BJD" },
  { "Serial No": "947-036", "nama": "GATE 18 BJD" },
  { "Serial No": "946-036", "nama": "GATE 19 BJD" },
  { "Serial No": "945-036", "nama": "GATE 20 BJD" },
  { "Serial No": "921-036", "nama": "GATE 21 BJD" },
  { "Serial No": "282-142", "nama": "GATE 01 BOI" },
  { "Serial No": "283-142", "nama": "GATE 02 BOI" },
  { "Serial No": "284-142", "nama": "GATE 03 BOI" },
  { "Serial No": "285-142", "nama": "GATE 04 BOI" },
  { "Serial No": "837-028", "nama": "GATE 01 BBN" },
  { "Serial No": "160-197", "nama": "GATE 02 BBN" },
  { "Serial No": "788-200", "nama": "GATE 01 BUA" },
  { "Serial No": "779-200", "nama": "GATE 02 BUA" },
  { "Serial No": "801-200", "nama": "GATE 03 BUA" },
  { "Serial No": "741-200", "nama": "GATE 04 BUA" },
  { "Serial No": "791-200", "nama": "GATE 05 BUA" },
  { "Serial No": "737-200", "nama": "GATE 06 BUA" },
  { "Serial No": "662-200", "nama": "GATE 07 BUA" },
  { "Serial No": "670-200", "nama": "GATE 08 BUA" },
  { "Serial No": "661-200", "nama": "GATE 09 BUA" },
  { "Serial No": "620-200", "nama": "GATE 01 CUK" },
  { "Serial No": "621-200", "nama": "GATE 02 CUK" },
  { "Serial No": "655-200", "nama": "GATE 03 CUK" },
  { "Serial No": "676-200", "nama": "GATE 04 CUK" },
  { "Serial No": "678-200", "nama": "GATE 05 CUK" },
  { "Serial No": "701-200", "nama": "GATE 06 CUK" },
  { "Serial No": "734-200", "nama": "GATE 07 CUK" },
  { "Serial No": "776-200", "nama": "GATE 08 CUK" },
  { "Serial No": "795-200", "nama": "GATE 09 CUK" },
  { "Serial No": "880-044", "nama": "GATE 01 CT" },
  { "Serial No": "884-044", "nama": "GATE 02 CT" },
  { "Serial No": "079-197", "nama": "GATE 01 CW" },
  { "Serial No": "080-197", "nama": "GATE 02 CW" },
  { "Serial No": "357-050", "nama": "GATE 03 CW" },
  { "Serial No": "358-050", "nama": "GATE 04 CW" },
  { "Serial No": "416-100", "nama": "GATE 05 CW" },
  { "Serial No": "417-100", "nama": "GATE 06 CW" },
  { "Serial No": "598-077", "nama": "GATE 07 CW" },
  { "Serial No": "585-077", "nama": "GATE 08 CW" },
  { "Serial No": "081-197", "nama": "GATE 09 CW" },
  { "Serial No": "082-197", "nama": "GATE 10 CW" },
  { "Serial No": "418-100", "nama": "GATE 11 CW" },
  { "Serial No": "956-036", "nama": "GATE 12 CW" },
  { "Serial No": "955-036", "nama": "GATE 13 CW" },
  { "Serial No": "825-028", "nama": "GATE 01 CE" },
  { "Serial No": "162-197", "nama": "GATE 02 CE" },
  { "Serial No": "069-197", "nama": "GATE 01 CBN" },
  { "Serial No": "347-050", "nama": "GATE 02 CBN" },
  { "Serial No": "348-050", "nama": "GATE 03 CBN" },
  { "Serial No": "572-077", "nama": "GATE 04 CBN" },
  { "Serial No": "806-200", "nama": "GATE 05 CBN" },
  { "Serial No": "725-200", "nama": "GATE 01 CBT" },
  { "Serial No": "766-200", "nama": "GATE 02 CBT" },
  { "Serial No": "778-200", "nama": "GATE 03 CBT" },
  { "Serial No": "767-200", "nama": "GATE 04 CBT" },
  { "Serial No": "764-200", "nama": "GATE 05 CBT" },
  { "Serial No": "1027-097", "nama": "GATE 06 CBT" },
  { "Serial No": "765-200", "nama": "GATE 08 CBT" },
  { "Serial No": "334-142", "nama": "GATE 01 CCY" },
  { "Serial No": "335-142", "nama": "GATE 02 CCY" },
  { "Serial No": "471-100", "nama": "GATE 03 CCY" },
  { "Serial No": "727-200", "nama": "GATE 01 CKR" },
  { "Serial No": "736-200", "nama": "GATE 02 CKR" },
  { "Serial No": "695-200", "nama": "GATE 03 CKR" },
  { "Serial No": "743-200", "nama": "GATE 04 CKR" },
  { "Serial No": "735-200", "nama": "GATE 05 CKR" },
  { "Serial No": "732-200", "nama": "GATE 06 CKR" },
  { "Serial No": "749-200", "nama": "GATE 07 CKR" },
  { "Serial No": "724-200", "nama": "GATE 08 CKR" },
  { "Serial No": "733-200", "nama": "GATE 09 CKR" },
  { "Serial No": "905-044", "nama": "GATE 10 CKR" },
  { "Serial No": "888-044", "nama": "GATE 11 CKR" },
  { "Serial No": "882-044", "nama": "GATE 12 CKR" },
  { "Serial No": "879-044", "nama": "GATE 13 CKR" },
  { "Serial No": "900-044", "nama": "GATE 01 CKL" },
  { "Serial No": "893-044", "nama": "GATE 02 CKL" },
  { "Serial No": "427-100", "nama": "GATE 01 CKI" },
  { "Serial No": "095-197", "nama": "GATE 02 CKI" },
  { "Serial No": "096-197", "nama": "GATE 03 CKI" },
  { "Serial No": "097-197", "nama": "GATE 04 CKI" },
  { "Serial No": "098-197", "nama": "GATE 05 CKI" },
  { "Serial No": "099-197", "nama": "GATE 06 CKI" },
  { "Serial No": "100-197", "nama": "GATE 07 CKI" },
  { "Serial No": "101-197", "nama": "GATE 08 CKI" },
  { "Serial No": "102-197", "nama": "GATE 09 CKI" },
  { "Serial No": "612-077", "nama": "GATE 10 CKI" },
  { "Serial No": "586-077", "nama": "GATE 11 CKI" },
  { "Serial No": "696-200", "nama": "GATE 12 CKI" },
  { "Serial No": "698-200", "nama": "GATE 13 CKI" },
  { "Serial No": "699-200", "nama": "GATE 14 CKI" },
  { "Serial No": "1035-097", "nama": "GATE 15 CKI" },
  { "Serial No": "511-23.1", "nama": "GATE 02 CKY" },
  { "Serial No": "512-23.1", "nama": "GATE 03 CKY" },
  { "Serial No": "576-077", "nama": "GATE 04 CKY" },
  { "Serial No": "468-100", "nama": "GATE 05 CKY" },
  { "Serial No": "011-197", "nama": "GATE 01 CLT" },
  { "Serial No": "205-142", "nama": "GATE 02 CLT" },
  { "Serial No": "206-142", "nama": "GATE 03 CLT" },
  { "Serial No": "207-142", "nama": "GATE 04 CLT" },
  { "Serial No": "208-142", "nama": "GATE 05 CLT" },
  { "Serial No": "209-142", "nama": "GATE 06 CLT" },
  { "Serial No": "390-100", "nama": "GATE 07 CLT" },
  { "Serial No": "391-100", "nama": "GATE 08 CLT" },
  { "Serial No": "392-100", "nama": "GATE 09 CLT" },
  { "Serial No": "340-050", "nama": "GATE 10 CLT" },
  { "Serial No": "341-050", "nama": "GATE 11 CLT" },
  { "Serial No": "607-077", "nama": "GATE 12 CLT" },
  { "Serial No": "693-200", "nama": "GATE 13 CLT" },
  { "Serial No": "907-044", "nama": "GATE 01 CLG" },
  { "Serial No": "876-044", "nama": "GATE 02 CLG" },
  { "Serial No": "899-044", "nama": "GATE 03 CLG" },
  { "Serial No": "476-100", "nama": "GATE 01 CJT" },
  { "Serial No": "477-100", "nama": "GATE 02 CJT" },
  { "Serial No": "478-100", "nama": "GATE 03 CJT" },
  { "Serial No": "582-077", "nama": "GATE 04 CJT" },
  { "Serial No": "812-200", "nama": "GATE 01 CSK" },
  { "Serial No": "666-200", "nama": "GATE 02 CSK" },
  { "Serial No": "629-200", "nama": "GATE 03 CSK" },
  { "Serial No": "739-200", "nama": "GATE 04 CSK" },
  { "Serial No": "668-200", "nama": "GATE 05 CSK" },
  { "Serial No": "688-200", "nama": "GATE 06 CSK" },
  { "Serial No": "653-200", "nama": "GATE 07 CSK" },
  { "Serial No": "706-200", "nama": "GATE 08 CSK" },
  { "Serial No": "704-200", "nama": "GATE 09 CSK" },
  { "Serial No": "514-23.2", "nama": "GATE 01 CTA" },
  { "Serial No": "014-197", "nama": "GATE 02 CTA" },
  { "Serial No": "015-197", "nama": "GATE 03 CTA" },
  { "Serial No": "016-197", "nama": "GATE 04 CTA" },
  { "Serial No": "017-197", "nama": "GATE 05 CTA" },
  { "Serial No": "018-197", "nama": "GATE 06 CTA" },
  { "Serial No": "019-197", "nama": "GATE 07 CTA" },
  { "Serial No": "020-197", "nama": "GATE 08 CTA" },
  { "Serial No": "021-197", "nama": "GATE 09 CTA" },
  { "Serial No": "346-050", "nama": "GATE 10 CTA" },
  { "Serial No": "394-100", "nama": "GATE 11 CTA" },
  { "Serial No": "395-100", "nama": "GATE 12 CTA" },
  { "Serial No": "396-100", "nama": "GATE 13 CTA" },
  { "Serial No": "397-100", "nama": "GATE 14 CTA" },
  { "Serial No": "597-077", "nama": "GATE 15 CTA" },
  { "Serial No": "568-077", "nama": "GATE 16 CTA" },
  { "Serial No": "672-200", "nama": "GATE 02 CTR" },
  { "Serial No": "680-200", "nama": "GATE 03 CTR" },
  { "Serial No": "622-200", "nama": "GATE 04 CTR" },
  { "Serial No": "633-200", "nama": "GATE 05 CTR" },
  { "Serial No": "615-200", "nama": "GATE 06 CTR" },
  { "Serial No": "746-200", "nama": "GATE 07 CTR" },
  { "Serial No": "479-100", "nama": "GATE 01 DAR" },
  { "Serial No": "480-100", "nama": "GATE 02 DAR" },
  { "Serial No": "481-100", "nama": "GATE 03 DAR" },
  { "Serial No": "756-200", "nama": "GATE 04 DAR" },
  { "Serial No": "815-028", "nama": "GATE 01 DL" },
  { "Serial No": "163-197", "nama": "GATE 02 DL" },
  { "Serial No": "398-100", "nama": "GATE 01 DP" },
  { "Serial No": "022-197", "nama": "GATE 02 DP" },
  { "Serial No": "023-197", "nama": "GATE 03 DP" },
  { "Serial No": "024-197", "nama": "GATE 04 DP" },
  { "Serial No": "025-197", "nama": "GATE 05 DP" },
  { "Serial No": "026-197", "nama": "GATE 06 DP" },
  { "Serial No": "027-197", "nama": "GATE 07 DP" },
  { "Serial No": "028-197", "nama": "GATE 08 DP" },
  { "Serial No": "029-197", "nama": "GATE 09 DP" },
  { "Serial No": "813-028", "nama": "GATE 10 DP" },
  { "Serial No": "828-028", "nama": "GATE 11 DP" },
  { "Serial No": "831-028", "nama": "GATE 12 DP" },
  { "Serial No": "832-028", "nama": "GATE 13 DP" },
  { "Serial No": "399-100", "nama": "GATE 01 DPB" },
  { "Serial No": "350-050", "nama": "GATE 02 DPB" },
  { "Serial No": "030-197", "nama": "GATE 03 DPB" },
  { "Serial No": "031-197", "nama": "GATE 04 DPB" },
  { "Serial No": "032-197", "nama": "GATE 05 DPB" },
  { "Serial No": "033-197", "nama": "GATE 06 DPB" },
  { "Serial No": "034-197", "nama": "GATE 07 DPB" },
  { "Serial No": "400-100", "nama": "GATE 08 DPB" },
  { "Serial No": "491-23.1", "nama": "GATE 09 DPB" },
  { "Serial No": "035-197", "nama": "GATE 10 DPB" },
  { "Serial No": "036-197", "nama": "GATE 11 DPB" },
  { "Serial No": "037-197", "nama": "GATE 12 DPB" },
  { "Serial No": "038-197", "nama": "GATE 13 DPB" },
  { "Serial No": "039-197", "nama": "GATE 14 DPB" },
  { "Serial No": "040-197", "nama": "GATE 15 DPB" },
  { "Serial No": "351-050", "nama": "GATE 16 DPB" },
  { "Serial No": "611-077", "nama": "GATE 17 DPB" },
  { "Serial No": "1039-097", "nama": "GATE 18 DPB" },
  { "Serial No": "355-050", "nama": "GATE 02 DRN" },
  { "Serial No": "074-197", "nama": "GATE 03 DRN" },
  { "Serial No": "075-197", "nama": "GATE 04 DRN" },
  { "Serial No": "076-197", "nama": "GATE 05 DRN" },
  { "Serial No": "077-197", "nama": "GATE 06 DRN" },
  { "Serial No": "078-197", "nama": "GATE 07 DRN" },
  { "Serial No": "356-050", "nama": "GATE 08 DRN" },
  { "Serial No": "720-200", "nama": "GATE 09 DRN" },
  { "Serial No": "770-200", "nama": "GATE 10 DRN" },
  { "Serial No": "628-200", "nama": "GATE 01 DU" },
  { "Serial No": "630-200", "nama": "GATE 02 DU" },
  { "Serial No": "642-200", "nama": "GATE 03 DU" },
  { "Serial No": "645-200", "nama": "GATE 04 DU" },
  { "Serial No": "649-200", "nama": "GATE 05 DU" },
  { "Serial No": "1048-097", "nama": "GATE 06 DU" },
  { "Serial No": "1049-097", "nama": "GATE 07 DU" },
  { "Serial No": "657-200", "nama": "GATE 08 DU" },
  { "Serial No": "690-200", "nama": "GATE 09 DU" },
  { "Serial No": "781-200", "nama": "GATE 10 DU" },
  { "Serial No": "796-200", "nama": "GATE 11 DU" },
  { "Serial No": "798-200", "nama": "GATE 12 DU" },
  { "Serial No": "648-200", "nama": "GATE 13 DU" },
  { "Serial No": "772-200", "nama": "GATE 14 DU" },
  { "Serial No": "784-200", "nama": "GATE 15 DU" },
  { "Serial No": "673-200", "nama": "GATE 16 DU" },
  { "Serial No": "851-031", "nama": "GATE 17 DU" },
  { "Serial No": "868-031", "nama": "GATE 18 DU" },
  { "Serial No": "870-031", "nama": "GATE 19 DU" },
  { "Serial No": "152-197", "nama": "GATE 01 GST" },
  { "Serial No": "151-197", "nama": "GATE 02 GST" },
  { "Serial No": "829-028", "nama": "GATE 01 GW" },
  { "Serial No": "574-077", "nama": "GATE 02 GW" },
  { "Serial No": "361-050", "nama": "GATE 01 GDD" },
  { "Serial No": "103-197", "nama": "GATE 02 GDD" },
  { "Serial No": "104-197", "nama": "GATE 03 GDD" },
  { "Serial No": "105-197", "nama": "GATE 04 GDD" },
  { "Serial No": "106-197", "nama": "GATE 05 GDD" },
  { "Serial No": "107-197", "nama": "GATE 06 GDD" },
  { "Serial No": "108-197", "nama": "GATE 07 GDD" },
  { "Serial No": "109-197", "nama": "GATE 08 GDD" },
  { "Serial No": "110-197", "nama": "GATE 09 GDD" },
  { "Serial No": "610-077", "nama": "GATE 10 GDD" },
  { "Serial No": "605-077", "nama": "GATE 11 GDD" },
  { "Serial No": "604-077", "nama": "GATE 12 GDD" },
  { "Serial No": "600-077", "nama": "GATE 13 GDD" },
  { "Serial No": "589-077", "nama": "GATE 14 GDD" },
  { "Serial No": "603-077", "nama": "GATE 15 GDD" },
  { "Serial No": "650-200", "nama": "GATE 16 GDD" },
  { "Serial No": "659-200", "nama": "GATE 17 GDD" },
  { "Serial No": "571-077", "nama": "GATE 01 GRG" },
  { "Serial No": "498-23.1", "nama": "GATE 02 GRG" },
  { "Serial No": "499-23.1", "nama": "GATE 03 GRG" },
  { "Serial No": "528-23.2", "nama": "GATE 04 GRG" },
  { "Serial No": "1036-097", "nama": "GATE 05 GRG" },
  { "Serial No": "218-142", "nama": "GATE 01 JAK" },
  { "Serial No": "219-142", "nama": "GATE 02 JAK" },
  { "Serial No": "220-142", "nama": "GATE 03 JAK" },
  { "Serial No": "221-142", "nama": "GATE 04 JAK" },
  { "Serial No": "222-142", "nama": "GATE 05 JAK" },
  { "Serial No": "223-142", "nama": "GATE 06 JAK" },
  { "Serial No": "224-142", "nama": "GATE 07 JAK" },
  { "Serial No": "225-142", "nama": "GATE 08 JAK" },
  { "Serial No": "226-142", "nama": "GATE 09 JAK" },
  { "Serial No": "227-142", "nama": "GATE 10 JAK" },
  { "Serial No": "518-23.2", "nama": "GATE 11 JAK" },
  { "Serial No": "519-23.2", "nama": "GATE 12 JAK" },
  { "Serial No": "520-23.2", "nama": "GATE 13 JAK" },
  { "Serial No": "430-100", "nama": "GATE 14 JAK" },
  { "Serial No": "431-100", "nama": "GATE 15 JAK" },
  { "Serial No": "521-23.2", "nama": "GATE 16 JAK" },
  { "Serial No": "522-23.2", "nama": "GATE 17 JAK" },
  { "Serial No": "523-23.2", "nama": "GATE 18 JAK" },
  { "Serial No": "524-23.2", "nama": "GATE 19 JAK" },
  { "Serial No": "525-23.2", "nama": "GATE 20 JAK" },
  { "Serial No": "362-050", "nama": "GATE 21 JAK" },
  { "Serial No": "363-050", "nama": "GATE 22 JAK" },
  { "Serial No": "793-200", "nama": "GATE 23 JAK" },
  { "Serial No": "785-200", "nama": "GATE 24 JAK" },
  { "Serial No": "689-200", "nama": "GATE 25 JAK" },
  { "Serial No": "1040-097", "nama": "GATE 26 JAK" },
  { "Serial No": "1022-097", "nama": "GATE 27 JAK" },
  { "Serial No": "1038-097", "nama": "GATE 28 JAK" },
  { "Serial No": "901-044", "nama": "GATE 01 JBU" },
  { "Serial No": "897-044", "nama": "GATE 02 JBU" },
  { "Serial No": "1054-010", "nama": "GATE 01 JTK" },
  { "Serial No": "1055-010", "nama": "GATE 02 JTK" },
  { "Serial No": "1056-010", "nama": "GATE 03 JTK" },
  { "Serial No": "1057-010", "nama": "GATE 04 JTK" },
  { "Serial No": "1058-010", "nama": "GATE 05 JTK" },
  { "Serial No": "1059-010", "nama": "GATE 06 JTK" },
  { "Serial No": "1060-010", "nama": "GATE 07 JTK" },
  { "Serial No": "1061-010", "nama": "GATE 08 JTK" },
  { "Serial No": "1062-010", "nama": "GATE 09 JTK" },
  { "Serial No": "1063-010", "nama": "GATE 10 JTK" },
  { "Serial No": "818-028", "nama": "GATE 01 JNG" },
  { "Serial No": "821-028", "nama": "GATE 02 JNG" },
  { "Serial No": "826-028", "nama": "GATE 03 JNG" },
  { "Serial No": "827-028", "nama": "GATE 04 JNG" },
  { "Serial No": "834-028", "nama": "GATE 05 JNG" },
  { "Serial No": "838-028", "nama": "GATE 06 JNG" },
  { "Serial No": "839-028", "nama": "GATE 07 JNG" },
  { "Serial No": "447-100", "nama": "GATE 08 JNG" },
  { "Serial No": "448-100", "nama": "GATE 09 JNG" },
  { "Serial No": "128-197", "nama": "GATE 01 JAY" },
  { "Serial No": "129-197", "nama": "GATE 02 JAY" },
  { "Serial No": "130-197", "nama": "GATE 03 JAY" },
  { "Serial No": "131-197", "nama": "GATE 04 JAY" },
  { "Serial No": "132-197", "nama": "GATE 05 JAY" },
  { "Serial No": "133-197", "nama": "GATE 06 JAY" },
  { "Serial No": "748-200", "nama": "GATE 07 JAY" },
  { "Serial No": "761-200", "nama": "GATE 08 JAY" },
  { "Serial No": "890-044", "nama": "GATE 01 JN" },
  { "Serial No": "889-044", "nama": "GATE 02 JN" },
  { "Serial No": "111-197", "nama": "GATE 01 JUA" },
  { "Serial No": "112-197", "nama": "GATE 02 JUA" },
  { "Serial No": "113-197", "nama": "GATE 03 JUA" },
  { "Serial No": "114-197", "nama": "GATE 04 JUA" },
  { "Serial No": "115-197", "nama": "GATE 05 JUA" },
  { "Serial No": "116-197", "nama": "GATE 06 JUA" },
  { "Serial No": "492-23.1", "nama": "GATE 07 JUA" },
  { "Serial No": "493-23.1", "nama": "GATE 08 JUA" },
  { "Serial No": "494-23.1", "nama": "GATE 09 JUA" },
  { "Serial No": "495-23.1", "nama": "GATE 10 JUA" },
  { "Serial No": "496-23.1", "nama": "GATE 11 JUA" },
  { "Serial No": "497-23.1", "nama": "GATE 12 JUA" },
  { "Serial No": "573-077", "nama": "GATE 13 JUA" },
  { "Serial No": "289-142", "nama": "GATE 14 JUA" },
  { "Serial No": "619-200", "nama": "GATE 15 JUA" },
  { "Serial No": "782-200", "nama": "GATE 16 JUA" },
  { "Serial No": "626-200", "nama": "GATE 17 JUA" },
  { "Serial No": "617-200", "nama": "GATE 18 JUA" },
  { "Serial No": "799-200", "nama": "GATE 19 JUA" },
  { "Serial No": "803-200", "nama": "GATE 20 JUA" },
  { "Serial No": "774-200", "nama": "GATE 21 JUA" },
  { "Serial No": "742-200", "nama": "GATE 22 JUA" },
  { "Serial No": "804-200", "nama": "GATE 23 JUA" },
  { "Serial No": "712-200", "nama": "GATE 24 JUA" },
  { "Serial No": "651-200", "nama": "GATE 25 JUA" },
  { "Serial No": "319-142", "nama": "GATE 01 JRU" },
  { "Serial No": "189-197", "nama": "GATE 02 JRU" },
  { "Serial No": "386-050", "nama": "GATE 03 JRU" },
  { "Serial No": "561-077", "nama": "GATE 04 JRU" },
  { "Serial No": "635-200", "nama": "GATE 05 JRU" },
  { "Serial No": "637-200", "nama": "GATE 06 JRU" },
  { "Serial No": "625-200", "nama": "GATE 07 JRU" },
  { "Serial No": "643-200", "nama": "GATE 08 JRU" },
  { "Serial No": "461-100", "nama": "GATE 09 JRU" },
  { "Serial No": "462-100", "nama": "GATE 10 JRU" },
  { "Serial No": "190-197", "nama": "GATE 11 JRU" },
  { "Serial No": "320-142", "nama": "GATE 12 JRU" },
  { "Serial No": "387-050", "nama": "GATE 13 JRU" },
  { "Serial No": "599-077", "nama": "GATE 01 KDS" },
  { "Serial No": "274-142", "nama": "GATE 02 KDS" },
  { "Serial No": "275-142", "nama": "GATE 03 KDS" },
  { "Serial No": "276-142", "nama": "GATE 04 KDS" },
  { "Serial No": "277-142", "nama": "GATE 05 KDS" },
  { "Serial No": "164-197", "nama": "GATE 01 KPB" },
  { "Serial No": "165-197", "nama": "GATE 02 KPB" },
  { "Serial No": "443-100", "nama": "GATE 03 KPB" },
  { "Serial No": "590-077", "nama": "GATE 04 KPB" },
  { "Serial No": "290-142", "nama": "GATE 05 KPB" },
  { "Serial No": "291-142", "nama": "GATE 06 KPB" },
  { "Serial No": "370-050", "nama": "GATE 07 KPB" },
  { "Serial No": "591-077", "nama": "GATE 08 KPB" },
  { "Serial No": "718-200", "nama": "GATE 09 KPB" },
  { "Serial No": "913-044", "nama": "GATE 01 KRA" },
  { "Serial No": "896-044", "nama": "GATE 02 KRA" },
  { "Serial No": "894-044", "nama": "GATE 03 KRA" },
  { "Serial No": "166-197", "nama": "GATE 01 KET" },
  { "Serial No": "167-197", "nama": "GATE 02 KET" },
  { "Serial No": "292-142", "nama": "GATE 03 KET" },
  { "Serial No": "293-142", "nama": "GATE 04 KET" },
  { "Serial No": "294-142", "nama": "GATE 05 KET" },
  { "Serial No": "295-142", "nama": "GATE 06 KET" },
  { "Serial No": "807-200", "nama": "GATE 07 KET" },
  { "Serial No": "183-197", "nama": "GATE 01 KBY" },
  { "Serial No": "184-197", "nama": "GATE 02 KBY" },
  { "Serial No": "185-197", "nama": "GATE 03 KBY" },
  { "Serial No": "315-142", "nama": "GATE 04 KBY" },
  { "Serial No": "316-142", "nama": "GATE 05 KBY" },
  { "Serial No": "317-142", "nama": "GATE 06 KBY" },
  { "Serial No": "456-100", "nama": "GATE 07 KBY" },
  { "Serial No": "536-077", "nama": "GATE 08 KBY" },
  { "Serial No": "537-077", "nama": "GATE 09 KBY" },
  { "Serial No": "538-077", "nama": "GATE 10 KBY" },
  { "Serial No": "539-077", "nama": "GATE 11 KBY" },
  { "Serial No": "540-077", "nama": "GATE 12 KBY" },
  { "Serial No": "541-077", "nama": "GATE 13 KBY" },
  { "Serial No": "542-077", "nama": "GATE 14 KBY" },
  { "Serial No": "783-200", "nama": "GATE 17 KBY" },
  { "Serial No": "510-23.1", "nama": "GATE 18 KBY" },
  { "Serial No": "SAR 01 KBY", "nama": "SAR 01 KBY" },
  { "Serial No": "SAR 02 KBY", "nama": "SAR 02 KBY" },
  { "Serial No": "261-142", "nama": "GATE 01 KMO" },
  { "Serial No": "262-142", "nama": "GATE 02 KMO" },
  { "Serial No": "159-197", "nama": "GATE 03 KMO" },
  { "Serial No": "441-100", "nama": "GATE 04 KMO" },
  { "Serial No": "425-100", "nama": "GATE 05 KMO" },
  { "Serial No": "928-036", "nama": "GATE 06 KMO" },
  { "Serial No": "792-200", "nama": "GATE 01 KT" },
  { "Serial No": "373-050", "nama": "GATE 02 KT" },
  { "Serial No": "819-028", "nama": "GATE 03 KT" },
  { "Serial No": "311-142", "nama": "GATE 04 KT" },
  { "Serial No": "667-200", "nama": "GATE 01 KLD" },
  { "Serial No": "674-200", "nama": "GATE 02 KLD" },
  { "Serial No": "526-23.2", "nama": "GATE 03 KLD" },
  { "Serial No": "137-197", "nama": "GATE 04 KLD" },
  { "Serial No": "136-197", "nama": "GATE 05 KLD" },
  { "Serial No": "433-100", "nama": "GATE 06 KLD" },
  { "Serial No": "434-100", "nama": "GATE 07 KLD" },
  { "Serial No": "251-142", "nama": "GATE 08 KLD" },
  { "Serial No": "250-142", "nama": "GATE 09 KLD" },
  { "Serial No": "138-197", "nama": "GATE 10 KLD" },
  { "Serial No": "135-197", "nama": "GATE 11 KLD" },
  { "Serial No": "143-197", "nama": "GATE 01 KLDB" },
  { "Serial No": "144-197", "nama": "GATE 02 KLDB" },
  { "Serial No": "253-142", "nama": "GATE 03 KLDB" },
  { "Serial No": "254-142", "nama": "GATE 04 KLDB" },
  { "Serial No": "613-200", "nama": "GATE 05 KLDB" },
  { "Serial No": "616-200", "nama": "GATE 06 KLDB" },
  { "Serial No": "632-200", "nama": "GATE 07 KLDB" },
  { "Serial No": "634-200", "nama": "GATE 08 KLDB" },
  { "Serial No": "636-200", "nama": "GATE 09 KLDB" },
  { "Serial No": "745-200", "nama": "GATE 10 KLDB" },
  { "Serial No": "366-050", "nama": "GATE 04 KMT" },
  { "Serial No": "432-100", "nama": "GATE 05 KMT" },
  { "Serial No": "245-142", "nama": "GATE 06 KMT" },
  { "Serial No": "246-142", "nama": "GATE 07 KMT" },
  { "Serial No": "247-142", "nama": "GATE 08 KMT" },
  { "Serial No": "435-100", "nama": "GATE 01 KRI" },
  { "Serial No": "436-100", "nama": "GATE 02 KRI" },
  { "Serial No": "142-197", "nama": "GATE 03 KRI" },
  { "Serial No": "141-197", "nama": "GATE 04 KRI" },
  { "Serial No": "140-197", "nama": "GATE 05 KRI" },
  { "Serial No": "139-197", "nama": "GATE 06 KRI" },
  { "Serial No": "578-077", "nama": "GATE 07 KRI" },
  { "Serial No": "252-142", "nama": "GATE 08 KRI" },
  { "Serial No": "367-050", "nama": "GATE 09 KRI" },
  { "Serial No": "368-050", "nama": "GATE 10 KRI" },
  { "Serial No": "249-142", "nama": "GATE 11 KRI" },
  { "Serial No": "369-050", "nama": "GATE 12 KRI" },
  { "Serial No": "885-044", "nama": "GATE 01 KEN" },
  { "Serial No": "877-044", "nama": "GATE 02 KEN" },
  { "Serial No": "134-197", "nama": "GATE 01 KTA" },
  { "Serial No": "260-142", "nama": "GATE 02 KTA" },
  { "Serial No": "887-044", "nama": "GATE 03 KTA" },
  { "Serial No": "883-044", "nama": "GATE 04 KTA" },
  { "Serial No": "835-028", "nama": "GATE 01 LPN" },
  { "Serial No": "161-197", "nama": "GATE 02 LPN" },
  { "Serial No": "794-200", "nama": "GATE 03 LPN" },
  { "Serial No": "840-028", "nama": "GATE 04 LPN" },
  { "Serial No": "923-036", "nama": "GATE 05 LPN" },
  { "Serial No": "352-050", "nama": "GATE 01 LNA" },
  { "Serial No": "055-197", "nama": "GATE 02 LNA" },
  { "Serial No": "056-197", "nama": "GATE 03 LNA" },
  { "Serial No": "406-100", "nama": "GATE 04 LNA" },
  { "Serial No": "407-100", "nama": "GATE 05 LNA" },
  { "Serial No": "353-050", "nama": "GATE 06 LNA" },
  { "Serial No": "057-197", "nama": "GATE 07 LNA" },
  { "Serial No": "058-197", "nama": "GATE 08 LNA" },
  { "Serial No": "564-077", "nama": "GATE 09 LNA" },
  { "Serial No": "565-077", "nama": "GATE 10 LNA" },
  { "Serial No": "824-028", "nama": "GATE 01 MGW" },
  { "Serial No": "691-200", "nama": "GATE 02 MGW" },
  { "Serial No": "805-200", "nama": "GATE 03 MGW" },
  { "Serial No": "487-100", "nama": "GATE 02 MJ" },
  { "Serial No": "488-100", "nama": "GATE 03 MJ" },
  { "Serial No": "489-100", "nama": "GATE 04 MJ" },
  { "Serial No": "543-077", "nama": "GATE 05 MJ" },
  { "Serial No": "544-077", "nama": "GATE 06 MJ" },
  { "Serial No": "546-077", "nama": "GATE 08 MJ" },
  { "Serial No": "547-077", "nama": "GATE 09 MJ" },
  { "Serial No": "548-077", "nama": "GATE 10 MJ" },
  { "Serial No": "549-077", "nama": "GATE 11 MJ" },
  { "Serial No": "550-077", "nama": "GATE 12 MJ" },
  { "Serial No": "429-100", "nama": "GATE 01 MGB" },
  { "Serial No": "122-197", "nama": "GATE 02 MGB" },
  { "Serial No": "123-197", "nama": "GATE 03 MGB" },
  { "Serial No": "124-197", "nama": "GATE 04 MGB" },
  { "Serial No": "125-197", "nama": "GATE 05 MGB" },
  { "Serial No": "126-197", "nama": "GATE 06 MGB" },
  { "Serial No": "127-197", "nama": "GATE 07 MGB" },
  { "Serial No": "584-077", "nama": "GATE 08 MGB" },
  { "Serial No": "089-197", "nama": "GATE 01 MRI" },
  { "Serial No": "090-197", "nama": "GATE 02 MRI" },
  { "Serial No": "091-197", "nama": "GATE 03 MRI" },
  { "Serial No": "092-197", "nama": "GATE 04 MRI" },
  { "Serial No": "093-197", "nama": "GATE 05 MRI" },
  { "Serial No": "094-197", "nama": "GATE 06 MRI" },
  { "Serial No": "423-100", "nama": "GATE 07 MRI" },
  { "Serial No": "424-100", "nama": "GATE 08 MRI" },
  { "Serial No": "608-077", "nama": "GATE 10 MRI" },
  { "Serial No": "842-031", "nama": "GATE 12 MRI" },
  { "Serial No": "844-031", "nama": "GATE 13 MRI" },
  { "Serial No": "862-031", "nama": "GATE 14 MRI" },
  { "Serial No": "861-031", "nama": "GATE 15 MRI" },
  { "Serial No": "866-031", "nama": "GATE 16 MRI" },
  { "Serial No": "867-031", "nama": "GATE 17 MRI" },
  { "Serial No": "954-036", "nama": "GATE 18 MRI" },
  { "Serial No": "930-036", "nama": "GATE 19 MRI" },
  { "Serial No": "927-036", "nama": "GATE 20 MRI" },
  { "Serial No": "881-044", "nama": "GATE 01 MTR" },
  { "Serial No": "875-044", "nama": "GATE 02 MTR" },
  { "Serial No": "878-044", "nama": "GATE 03 MTR" },
  { "Serial No": "892-044", "nama": "GATE 04 MTR" },
  { "Serial No": "902-044", "nama": "GATE 05 MTR" },
  { "Serial No": "903-044", "nama": "GATE 06 MTR" },
  { "Serial No": "908-044", "nama": "GATE 07 MTR" },
  { "Serial No": "909-044", "nama": "GATE 01 MER" },
  { "Serial No": "911-044", "nama": "GATE 02 MER" },
  { "Serial No": "874-044", "nama": "GATE 03 MER" },
  { "Serial No": "349-050", "nama": "GATE 01 NMO" },
  { "Serial No": "515-23.2", "nama": "GATE 02 NMO" },
  { "Serial No": "490-23.1", "nama": "GATE 03 NMO" },
  { "Serial No": "652-200", "nama": "GATE 04 NMO" },
  { "Serial No": "654-200", "nama": "GATE 05 NMO" },
  { "Serial No": "453-100", "nama": "GATE 01 PLM" },
  { "Serial No": "383-050", "nama": "GATE 02 PLM" },
  { "Serial No": "310-142", "nama": "GATE 03 PLM" },
  { "Serial No": "454-100", "nama": "GATE 04 PLM" },
  { "Serial No": "179-197", "nama": "GATE 05 PLM" },
  { "Serial No": "180-197", "nama": "GATE 06 PLM" },
  { "Serial No": "181-197", "nama": "GATE 07 PLM" },
  { "Serial No": "182-197", "nama": "GATE 08 PLM" },
  { "Serial No": "248-142", "nama": "GATE 09 PLM" },
  { "Serial No": "312-142", "nama": "GATE 10 PLM" },
  { "Serial No": "313-142", "nama": "GATE 11 PLM" },
  { "Serial No": "314-142", "nama": "GATE 12 PLM" },
  { "Serial No": "455-100", "nama": "GATE 13 PLM" },
  { "Serial No": "177-197", "nama": "GATE 15 PLM" },
  { "Serial No": "440-100", "nama": "GATE 16 PLM" },
  { "Serial No": "176-197", "nama": "GATE 17 PLM" },
  { "Serial No": "475-100", "nama": "GATE 18 PLM" },
  { "Serial No": "SAR 01 PLM", "nama": "SAR 01 PLM" },
  { "Serial No": "263-142", "nama": "GATE 01 PL" },
  { "Serial No": "470-100", "nama": "GATE 02 PL" },
  { "Serial No": "230-142", "nama": "GATE 03 PL" },
  { "Serial No": "244-142", "nama": "GATE 04 PL" },
  { "Serial No": "148-197", "nama": "GATE 05 PL" },
  { "Serial No": "336-142", "nama": "GATE 01 PRP" },
  { "Serial No": "337-142", "nama": "GATE 02 PRP" },
  { "Serial No": "338-142", "nama": "GATE 03 PRP" },
  { "Serial No": "339-142", "nama": "GATE 04 PRP" },
  { "Serial No": "472-100", "nama": "GATE 05 PRP" },
  { "Serial No": "473-100", "nama": "GATE 06 PRP" },
  { "Serial No": "551-077", "nama": "GATE 09 PRP" },
  { "Serial No": "552-077", "nama": "GATE 10 PRP" },
  { "Serial No": "553-077", "nama": "GATE 11 PRP" },
  { "Serial No": "554-077", "nama": "GATE 12 PRP" },
  { "Serial No": "555-077", "nama": "GATE 13 PRP" },
  { "Serial No": "556-077", "nama": "GATE 14 PRP" },
  { "Serial No": "063-197", "nama": "GATE 01 PSM" },
  { "Serial No": "064-197", "nama": "GATE 02 PSM" },
  { "Serial No": "065-197", "nama": "GATE 03 PSM" },
  { "Serial No": "410-100", "nama": "GATE 04 PSM" },
  { "Serial No": "411-100", "nama": "GATE 05 PSM" },
  { "Serial No": "412-100", "nama": "GATE 06 PSM" },
  { "Serial No": "413-100", "nama": "GATE 07 PSM" },
  { "Serial No": "066-197", "nama": "GATE 08 PSM" },
  { "Serial No": "067-197", "nama": "GATE 09 PSM" },
  { "Serial No": "068-197", "nama": "GATE 10 PSM" },
  { "Serial No": "581-077", "nama": "GATE 11 PSM" },
  { "Serial No": "071-197", "nama": "GATE 01 PSMB" },
  { "Serial No": "070-197", "nama": "GATE 02 PSMB" },
  { "Serial No": "414-100", "nama": "GATE 03 PSMB" },
  { "Serial No": "415-100", "nama": "GATE 04 PSMB" },
  { "Serial No": "073-197", "nama": "GATE 05 PSMB" },
  { "Serial No": "072-197", "nama": "GATE 06 PSMB" },
  { "Serial No": "153-197", "nama": "GATE 01 PSE" },
  { "Serial No": "154-197", "nama": "GATE 02 PSE" },
  { "Serial No": "155-197", "nama": "GATE 03 PSE" },
  { "Serial No": "156-197", "nama": "GATE 04 PSE" },
  { "Serial No": "SAR 01 PSE", "nama": "SAR 01 PSE" },
  { "Serial No": "286-142", "nama": "GATE 01 PSG" },
  { "Serial No": "287-142", "nama": "GATE 02 PSG" },
  { "Serial No": "288-142", "nama": "GATE 03 PSG" },
  { "Serial No": "500-23.1", "nama": "GATE 04 PSG" },
  { "Serial No": "1037-097", "nama": "GATE 05 PSG" },
  { "Serial No": "516-23.2", "nama": "GATE 01 POC" },
  { "Serial No": "401-100", "nama": "GATE 02 POC" },
  { "Serial No": "041-197", "nama": "GATE 03 POC" },
  { "Serial No": "042-197", "nama": "GATE 04 POC" },
  { "Serial No": "043-197", "nama": "GATE 05 POC" },
  { "Serial No": "044-197", "nama": "GATE 06 POC" },
  { "Serial No": "587-077", "nama": "GATE 07 POC" },
  { "Serial No": "588-077", "nama": "GATE 08 POC" },
  { "Serial No": "602-077", "nama": "GATE 09 POC" },
  { "Serial No": "562-077", "nama": "GATE 10 POC" },
  { "Serial No": "563-077", "nama": "GATE 11 POC" },
  { "Serial No": "045-197", "nama": "GATE 12 POC" },
  { "Serial No": "046-197", "nama": "GATE 13 POC" },
  { "Serial No": "047-197", "nama": "GATE 14 POC" },
  { "Serial No": "811-200", "nama": "GATE 15 POC" },
  { "Serial No": "309-142", "nama": "GATE 16 POC" },
  { "Serial No": "149-197", "nama": "GATE 01 POK" },
  { "Serial No": "150-197", "nama": "GATE 02 POK" },
  { "Serial No": "439-100", "nama": "GATE 03 POK" },
  { "Serial No": "952-036", "nama": "GATE 01 PDRG" },
  { "Serial No": "951-036", "nama": "GATE 02 PDRG" },
  { "Serial No": "944-036", "nama": "GATE 03 PDRG" },
  { "Serial No": "924-036", "nama": "GATE 04 PDRG" },
  { "Serial No": "922-036", "nama": "GATE 05 PDRG" },
  { "Serial No": "384-050", "nama": "GATE 01 PDJ" },
  { "Serial No": "318-142", "nama": "GATE 02 PDJ" },
  { "Serial No": "186-197", "nama": "GATE 03 PDJ" },
  { "Serial No": "187-197", "nama": "GATE 04 PDJ" },
  { "Serial No": "188-197", "nama": "GATE 05 PDJ" },
  { "Serial No": "385-050", "nama": "GATE 06 PDJ" },
  { "Serial No": "457-100", "nama": "GATE 07 PDJ" },
  { "Serial No": "458-100", "nama": "GATE 08 PDJ" },
  { "Serial No": "459-100", "nama": "GATE 09 PDJ" },
  { "Serial No": "460-100", "nama": "GATE 10 PDJ" },
  { "Serial No": "916-005", "nama": "GATE 11 PDJ" },
  { "Serial No": "917-005", "nama": "GATE 12 PDJ" },
  { "Serial No": "918-005", "nama": "GATE 13 PDJ" },
  { "Serial No": "919-005", "nama": "GATE 14 PDJ" },
  { "Serial No": "920-005", "nama": "GATE 15 PDJ" },
  { "Serial No": "271-142", "nama": "GATE 01 PI" },
  { "Serial No": "272-142", "nama": "GATE 02 PI" },
  { "Serial No": "273-142", "nama": "GATE 03 PI" },
  { "Serial No": "371-050", "nama": "GATE 04 PI" },
  { "Serial No": "444-100", "nama": "GATE 05 PI" },
  { "Serial No": "445-100", "nama": "GATE 06 PI" },
  { "Serial No": "627-200", "nama": "GATE 01 PWS" },
  { "Serial No": "545-077", "nama": "GATE 02 PWS" },
  { "Serial No": "769-200", "nama": "GATE 03 PWS" },
  { "Serial No": "747-200", "nama": "GATE 04 PWS" },
  { "Serial No": "236-142", "nama": "GATE 05 PWS" },
  { "Serial No": "158-197", "nama": "GATE 01 RJW" },
  { "Serial No": "157-197", "nama": "GATE 02 RJW" },
  { "Serial No": "442-100", "nama": "GATE 03 RJW" },
  { "Serial No": "686-200", "nama": "GATE 01 RKS" },
  { "Serial No": "790-200", "nama": "GATE 02 RKS" },
  { "Serial No": "730-200", "nama": "GATE 03 RKS" },
  { "Serial No": "808-200", "nama": "GATE 04 RKS" },
  { "Serial No": "685-200", "nama": "GATE 05 RKS" },
  { "Serial No": "467-100", "nama": "GATE 06 RKS" },
  { "Serial No": "469-100", "nama": "GATE 07 RKS" },
  { "Serial No": "1020-097", "nama": "GATE 08 RKS" },
  { "Serial No": "1021-097", "nama": "GATE 09 RKS" },
  { "Serial No": "1023-097", "nama": "GATE 10 RKS" },
  { "Serial No": "1024-097", "nama": "GATE 11 RKS" },
  { "Serial No": "1026-097", "nama": "GATE 12 RKS" },
  { "Serial No": "1028-097", "nama": "GATE 13 RKS" },
  { "Serial No": "1029-097", "nama": "GATE 14 RKS" },
  { "Serial No": "1031-097", "nama": "GATE 15 RKS" },
  { "Serial No": "703-200", "nama": "GATE 01 RW" },
  { "Serial No": "640-200", "nama": "GATE 02 RW" },
  { "Serial No": "684-200", "nama": "GATE 03 RW" },
  { "Serial No": "722-200", "nama": "GATE 04 RW" },
  { "Serial No": "278-142", "nama": "GATE 05 RW" },
  { "Serial No": "279-142", "nama": "GATE 06 RW" },
  { "Serial No": "280-142", "nama": "GATE 07 RW" },
  { "Serial No": "281-142", "nama": "GATE 08 RW" },
  { "Serial No": "533-23.2", "nama": "GATE 01 RU" },
  { "Serial No": "534-23.2", "nama": "GATE 02 RU" },
  { "Serial No": "463-100", "nama": "GATE 03 RU" },
  { "Serial No": "464-100", "nama": "GATE 04 RU" },
  { "Serial No": "388-050", "nama": "GATE 05 RU" },
  { "Serial No": "331-142", "nama": "GATE 06 RU" },
  { "Serial No": "332-142", "nama": "GATE 07 RU" },
  { "Serial No": "333-142", "nama": "GATE 08 RU" },
  { "Serial No": "389-050", "nama": "GATE 09 RU" },
  { "Serial No": "191-197", "nama": "GATE 10 RU" },
  { "Serial No": "192-197", "nama": "GATE 11 RU" },
  { "Serial No": "193-197", "nama": "GATE 12 RU" },
  { "Serial No": "210-142", "nama": "GATE 13 RU" },
  { "Serial No": "211-142", "nama": "GATE 14 RU" },
  { "Serial No": "212-142", "nama": "GATE 15 RU" },
  { "Serial No": "342-050", "nama": "GATE 16 RU" },
  { "Serial No": "428-100", "nama": "GATE 01 SW" },
  { "Serial No": "117-197", "nama": "GATE 02 SW" },
  { "Serial No": "118-197", "nama": "GATE 03 SW" },
  { "Serial No": "119-197", "nama": "GATE 04 SW" },
  { "Serial No": "120-197", "nama": "GATE 05 SW" },
  { "Serial No": "121-197", "nama": "GATE 06 SW" },
  { "Serial No": "575-077", "nama": "GATE 07 SW" },
  { "Serial No": "915-044", "nama": "GATE 01 SG" },
  { "Serial No": "912-044", "nama": "GATE 02 SG" },
  { "Serial No": "898-044", "nama": "GATE 03 SG" },
  { "Serial No": "886-044", "nama": "GATE 04 SG" },
  { "Serial No": "465-100", "nama": "GATE 01 SRP" },
  { "Serial No": "466-100", "nama": "GATE 02 SRP" },
  { "Serial No": "194-197", "nama": "GATE 03 SRP" },
  { "Serial No": "197-197", "nama": "GATE 04 SRP" },
  { "Serial No": "196-197", "nama": "GATE 05 SRP" },
  { "Serial No": "195-197", "nama": "GATE 06 SRP" },
  { "Serial No": "557-077", "nama": "GATE 07 SRP" },
  { "Serial No": "558-077", "nama": "GATE 08 SRP" },
  { "Serial No": "731-200", "nama": "GATE 09 SRP" },
  { "Serial No": "708-200", "nama": "GATE 10 SRP" },
  { "Serial No": "SAR 01 SRP", "nama": "SAR 01 SRP" },
  { "Serial No": "740-200", "nama": "GATE 01 SLO" },
  { "Serial No": "816-028", "nama": "GATE 02 SLO" },
  { "Serial No": "486-100", "nama": "GATE 03 SLO" },
  { "Serial No": "583-077", "nama": "GATE 04 SLO" },
  { "Serial No": "147-197", "nama": "GATE 05 SLO" },
  { "Serial No": "527-23.2", "nama": "GATE 06 SLO" },
  { "Serial No": "943-036", "nama": "GATE 07 SLO" },
  { "Serial No": "242-142", "nama": "GATE 01 SK" },
  { "Serial No": "229-142", "nama": "GATE 02 SK" },
  { "Serial No": "259-142", "nama": "GATE 03 SK" },
  { "Serial No": "235-142", "nama": "GATE 04 SK" },
  { "Serial No": "814-028", "nama": "GATE 01 SWT" },
  { "Serial No": "450-100", "nama": "GATE 02 SWT" },
  { "Serial No": "532-23.2", "nama": "GATE 01 SDM" },
  { "Serial No": "321-142", "nama": "GATE 02 SDM" },
  { "Serial No": "322-142", "nama": "GATE 03 SDM" },
  { "Serial No": "323-142", "nama": "GATE 04 SDM" },
  { "Serial No": "324-142", "nama": "GATE 05 SDM" },
  { "Serial No": "325-142", "nama": "GATE 06 SDM" },
  { "Serial No": "326-142", "nama": "GATE 07 SDM" },
  { "Serial No": "505-23.1", "nama": "GATE 08 SDM" },
  { "Serial No": "327-142", "nama": "GATE 09 SDM" },
  { "Serial No": "328-142", "nama": "GATE 10 SDM" },
  { "Serial No": "329-142", "nama": "GATE 11 SDM" },
  { "Serial No": "330-142", "nama": "GATE 12 SDM" },
  { "Serial No": "560-077", "nama": "GATE 13 SDM" },
  { "Serial No": "559-077", "nama": "GATE 14 SDM" },
  { "Serial No": "609-077", "nama": "GATE 15 SDM" },
  { "Serial No": "168-197", "nama": "GATE 01 SUD" },
  { "Serial No": "169-197", "nama": "GATE 02 SUD" },
  { "Serial No": "296-142", "nama": "GATE 03 SUD" },
  { "Serial No": "297-142", "nama": "GATE 04 SUD" },
  { "Serial No": "298-142", "nama": "GATE 05 SUD" },
  { "Serial No": "299-142", "nama": "GATE 06 SUD" },
  { "Serial No": "300-142", "nama": "GATE 07 SUD" },
  { "Serial No": "301-142", "nama": "GATE 08 SUD" },
  { "Serial No": "446-100", "nama": "GATE 09 SUD" },
  { "Serial No": "170-197", "nama": "GATE 10 SUD" },
  { "Serial No": "171-197", "nama": "GATE 11 SUD" },
  { "Serial No": "302-142", "nama": "GATE 12 SUD" },
  { "Serial No": "303-142", "nama": "GATE 13 SUD" },
  { "Serial No": "304-142", "nama": "GATE 14 SUD" },
  { "Serial No": "305-142", "nama": "GATE 15 SUD" },
  { "Serial No": "935-036", "nama": "GATE 16 SUD" },
  { "Serial No": "948-036", "nama": "GATE 17 SUD" },
  { "Serial No": "949-036", "nama": "GATE 18 SUD" },
  { "Serial No": "950-036", "nama": "GATE 19 SUD" },
  { "Serial No": "836-028", "nama": "GATE 22 SUD" },
  { "Serial No": "830-028", "nama": "GATE 23 SUD" },
  { "Serial No": "823-028", "nama": "GATE 24 SUD" },
  { "Serial No": "817-028", "nama": "GATE 25 SUD" },
  { "Serial No": "237-142", "nama": "GATE 06 SUDB" },
  { "Serial No": "771-200", "nama": "GATE 07 SUDB" },
  { "Serial No": "940-036", "nama": "GATE 08 SUDB" },
  { "Serial No": "941-036", "nama": "GATE 09 SUDB" },
  { "Serial No": "942-036", "nama": "GATE 10 SUDB" },
  { "Serial No": "773-200", "nama": "GATE 11 SUDB" },
  { "Serial No": "809-200", "nama": "GATE 12 SUDB" },
  { "Serial No": "452-100", "nama": "GATE 13 SUDB" },
  { "Serial No": "A1", "nama": "GATE A1 SUDB" },
  { "Serial No": "A2", "nama": "GATE A2 SUDB" },
  { "Serial No": "A3", "nama": "GATE A3 SUDB" },
  { "Serial No": "A4", "nama": "GATE A4 SUDB" },
  { "Serial No": "A5", "nama": "GATE A5 SUDB" },
  { "Serial No": "A6", "nama": "GATE A6 SUDB" },
  { "Serial No": "A7", "nama": "GATE A7 SUDB" },
  { "Serial No": "A8", "nama": "GATE A8 SUDB" },
  { "Serial No": "A9", "nama": "GATE A9 SUDB" },
  { "Serial No": "B1", "nama": "GATE B1 SUDB" },
  { "Serial No": "B2", "nama": "GATE B2 SUDB" },
  { "Serial No": "B3", "nama": "GATE B3 SUDB" },
  { "Serial No": "B4", "nama": "GATE B4 SUDB" },
  { "Serial No": "B5", "nama": "GATE B5 SUDB" },
  { "Serial No": "529-23.2", "nama": "GATE 01 TKO" },
  { "Serial No": "501-23.1", "nama": "GATE 02 TKO" },
  { "Serial No": "502-23.1", "nama": "GATE 03 TKO" },
  { "Serial No": "566-077", "nama": "GATE 04 TKO" },
  { "Serial No": "700-200", "nama": "GATE 01 TB" },
  { "Serial No": "762-200", "nama": "GATE 02 TB" },
  { "Serial No": "753-200", "nama": "GATE 03 TB" },
  { "Serial No": "775-200", "nama": "GATE 04 TB" },
  { "Serial No": "669-200", "nama": "GATE 05 TB" },
  { "Serial No": "787-200", "nama": "GATE 06 TB" },
  { "Serial No": "702-200", "nama": "GATE 07 TB" },
  { "Serial No": "687-200", "nama": "GATE 08 TB" },
  { "Serial No": "707-200", "nama": "GATE 09 TB" },
  { "Serial No": "449-100", "nama": "GATE 10 TB" },
  { "Serial No": "306-142", "nama": "GATE 01 THB" },
  { "Serial No": "172-197", "nama": "GATE 02 THB" },
  { "Serial No": "307-142", "nama": "GATE 03 THB" },
  { "Serial No": "308-142", "nama": "GATE 04 THB" },
  { "Serial No": "173-197", "nama": "GATE 05 THB" },
  { "Serial No": "174-197", "nama": "GATE 06 THB" },
  { "Serial No": "175-197", "nama": "GATE 07 THB" },
  { "Serial No": "374-050", "nama": "GATE 08 THB" },
  { "Serial No": "375-050", "nama": "GATE 09 THB" },
  { "Serial No": "376-050", "nama": "GATE 10 THB" },
  { "Serial No": "377-050", "nama": "GATE 11 THB" },
  { "Serial No": "378-050", "nama": "GATE 12 THB" },
  { "Serial No": "379-050", "nama": "GATE 13 THB" },
  { "Serial No": "380-050", "nama": "GATE 14 THB" },
  { "Serial No": "381-050", "nama": "GATE 15 THB" },
  { "Serial No": "1053-097", "nama": "GATE 16 THB" },
  { "Serial No": "1052-097", "nama": "GATE 17 THB" },
  { "Serial No": "1051-097", "nama": "GATE 18 THB" },
  { "Serial No": "1047-097", "nama": "GATE 19 THB" },
  { "Serial No": "1046-097", "nama": "GATE 20 THB" },
  { "Serial No": "1044-097", "nama": "GATE 21 THB" },
  { "Serial No": "592-077", "nama": "GATE 22 THB" },
  { "Serial No": "1025-097", "nama": "GATE 23 THB" },
  { "Serial No": "579-077", "nama": "GATE 24 THB" },
  { "Serial No": "570-077", "nama": "GATE 25 THB" },
  { "Serial No": "618-200", "nama": "GATE 26 THB" },
  { "Serial No": "763-200", "nama": "GATE 27 THB" },
  { "Serial No": "786-200", "nama": "GATE 28 THB" },
  { "Serial No": "663-200", "nama": "GATE 29 THB" },
  { "Serial No": "978-097", "nama": "GATE 32 THB" },
  { "Serial No": "988-097", "nama": "GATE 33 THB" },
  { "Serial No": "990-097", "nama": "GATE 34 THB" },
  { "Serial No": "991-097", "nama": "GATE 35 THB" },
  { "Serial No": "992-097", "nama": "GATE 36 THB" },
  { "Serial No": "993-097", "nama": "GATE 37 THB" },
  { "Serial No": "957-097", "nama": "GATE 38 THB" },
  { "Serial No": "958-097", "nama": "GATE 39 THB" },
  { "Serial No": "959-097", "nama": "GATE 40 THB" },
  { "Serial No": "960-097", "nama": "GATE 41 THB" },
  { "Serial No": "961-097", "nama": "GATE 42 THB" },
  { "Serial No": "962-097", "nama": "GATE 43 THB" },
  { "Serial No": "963-097", "nama": "GATE 44 THB" },
  { "Serial No": "964-097", "nama": "GATE 45 THB" },
  { "Serial No": "965-097", "nama": "GATE 46 THB" },
  { "Serial No": "966-097", "nama": "GATE 47 THB" },
  { "Serial No": "967-097", "nama": "GATE 48 THB" },
  { "Serial No": "968-097", "nama": "GATE 49 THB" },
  { "Serial No": "969-097", "nama": "GATE 50 THB" },
  { "Serial No": "970-097", "nama": "GATE 51 THB" },
  { "Serial No": "994-097", "nama": "GATE 52 THB" },
  { "Serial No": "999-097", "nama": "GATE 53 THB" },
  { "Serial No": "1004-097", "nama": "GATE 54 THB" },
  { "Serial No": "1005-097", "nama": "GATE 55 THB" },
  { "Serial No": "1006-097", "nama": "GATE 56 THB" },
  { "Serial No": "1007-097", "nama": "GATE 57 THB" },
  { "Serial No": "971-097", "nama": "GATE 60 THB" },
  { "Serial No": "972-097", "nama": "GATE 61 THB" },
  { "Serial No": "973-097", "nama": "GATE 62 THB" },
  { "Serial No": "974-097", "nama": "GATE 63 THB" },
  { "Serial No": "975-097", "nama": "GATE 64 THB" },
  { "Serial No": "976-097", "nama": "GATE 65 THB" },
  { "Serial No": "982-097", "nama": "GATE 66 THB" },
  { "Serial No": "979-097", "nama": "GATE 67 THB" },
  { "Serial No": "983-097", "nama": "GATE 68 THB" },
  { "Serial No": "985-097", "nama": "GATE 69 THB" },
  { "Serial No": "986-097", "nama": "GATE 70 THB" },
  { "Serial No": "987-097", "nama": "GATE 71 THB" },
  { "Serial No": "989-097", "nama": "GATE 72 THB" },
  { "Serial No": "995-097", "nama": "GATE 73 THB" },
  { "Serial No": "1010-097", "nama": "GATE 74 THB" },
  { "Serial No": "1008-097", "nama": "GATE 75 THB" },
  { "Serial No": "1009-097", "nama": "GATE 76 THB" },
  { "Serial No": "1012-097", "nama": "GATE 77 THB" },
  { "Serial No": "1013-097", "nama": "GATE 78 THB" },
  { "Serial No": "1014-097", "nama": "GATE 79 THB" },
  { "Serial No": "1015-097", "nama": "GATE 80 THB" },
  { "Serial No": "1016-097", "nama": "GATE 81 THB" },
  { "Serial No": "984-097", "nama": "GATE 82 THB" },
  { "Serial No": "996-097", "nama": "GATE 83 THB" },
  { "Serial No": "997-097", "nama": "GATE 84 THB" },
  { "Serial No": "998-097", "nama": "GATE 85 THB" },
  { "Serial No": "1000-097", "nama": "GATE 86 THB" },
  { "Serial No": "1001-097", "nama": "GATE 87 THB" },
  { "Serial No": "1002-097", "nama": "GATE 88 THB" },
  { "Serial No": "1003-097", "nama": "GATE 89 THB" },
  { "Serial No": "451-100", "nama": "GATE 90 THB" },
  { "Serial No": "1011-097", "nama": "GATE 91 THB" },
  { "Serial No": "977-097", "nama": "GATE 92 THB" },
  { "Serial No": "981-097", "nama": "GATE 93 THB" },
  { "Serial No": "980-097", "nama": "GATE 94 THB" },
  { "Serial No": "530-23.2", "nama": "GATE 01 TTI" },
  { "Serial No": "503-23.1", "nama": "GATE 02 TTI" },
  { "Serial No": "504-23.1", "nama": "GATE 03 TTI" },
  { "Serial No": "264-142", "nama": "GATE 02 TNG" },
  { "Serial No": "265-142", "nama": "GATE 03 TNG" },
  { "Serial No": "266-142", "nama": "GATE 04 TNG" },
  { "Serial No": "372-050", "nama": "GATE 05 TNG" },
  { "Serial No": "569-077", "nama": "GATE 07 TNG" },
  { "Serial No": "606-077", "nama": "GATE 08 TNG" },
  { "Serial No": "660-200", "nama": "GATE 11 TNG" },
  { "Serial No": "800-200", "nama": "GATE 12 TNG" },
  { "Serial No": "729-200", "nama": "GATE 13 TNG" },
  { "Serial No": "646-200", "nama": "GATE 14 TNG" },
  { "Serial No": "694-200", "nama": "GATE 15 TNG" },
  { "Serial No": "710-200", "nama": "GATE 16 TNG" },
  { "Serial No": "713-200", "nama": "GATE 17 TNG" },
  { "Serial No": "716-200", "nama": "GATE 18 TNG" },
  { "Serial No": "738-200", "nama": "GATE 19 TNG" },
  { "Serial No": "797-200", "nama": "GATE 20 TNG" },
  { "Serial No": "802-200", "nama": "GATE 21 TNG" },
  { "Serial No": "517-23.2", "nama": "GATE 01 TNT" },
  { "Serial No": "408-100", "nama": "GATE 02 TNT" },
  { "Serial No": "059-197", "nama": "GATE 03 TNT" },
  { "Serial No": "060-197", "nama": "GATE 04 TNT" },
  { "Serial No": "409-100", "nama": "GATE 05 TNT" },
  { "Serial No": "061-197", "nama": "GATE 06 TNT" },
  { "Serial No": "062-197", "nama": "GATE 07 TNT" },
  { "Serial No": "697-200", "nama": "GATE 08 TNT" },
  { "Serial No": "780-200", "nama": "GATE 09 TNT" },
  { "Serial No": "1018-097", "nama": "GATE 10 TNT" },
  { "Serial No": "1042-097", "nama": "GATE 11 TNT" },
  { "Serial No": "1045-097", "nama": "GATE 12 TNT" },
  { "Serial No": "1033-097", "nama": "GATE 13 TNT" },
  { "Serial No": "1043-097", "nama": "GATE 14 TNT" },
  { "Serial No": "1019-097", "nama": "GATE 15 TNT" },
  { "Serial No": "1034-097", "nama": "GATE 16 TNT" },
  { "Serial No": "426-100", "nama": "GATE 01 TPK" },
  { "Serial No": "364-050", "nama": "GATE 02 TPK" },
  { "Serial No": "365-050", "nama": "GATE 03 TPK" },
  { "Serial No": "719-200", "nama": "GATE 04 TPK" },
  { "Serial No": "777-200", "nama": "GATE 05 TPK" },
  { "Serial No": "681-200", "nama": "GATE 06 TPK" },
  { "Serial No": "682-200", "nama": "GATE 07 TPK" },
  { "Serial No": "419-100", "nama": "GATE 01 TEB" },
  { "Serial No": "420-100", "nama": "GATE 02 TEB" },
  { "Serial No": "421-100", "nama": "GATE 03 TEB" },
  { "Serial No": "422-100", "nama": "GATE 04 TEB" },
  { "Serial No": "359-050", "nama": "GATE 05 TEB" },
  { "Serial No": "360-050", "nama": "GATE 06 TEB" },
  { "Serial No": "083-197", "nama": "GATE 07 TEB" },
  { "Serial No": "084-197", "nama": "GATE 08 TEB" },
  { "Serial No": "085-197", "nama": "GATE 09 TEB" },
  { "Serial No": "086-197", "nama": "GATE 10 TEB" },
  { "Serial No": "087-197", "nama": "GATE 11 TEB" },
  { "Serial No": "088-197", "nama": "GATE 12 TEB" },
  { "Serial No": "728-200", "nama": "GATE 13 TEB" },
  { "Serial No": "721-200", "nama": "GATE 14 TEB" },
  { "Serial No": "726-200", "nama": "GATE 15 TEB" },
  { "Serial No": "810-200", "nama": "GATE 16 TEB" },
  { "Serial No": "714-200", "nama": "GATE 17 TEB" },
  { "Serial No": "789-200", "nama": "GATE 18 TEB" },
  { "Serial No": "677-200", "nama": "GATE 19 TEB" },
  { "Serial No": "641-200", "nama": "GATE 20 TEB" },
  { "Serial No": "647-200", "nama": "GATE 21 TEB" },
  { "Serial No": "758-200", "nama": "GATE 22 TEB" },
  { "Serial No": "656-200", "nama": "GATE 23 TEB" },
  { "Serial No": "658-200", "nama": "GATE 24 TEB" },
  { "Serial No": "760-200", "nama": "GATE 01 MTM" },
  { "Serial No": "631-200", "nama": "GATE 02 MTM" },
  { "Serial No": "1017-097", "nama": "GATE 03 MTM" },
  { "Serial No": "705-200", "nama": "GATE 04 MTM" },
  { "Serial No": "752-200", "nama": "GATE 05 MTM" },
  { "Serial No": "755-200", "nama": "GATE 06 MTM" },
  { "Serial No": "1032-097", "nama": "GATE 07 MTM" },
  { "Serial No": "506-23.1", "nama": "GATE 01 TEJ" },
  { "Serial No": "507-23.1", "nama": "GATE 02 TEJ" },
  { "Serial No": "508-23.1", "nama": "GATE 03 TEJ" },
  { "Serial No": "509-23.1", "nama": "GATE 04 TEJ" },
  { "Serial No": "1050-097", "nama": "GATE 05 TEJ" },
  { "Serial No": "535-23.2", "nama": "GATE 01 TGS" },
  { "Serial No": "482-100", "nama": "GATE 02 TGS" },
  { "Serial No": "483-100", "nama": "GATE 03 TGS" },
  { "Serial No": "484-100", "nama": "GATE 04 TGS" },
  { "Serial No": "485-100", "nama": "GATE 05 TGS" },
  { "Serial No": "873-044", "nama": "GATE 01 TOJB" },
  { "Serial No": "895-044", "nama": "GATE 02 TOJB" },
  { "Serial No": "402-100", "nama": "GATE 01 UI" },
  { "Serial No": "403-100", "nama": "GATE 02 UI" },
  { "Serial No": "217-142", "nama": "GATE 03 UI" },
  { "Serial No": "048-197", "nama": "GATE 04 UI" },
  { "Serial No": "049-197", "nama": "GATE 05 UI" },
  { "Serial No": "050-197", "nama": "GATE 06 UI" },
  { "Serial No": "644-200", "nama": "GATE 07 UI" },
  { "Serial No": "665-200", "nama": "GATE 08 UI" },
  { "Serial No": "675-200", "nama": "GATE 09 UI" },
  { "Serial No": "759-200", "nama": "GATE 10 UI" },
  { "Serial No": "596-077", "nama": "GATE 01 UP" },
  { "Serial No": "051-197", "nama": "GATE 02 UP" },
  { "Serial No": "052-197", "nama": "GATE 03 UP" },
  { "Serial No": "404-100", "nama": "GATE 04 UP" },
  { "Serial No": "053-197", "nama": "GATE 05 UP" },
  { "Serial No": "054-197", "nama": "GATE 06 UP" },
  { "Serial No": "405-100", "nama": "GATE 07 UP" },
  { "Serial No": "1041-097", "nama": "GATE 08 UP" },
  { "Serial No": "872-044", "nama": "GATE 01 WLT" },
  { "Serial No": "914-044", "nama": "GATE 02 WLT" },
  { "Serial No": "910-044", "nama": "GATE 01 WT" },
  { "Serial No": "906-044", "nama": "GATE 02 WT" },
  { "Serial No": "904-044", "nama": "GATE 01 WJ" },
  { "Serial No": "891-044", "nama": "GATE 02 WJ" },
  { "Serial No": "822-028", "nama": "GATE 01 YK" },
  { "Serial No": "833-028", "nama": "GATE 02 YK" },
  { "Serial No": "683-200", "nama": "GATE 03 YK" },
  { "Serial No": "820-028", "nama": "GATE 04 YK" },
  { "Serial No": "474-100", "nama": "GATE 05 YK" },
  { "Serial No": "855-031", "nama": "GATE 06 YK" },
  { "Serial No": "863-031", "nama": "GATE 07 YK" },
  { "Serial No": "865-031", "nama": "GATE 08 YK" },
  { "Serial No": "925-036", "nama": "GATE 09 YK" },
  { "Serial No": "926-036", "nama": "GATE 10 YK" },
  { "Serial No": "929-036", "nama": "GATE 11 YK" },
  { "Serial No": "932-036", "nama": "GATE 12 YK" },
  { "Serial No": "933-036", "nama": "GATE 13 YK" },
  { "Serial No": "934-036", "nama": "GATE 14 YK" },
  { "Serial No": "936-036", "nama": "GATE 15 YK" },
  { "Serial No": "937-036", "nama": "GATE 16 YK" },
  { "Serial No": "938-036", "nama": "GATE 17 YK" },
  { "Serial No": "939-036", "nama": "GATE 18 YK" },
  { "Serial No": "SAR 01 YK", "nama": "SAR 01 YK" }
]
