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

      // 1. Ubah alias mapping menjadi Array agar bisa menampung banyak kemungkinan (termasuk typo)
      const aliasMapping: Record<string, string[]> = {
        "MODULE READER": ["CARD READER", "MODULE READER"],
        "CONTROLLER": ["MBC", "CONTROLLER"],
        "BARCODE SCANNER": ["QR SCANNER", "BARCODE SCANNER"],
        "TRANSFORMER": ["TRAFO", "TRANFORMER"],
      };

      // Cek apakah nama model terminal mengandung kata "gate" (case-insensitive)
      const isGateModel = (rowData.model_name || "").toLowerCase().includes("gate");

      const usedDeviceCodes = new Set<string>();

      parsedSyncItems.forEach((sourceItem, idx) => {
        const itemId = `src-${idx}`;

        const sourceItemTypeUpper = (sourceItem.sub_item_type || "").toUpperCase().trim();

        // Ambil daftar alias berdasarkan tipe, default ke array kosong jika tidak ada
        let mappedAliases = aliasMapping[sourceItemTypeUpper] || [];

        // Logic khusus: Jika MODULE READER tapi modelnya NFC, ubah aliasnya ke NFC Reader
        if (sourceItemTypeUpper === "MODULE READER" && (sourceItem.sub_model_name || "").toUpperCase().includes("NFC")) {
          mappedAliases = ["NFC READER"];
        }

        // Cari SEMUA kemungkinan device yang cocok
        const possibleMatches = optionDevice.filter((opt) => {
          const optNameUpper = (opt.n_device_type || "").toUpperCase().trim();
          const optDeviceTypeUpper = (opt.c_device_type || "").toUpperCase().trim();

          const isMatch = (
            opt.c_device === sourceItem.sub_model_code ||
            optDeviceTypeUpper === sourceItemTypeUpper ||
            optNameUpper === sourceItemTypeUpper ||
            mappedAliases.includes(optNameUpper)
          );

          return isMatch && !usedDeviceCodes.has(opt.c_device);
        });

        // Urutkan berdasarkan n_number secara ascending
        possibleMatches.sort((a, b) => {
          const numA = parseInt(a.n_number, 10) || 0;
          const numB = parseInt(b.n_number, 10) || 0;


          return numA - numB;
        });

        // Ambil opsi dengan urutan pertama (paling kecil n_number-nya)
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
              } else if (deviceCodeVal.endsWith('03') || numVal === 3) {
                tempDir = 3; // 3 untuk 03 (OUT)
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
            c_direction: tempDir,
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

      const uniqueOptions = Array.from(new Map(options.map(item => [item.i_id, item])).values());

      setTerminalOptions(uniqueOptions);

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

    const targetDeletedView = selectedTerminal.devices?.filter((dev) => {
      // Cek apakah device dari terminal target ini sudah match dengan data sync (source)
      const isAlreadyMatched = parsedSyncItems.some((sourceItem, idx) => {
        const mapping = mappedDevices[`src-${idx}`];


        return (
          mapping &&
          dev.c_serial_number === sourceItem.sub_serial_number &&
          dev.c_device === mapping.c_device
        );
      });

      // Hanya render (kembalikan true) jika device ini TIDAK match dengan source
      return !isAlreadyMatched;
    })
      .map((dev, idx) => {
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
                  <div className="mt-2 p-2 border border-gray-200 rounded text-xs dark:border-gray-700" style={{ backgroundColor: 'var(--mui-palette-background-default)' }}>
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
        {targetDeletedView?.length > 0 && <Divider className="my-4"><Typography variant="caption" className="font-bold" color="text.secondary">Unmatched Devices</Typography></Divider>}
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
  {
    "Serial No": "001-050",
    "nama": "CVIM REG ANCOL 01"
  },
  {
    "Serial No": "226-186",
    "nama": "CVIM FA BATU CEPER 01"
  },
  {
    "Serial No": "128-186",
    "nama": "CVIM TUP BEKASI 01"
  },
  {
    "Serial No": "164-186",
    "nama": "CVIM TUP BEKASI 02"
  },
  {
    "Serial No": "158-186",
    "nama": "CVIM TUP BEKASI 03"
  },
  {
    "Serial No": "179-186",
    "nama": "CVIM TUP BEKASI 04"
  },
  {
    "Serial No": "173-186",
    "nama": "CVIM TUP BEKASI TIMUR 01"
  },
  {
    "Serial No": "042-050",
    "nama": "CVIM REG BEKASI TIMUR 02"
  },
  {
    "Serial No": "043-050",
    "nama": "CVIM REG BEKASI TIMUR 03"
  },
  {
    "Serial No": "249-024",
    "nama": "CVIM CASHLESS BOGOR 09"
  },
  {
    "Serial No": "032-050",
    "nama": "CVIM REG BOGOR 10"
  },
  {
    "Serial No": "207-186",
    "nama": "CVIM THB BOGOR 11"
  },
  {
    "Serial No": "067-186",
    "nama": "CVIM THB BOGOR 12"
  },
  {
    "Serial No": "068-186",
    "nama": "CVIM TUP BOGOR 13"
  },
  {
    "Serial No": "069-186",
    "nama": "CVIM TUP BOGOR 14"
  },
  {
    "Serial No": "070-186",
    "nama": "CVIM TUP BOGOR 15"
  },
  {
    "Serial No": "071-186",
    "nama": "CVIM TUP BOGOR 16"
  },
  {
    "Serial No": "118-186",
    "nama": "CVIM TUP BOGOR 17"
  },
  {
    "Serial No": "153-186",
    "nama": "CVIM TUP BOGOR 18"
  },
  {
    "Serial No": "116-186",
    "nama": "CVIM TUP BOJONG GEDE 01"
  },
  {
    "Serial No": "162-186",
    "nama": "CVIM TUP BOJONG GEDE 02"
  },
  {
    "Serial No": "212-186",
    "nama": "CVIM FA BOJONG GEDE 03"
  },
  {
    "Serial No": "208-186",
    "nama": "CVIM THB BOJONG GEDE 04"
  },
  {
    "Serial No": "236-186",
    "nama": "CVIM FA BOJONG INDAH 01"
  },
  {
    "Serial No": "064-186",
    "nama": "CVIM THB BRAMBANAN 01"
  },
  {
    "Serial No": "229-186",
    "nama": "CVIM FA BUARAN 01"
  },
  {
    "Serial No": "203-186",
    "nama": "CVIM THB BUARAN 02"
  },
  {
    "Serial No": "072-186",
    "nama": "CVIM THB CAKUNG 01"
  },
  {
    "Serial No": "073-186",
    "nama": "CVIM THB CAKUNG 02"
  },
  {
    "Serial No": "122-186",
    "nama": "CVIM THB CAWANG 01"
  },
  {
    "Serial No": "123-186",
    "nama": "CVIM THB CAWANG 02"
  },
  {
    "Serial No": "110-186",
    "nama": "CVIM TUP CAWANG 03"
  },
  {
    "Serial No": "111-186",
    "nama": "CVIM TUP CAWANG 04"
  },
  {
    "Serial No": "061-186",
    "nama": "CVIM THB CEPER 01"
  },
  {
    "Serial No": "117-186",
    "nama": "CVIM TUP CIBINONG 01"
  },
  {
    "Serial No": "113-186",
    "nama": "CVIM TUP CIBITUNG 01"
  },
  {
    "Serial No": "205-186",
    "nama": "CVIM THB CIBITUNG 02"
  },
  {
    "Serial No": "021-050",
    "nama": "CVIM REG CIBITUNG 03"
  },
  {
    "Serial No": "077-186",
    "nama": "CVIM THB CICAYUR 01"
  },
  {
    "Serial No": "080-186",
    "nama": "CVIM TUP CIKARANG 01"
  },
  {
    "Serial No": "145-186",
    "nama": "CVIM THB CIKARANG 03"
  },
  {
    "Serial No": "012-050",
    "nama": "CVIM REG CIKINI 03"
  },
  {
    "Serial No": "088-186",
    "nama": "CVIM TUP CIKINI 05"
  },
  {
    "Serial No": "087-186",
    "nama": "CVIM TUP CIKINI 06"
  },
  {
    "Serial No": "093-186",
    "nama": "CVIM TUP CIKINI 07"
  },
  {
    "Serial No": "025-050",
    "nama": "CVIM REG CIKOYA 01"
  },
  {
    "Serial No": "139-186",
    "nama": "CVIM THB CILEBUT 01"
  },
  {
    "Serial No": "177-186",
    "nama": "CVIM THB CILEBUT 02"
  },
  {
    "Serial No": "163-186",
    "nama": "CVIM TUP CILEBUT 03"
  },
  {
    "Serial No": "211-186",
    "nama": "CVIM FA CILEBUT 04"
  },
  {
    "Serial No": "209-186",
    "nama": "CVIM THB CILEBUT 05"
  },
  {
    "Serial No": "185-186",
    "nama": "CVIM TUP CILEBUT 06"
  },
  {
    "Serial No": "230-186",
    "nama": "CVIM FA CILEJIT 01"
  },
  {
    "Serial No": "178-186",
    "nama": "CVIM TUP CISAUK 01"
  },
  {
    "Serial No": "144-186",
    "nama": "CVIM THB CISAUK 02"
  },
  {
    "Serial No": "256-024",
    "nama": "CVIM CASHLESS CISAUK 03"
  },
  {
    "Serial No": "247-024",
    "nama": "CVIM CASHLESS CITAYAM 04"
  },
  {
    "Serial No": "200-186",
    "nama": "CVIM TUP CITAYAM 05"
  },
  {
    "Serial No": "198-186",
    "nama": "CVIM THB CITAYAM 06"
  },
  {
    "Serial No": "197-186",
    "nama": "CVIM THB CITAYAM 07"
  },
  {
    "Serial No": "201-186",
    "nama": "CVIM TUP CITAYAM 08"
  },
  {
    "Serial No": "213-186",
    "nama": "CVIM FA CITAYAM 09"
  },
  {
    "Serial No": "224-186",
    "nama": "CVIM FA DARU 01"
  },
  {
    "Serial No": "015-050",
    "nama": "CVIM REG DARU 02"
  },
  {
    "Serial No": "062-186",
    "nama": "CVIM THB DELANGGU 01"
  },
  {
    "Serial No": "210-186",
    "nama": "CVIM THB DEPOK 04"
  },
  {
    "Serial No": "184-186",
    "nama": "CVIM TUP DEPOK 05"
  },
  {
    "Serial No": "214-186",
    "nama": "CVIM FA DEPOK 07"
  },
  {
    "Serial No": "114-186",
    "nama": "CVIM TUP DEPOK 08"
  },
  {
    "Serial No": "115-186",
    "nama": "CVIM TUP DEPOK 09"
  },
  {
    "Serial No": "215-186",
    "nama": "CVIM FA DEPOK BARU 01"
  },
  {
    "Serial No": "138-186",
    "nama": "CVIM THB DEPOK BARU 02"
  },
  {
    "Serial No": "142-186",
    "nama": "CVIM THB DEPOK BARU 03"
  },
  {
    "Serial No": "248-024",
    "nama": "CVIM CASHLESS DEPOK BARU 04"
  },
  {
    "Serial No": "098-186",
    "nama": "CVIM THB DUREN KALIBATA 01"
  },
  {
    "Serial No": "099-186",
    "nama": "CVIM THB DUREN KALIBATA 02"
  },
  {
    "Serial No": "100-186",
    "nama": "CVIM TUP DUREN KALIBATA 03"
  },
  {
    "Serial No": "101-186",
    "nama": "CVIM TUP DUREN KALIBATA 04"
  },
  {
    "Serial No": "223-186",
    "nama": "CVIM FA DURI 01"
  },
  {
    "Serial No": "187-186",
    "nama": "CVIM TUP DURI 02"
  },
  {
    "Serial No": "109-186",
    "nama": "CVIM TUP DURI 03"
  },
  {
    "Serial No": "252-024",
    "nama": "CVIM CASHLESS DURI 04"
  },
  {
    "Serial No": "058-186",
    "nama": "CVIM THB GAWOK 01"
  },
  {
    "Serial No": "106-186",
    "nama": "CVIM THB GONDANGDIA 01"
  },
  {
    "Serial No": "107-186",
    "nama": "CVIM THB GONDANGDIA 02"
  },
  {
    "Serial No": "090-186",
    "nama": "CVIM TUP GONDANGDIA 04"
  },
  {
    "Serial No": "092-186",
    "nama": "CVIM TUP GONDANGDIA 05"
  },
  {
    "Serial No": "091-186",
    "nama": "CVIM TUP GONDANGDIA 06"
  },
  {
    "Serial No": "242-024",
    "nama": "CVIM CASHLESS GONDANGDIA 07"
  },
  {
    "Serial No": "165-186",
    "nama": "CVIM TUP GROGOL 01"
  },
  {
    "Serial No": "104-186",
    "nama": "CVIM TUP JAKARTA KOTA 01"
  },
  {
    "Serial No": "002-050",
    "nama": "CVIM REG JAKARTA KOTA 02"
  },
  {
    "Serial No": "003-050",
    "nama": "CVIM REG JAKARTA KOTA 03"
  },
  {
    "Serial No": "102-186",
    "nama": "CVIM TUP JAKARTA KOTA 04"
  },
  {
    "Serial No": "010-050",
    "nama": "CVIM REG JAKARTA KOTA 05"
  },
  {
    "Serial No": "011-050",
    "nama": "CVIM REG JAKARTA KOTA 06"
  },
  {
    "Serial No": "074-186",
    "nama": "CVIM THB JAKARTA KOTA 07"
  },
  {
    "Serial No": "243-024",
    "nama": "CVIM CASHLESS JAKARTA KOTA 08"
  },
  {
    "Serial No": "121-186",
    "nama": "CVIM TUP JATAKE 01"
  },
  {
    "Serial No": "250-024",
    "nama": "CVIM CASHLESS JATAKE 02"
  },
  {
    "Serial No": "134-186",
    "nama": "CVIM TUP JATINEGARA 01"
  },
  {
    "Serial No": "218-186",
    "nama": "CVIM FA JATINEGARA 02"
  },
  {
    "Serial No": "089-186",
    "nama": "CVIM TUP JATINEGARA 03"
  },
  {
    "Serial No": "037-050",
    "nama": "CVIM REG JAYAKARTA 02"
  },
  {
    "Serial No": "018-050",
    "nama": "CVIM REG JAYAKARTA 03"
  },
  {
    "Serial No": "041-050",
    "nama": "CVIM REG JUANDA 01"
  },
  {
    "Serial No": "051-186",
    "nama": "CVIM THB JUANDA 04"
  },
  {
    "Serial No": "052-186",
    "nama": "CVIM THB JUANDA 05"
  },
  {
    "Serial No": "053-186",
    "nama": "CVIM TUP JUANDA 06"
  },
  {
    "Serial No": "054-186",
    "nama": "CVIM TUP JUANDA 07"
  },
  {
    "Serial No": "241-024",
    "nama": "CVIM CASHLESS JUANDA 08"
  },
  {
    "Serial No": "031-050",
    "nama": "CVIM REG JUANDA 09"
  },
  {
    "Serial No": "146-186",
    "nama": "CVIM THB JUANDA 10"
  },
  {
    "Serial No": "234-186",
    "nama": "CVIM FA JURANG MANGU 01"
  },
  {
    "Serial No": "258-024",
    "nama": "CVIM CASHLESS JURANG MANGU 02"
  },
  {
    "Serial No": "172-186",
    "nama": "CVIM TUP KALIDERES 01"
  },
  {
    "Serial No": "094-186",
    "nama": "CVIM THB KEBAYORAN 01"
  },
  {
    "Serial No": "095-186",
    "nama": "CVIM THB KEBAYORAN 02"
  },
  {
    "Serial No": "096-186",
    "nama": "CVIM THB KEBAYORAN 03"
  },
  {
    "Serial No": "097-186",
    "nama": "CVIM THB KEBAYORAN 04"
  },
  {
    "Serial No": "085-186",
    "nama": "CVIM TUP KEBAYORAN 05"
  },
  {
    "Serial No": "262-024",
    "nama": "CVIM CASHLESS KEBAYORAN 06"
  },
  {
    "Serial No": "221-186",
    "nama": "CVIM FA KEBAYORAN 07"
  },
  {
    "Serial No": "063-186",
    "nama": "CVIM THB KLATEN 01"
  },
  {
    "Serial No": "029-050",
    "nama": "CVIM REG KLENDER 01"
  },
  {
    "Serial No": "030-050",
    "nama": "CVIM REG KLENDER 02"
  },
  {
    "Serial No": "219-186",
    "nama": "CVIM FA KLENDER BARU 01"
  },
  {
    "Serial No": "004-050",
    "nama": "CVIM REG KLENDER BARU 02"
  },
  {
    "Serial No": "005-050",
    "nama": "CVIM REG KLENDER BARU 03"
  },
  {
    "Serial No": "008-050",
    "nama": "CVIM REG KRANJI 01"
  },
  {
    "Serial No": "009-050",
    "nama": "CVIM REG KRANJI 02"
  },
  {
    "Serial No": "220-186",
    "nama": "CVIM FA KRANJI 04"
  },
  {
    "Serial No": "017-050",
    "nama": "CVIM REG KRANJI 05"
  },
  {
    "Serial No": "066-186",
    "nama": "CVIM THB LEMPUYANGAN 01"
  },
  {
    "Serial No": "154-186",
    "nama": "CVIM THB LENTENG AGUNG 02"
  },
  {
    "Serial No": "156-186",
    "nama": "CVIM THB LENTENG AGUNG 03"
  },
  {
    "Serial No": "155-186",
    "nama": "CVIM TUP LENTENG AGUNG 04"
  },
  {
    "Serial No": "216-186",
    "nama": "CVIM FA LENTENG AGUNG 05"
  },
  {
    "Serial No": "065-186",
    "nama": "CVIM THB MAGUWO 01"
  },
  {
    "Serial No": "024-050",
    "nama": "CVIM REG MAJA 03"
  },
  {
    "Serial No": "023-050",
    "nama": "CVIM REG MAJA 04"
  },
  {
    "Serial No": "082-186",
    "nama": "CVIM TUP MAJA 05"
  },
  {
    "Serial No": "127-186",
    "nama": "CVIM THB MANGGA BESAR 01"
  },
  {
    "Serial No": "126-186",
    "nama": "CVIM THB MANGGA BESAR 02"
  },
  {
    "Serial No": "108-186",
    "nama": "CVIM TUP MANGGA BESAR 03"
  },
  {
    "Serial No": "240-024",
    "nama": "CVIM CASHLESS MANGGARAI 01"
  },
  {
    "Serial No": "033-050",
    "nama": "CVIM REG MANGGARAI 03"
  },
  {
    "Serial No": "103-186",
    "nama": "CVIM TUP MANGGARAI 04"
  },
  {
    "Serial No": "016-050",
    "nama": "CVIM REG MANGGARAI 05"
  },
  {
    "Serial No": "204-186",
    "nama": "CVIM THB MANGGARAI 06"
  },
  {
    "Serial No": "105-186",
    "nama": "CVIM TUP MANGGARAI 07"
  },
  {
    "Serial No": "045-050",
    "nama": "CVIM REG MATRAMAN 01"
  },
  {
    "Serial No": "046-050",
    "nama": "CVIM REG MATRAMAN 02"
  },
  {
    "Serial No": "180-186",
    "nama": "CVIM THB NAMBO 01"
  },
  {
    "Serial No": "181-186",
    "nama": "CVIM THB NAMBO 02"
  },
  {
    "Serial No": "261-024",
    "nama": "CVIM CASHLESS PALMERAH 02"
  },
  {
    "Serial No": "014-050",
    "nama": "CVIM REG PALMERAH 03"
  },
  {
    "Serial No": "159-186",
    "nama": "CVIM TUP PALMERAH 04"
  },
  {
    "Serial No": "152-186",
    "nama": "CVIM TUP PALMERAH 07"
  },
  {
    "Serial No": "076-186",
    "nama": "CVIM THB PALUR 01"
  },
  {
    "Serial No": "083-186",
    "nama": "CVIM TUP PARUNG PANJANG 01"
  },
  {
    "Serial No": "020-050",
    "nama": "CVIM REG PARUNG PANJANG 04"
  },
  {
    "Serial No": "019-050",
    "nama": "CVIM REG PARUNG PANJANG 05"
  },
  {
    "Serial No": "084-186",
    "nama": "CVIM TUP PARUNG PANJANG 06"
  },
  {
    "Serial No": "135-186",
    "nama": "CVIM TUP PASAR MINGGU 01"
  },
  {
    "Serial No": "148-186",
    "nama": "CVIM THB PASAR MINGGU 02"
  },
  {
    "Serial No": "149-186",
    "nama": "CVIM THB PASAR MINGGU 03"
  },
  {
    "Serial No": "150-186",
    "nama": "CVIM THB PASAR MINGGU 04"
  },
  {
    "Serial No": "151-186",
    "nama": "CVIM TUP PASAR MINGGU 05"
  },
  {
    "Serial No": "254-024",
    "nama": "CVIM CASHLESS PASAR MINGGU 06"
  },
  {
    "Serial No": "217-186",
    "nama": "CVIM FA PASAR MINGGU 07"
  },
  {
    "Serial No": "190-186",
    "nama": "CVIM TUP PASAR MINGGU BARU 01"
  },
  {
    "Serial No": "167-186",
    "nama": "CVIM TUP PESING 01"
  },
  {
    "Serial No": "136-186",
    "nama": "CVIM THB PONDOK CINA 01"
  },
  {
    "Serial No": "137-186",
    "nama": "CVIM THB PONDOK CINA 02"
  },
  {
    "Serial No": "028-050",
    "nama": "CVIM REG PONDOK CINA 03"
  },
  {
    "Serial No": "007-050",
    "nama": "CVIM REG PONDOK CINA 04"
  },
  {
    "Serial No": "140-186",
    "nama": "CVIM TUP PONDOK CINA 05"
  },
  {
    "Serial No": "141-186",
    "nama": "CVIM TUP PONDOK CINA 06"
  },
  {
    "Serial No": "235-186",
    "nama": "CVIM FA PONDOK CINA 07"
  },
  {
    "Serial No": "161-186",
    "nama": "CVIM TUP PONDOK CINA 08"
  },
  {
    "Serial No": "245-024",
    "nama": "CVIM CASHLESS PONDOK CINA 09"
  },
  {
    "Serial No": "196-186",
    "nama": "CVIM THB PONDOK RAJEG 01"
  },
  {
    "Serial No": "199-186",
    "nama": "CVIM TUP PONDOK RAJEG 02"
  },
  {
    "Serial No": "039-050",
    "nama": "CVIM REG PONDOK RANJI 01"
  },
  {
    "Serial No": "040-050",
    "nama": "CVIM REG PONDOK RANJI 02"
  },
  {
    "Serial No": "047-050",
    "nama": "CVIM REG PONDOK RANJI 03"
  },
  {
    "Serial No": "157-186",
    "nama": "CVIM TUP PONDOK RANJI 04"
  },
  {
    "Serial No": "237-002",
    "nama": "CVIM THB PONDOK RANJI 05"
  },
  {
    "Serial No": "238-002",
    "nama": "CVIM TUP PONDOK RANJI 06"
  },
  {
    "Serial No": "013-050",
    "nama": "CVIM REG PONDOK RANJI 07"
  },
  {
    "Serial No": "035-050",
    "nama": "CVIM REG PORIS 01"
  },
  {
    "Serial No": "036-050",
    "nama": "CVIM REG PORIS 02"
  },
  {
    "Serial No": "169-186",
    "nama": "CVIM TUP PORIS 03"
  },
  {
    "Serial No": "057-186",
    "nama": "CVIM THB PURWOSARI 01"
  },
  {
    "Serial No": "239-024",
    "nama": "CVIM CASHLESS RANGKAS BITUNG 01"
  },
  {
    "Serial No": "081-186",
    "nama": "CVIM TUP RANGKAS BITUNG 03"
  },
  {
    "Serial No": "225-186",
    "nama": "CVIM FA RAWA BUAYA 01"
  },
  {
    "Serial No": "124-186",
    "nama": "CVIM THB SAWAH BESAR 01"
  },
  {
    "Serial No": "125-186",
    "nama": "CVIM THB SAWAH BESAR 02"
  },
  {
    "Serial No": "112-186",
    "nama": "CVIM TUP SAWAH BESAR 03"
  },
  {
    "Serial No": "078-186",
    "nama": "CVIM THB SERPONG 04"
  },
  {
    "Serial No": "079-186",
    "nama": "CVIM TUP SERPONG 05"
  },
  {
    "Serial No": "257-024",
    "nama": "CVIM CASHLESS SERPONG 06"
  },
  {
    "Serial No": "222-186",
    "nama": "CVIM FA SERPONG 07"
  },
  {
    "Serial No": "059-186",
    "nama": "CVIM THB SOLO BALAPAN 01"
  },
  {
    "Serial No": "171-186",
    "nama": "CVIM TUP SOLO BALAPAN 02"
  },
  {
    "Serial No": "075-186",
    "nama": "CVIM THB SOLO JEBRES 01"
  },
  {
    "Serial No": "060-186",
    "nama": "CVIM THB SROWOT 01"
  },
  {
    "Serial No": "186-186",
    "nama": "CVIM TUP SUDIMARA 01"
  },
  {
    "Serial No": "259-024",
    "nama": "CVIM CASHLESS SUDIMARA 02"
  },
  {
    "Serial No": "192-186",
    "nama": "CVIM TUP SUDIMARA 03"
  },
  {
    "Serial No": "244-024",
    "nama": "CVIM CASHLESS SUDIRMAN 04"
  },
  {
    "Serial No": "131-186",
    "nama": "CVIM TUP SUDIRMAN 05"
  },
  {
    "Serial No": "132-186",
    "nama": "CVIM TUP SUDIRMAN 06"
  },
  {
    "Serial No": "055-186",
    "nama": "CVIM TUP SUDIRMAN 08"
  },
  {
    "Serial No": "175-186",
    "nama": "CVIM TUP SUDIRMAN BARU 01"
  },
  {
    "Serial No": "176-186",
    "nama": "CVIM TUP SUDIRMAN BARU 02"
  },
  {
    "Serial No": "233-186",
    "nama": "CVIM FA SUDIRMAN BARU 03"
  },
  {
    "Serial No": "133-186",
    "nama": "CVIM TUP SUDIRMAN BARU 04"
  },
  {
    "Serial No": "246-024",
    "nama": "CVIM CASHLESS SUDIRMAN BARU 05"
  },
  {
    "Serial No": "147-186",
    "nama": "CVIM TUP TAMAN KOTA 02"
  },
  {
    "Serial No": "232-186",
    "nama": "CVIM FA TAMAN KOTA 03"
  },
  {
    "Serial No": "188-186",
    "nama": "CVIM TUP TAMBUN 01"
  },
  {
    "Serial No": "129-186",
    "nama": "CVIM TUP TANAH ABANG 01"
  },
  {
    "Serial No": "130-186",
    "nama": "CVIM TUP TANAH ABANG 02"
  },
  {
    "Serial No": "086-186",
    "nama": "CVIM TUP TANAH ABANG 03"
  },
  {
    "Serial No": "174-186",
    "nama": "CVIM TUP TANAH ABANG 04"
  },
  {
    "Serial No": "255-024",
    "nama": "CVIM CASHLESS TANAH ABANG 05"
  },
  {
    "Serial No": "227-186",
    "nama": "CVIM FA TANAH TINGGI 01"
  },
  {
    "Serial No": "044-050",
    "nama": "CVIM REG TANGERANG 01"
  },
  {
    "Serial No": "260-024",
    "nama": "CVIM CASHLESS TANGERANG 02"
  },
  {
    "Serial No": "048-050",
    "nama": "CVIM REG TANGERANG 04"
  },
  {
    "Serial No": "166-186",
    "nama": "CVIM TUP TANGERANG 05"
  },
  {
    "Serial No": "168-186",
    "nama": "CVIM TUP TANGERANG 06"
  },
  {
    "Serial No": "119-186",
    "nama": "CVIM TUP TANJUNG BARAT 01"
  },
  {
    "Serial No": "120-186",
    "nama": "CVIM TUP TANJUNG BARAT 02"
  },
  {
    "Serial No": "195-186",
    "nama": "CVIM THB TANJUNG BARAT 03"
  },
  {
    "Serial No": "194-186",
    "nama": "CVIM THB TANJUNG BARAT 04"
  },
  {
    "Serial No": "253-024",
    "nama": "CVIM CASHLESS TANJUNG BARAT 05"
  },
  {
    "Serial No": "228-186",
    "nama": "CVIM FA TANJUNG PRIOK 01"
  },
  {
    "Serial No": "049-050",
    "nama": "CVIM REG TANJUNG PRIOK 02"
  },
  {
    "Serial No": "050-050",
    "nama": "CVIM REG TANJUNG PRIOK 03"
  },
  {
    "Serial No": "006-050",
    "nama": "CVIM REG TANJUNG PRIOK 04"
  },
  {
    "Serial No": "027-050",
    "nama": "CVIM REG TANJUNG PRIOK 05"
  },
  {
    "Serial No": "202-186",
    "nama": "CVIM THB TEBET 02"
  },
  {
    "Serial No": "206-186",
    "nama": "CVIM THB TEBET 04"
  },
  {
    "Serial No": "189-186",
    "nama": "CVIM TUP TEBET 07"
  },
  {
    "Serial No": "191-186",
    "nama": "CVIM TUP TEBET 09"
  },
  {
    "Serial No": "231-186",
    "nama": "CVIM FA TEBET 10"
  },
  {
    "Serial No": "160-186",
    "nama": "CVIM TUP TEBET 12"
  },
  {
    "Serial No": "170-186",
    "nama": "CVIM TUP TEBET 13"
  },
  {
    "Serial No": "143-186",
    "nama": "CVIM THB TELAGA MURNI 01"
  },
  {
    "Serial No": "193-186",
    "nama": "CVIM TUP TELAGA MURNI 02"
  },
  {
    "Serial No": "022-050",
    "nama": "CVIM REG TELAGA MURNI 03"
  },
  {
    "Serial No": "038-050",
    "nama": "CVIM REG TIGARAKSA 01"
  },
  {
    "Serial No": "026-050",
    "nama": "CVIM REG TIGARAKSA 02"
  },
  {
    "Serial No": "034-050",
    "nama": "CVIM REG UNIVERSITAS INDONESIA 02"
  },
  {
    "Serial No": "182-186",
    "nama": "CVIM TUP UNIVERSITAS INDONESIA 03"
  },
  {
    "Serial No": "183-186",
    "nama": "CVIM TUP UNIVERSITAS INDONESIA 04"
  },
  {
    "Serial No": "251-024",
    "nama": "CVIM CASHLESS UNIVERSITAS INDONESIA 05"
  },
  {
    "Serial No": "056-186",
    "nama": "CVIM THB YOGYAKARTA 01"
  }
]
