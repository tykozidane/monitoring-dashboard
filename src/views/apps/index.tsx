'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Paper,
  Tabs,
  Tab,
  Autocomplete // IMPORT BARU
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  IconCloudUpload,
  IconX,
  IconFileTypeZip,
  IconCheck,
  IconPlus,
  IconTrash,
  IconHistory,
  IconDeviceDesktop,
  IconBuildingSkyscraper,
  IconDownload,
  IconCalendar
} from '@tabler/icons-react';
import { format } from 'date-fns';

// --- Tipe Data Sesuai Response API ---
interface AppHistory {
  i_id: string;
  n_app_name: string;
  n_app_detail: string;
  c_terminal_type: string;
  c_project: string;
  file_name: string;
  d_app_upload: string;
  link_download: string;
}

// Interface untuk Dropdown
interface ProjectProps {
  c_project: string;
  n_project_name: string;
}

interface TerminalTypeProps {
  c_terminal_type: string;
}

const BASE_URL = process.env.API_MONITORING_URL;
const API_AUTH = process.env.API_AUTH;

export default function AppVersionManager() {
  // --- State Data ---
  const [historyData, setHistoryData] = useState<AppHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- State Filter / Tabs ---
  const [tabValue, setTabValue] = useState('ALL');

  // --- State Upload & Modal ---
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // --- Form State ---
  const [appName, setAppName] = useState('');
  const [project, setProject] = useState(''); // Menyimpan c_project (string)
  const [terminalType, setTerminalType] = useState(''); // Menyimpan c_terminal_type (string)

  // --- State untuk Dropdown (SELECT) ---
  const [projectsList, setProjectsList] = useState<ProjectProps[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [terminalTypesList, setTerminalTypesList] = useState<TerminalTypeProps[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // --- Logic untuk Detail List ---
  const [detailInput, setDetailInput] = useState('');
  const [detailList, setDetailList] = useState<string[]>([]);

  // --- 1. Fetch History Data ---
  const fetchHistory = async () => {
    setLoadingHistory(true);

    try {
      const response = await axios.get(`${BASE_URL}/app/list-app-update`, {
        headers: { 'Authorization': API_AUTH, 'Content-Type': 'application/json' },
      });

      setHistoryData(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Gagal memuat riwayat aplikasi.");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // --- 1.b Fetch Projects (Saat Modal Dibuka) ---
  useEffect(() => {
    if (isModalOpen) {
      const fetchProjects = async () => {
        setLoadingProjects(true);

        try {
          const response = await axios.get(`${BASE_URL}/project/get-all-project`, {
            headers: {
              'Authorization': API_AUTH,
              'Content-Type': 'application/json'
            }
          });

          setProjectsList(response.data?.data || []);
        } catch (error) {
          console.error("Error fetching projects", error);
          toast.error("Gagal memuat data project");
        } finally {
          setLoadingProjects(false);
        }
      };

      fetchProjects();
    }
  }, [isModalOpen]);

  // --- 1.c Fetch Terminal Types (Saat Project Dipilih) ---
  useEffect(() => {
    if (project && isModalOpen) {
      const fetchTypes = async () => {
        setLoadingTypes(true);

        try {
          const response = await axios.get(`${BASE_URL}/terminal/type?c_project=${project}`, {
            headers: {
              'Authorization': API_AUTH,
              'Content-Type': 'application/json'
            }
          });

          setTerminalTypesList(response.data?.data || []);
        } catch (error) {
          console.error("Failed to fetch terminal types", error);
        } finally {
          setLoadingTypes(false);
        }
      };

      fetchTypes();
    } else {
      setTerminalTypesList([]);
    }
  }, [project, isModalOpen]);


  // --- Computed Data untuk Tabs ---
  const terminalTabs = useMemo(() => {
    const types = new Set(historyData.map(item => item.c_terminal_type));


    return ['ALL', ...Array.from(types)];
  }, [historyData]);

  const filteredData = useMemo(() => {
    if (tabValue === 'ALL') return historyData;

    return historyData.filter(item => item.c_terminal_type === tabValue);
  }, [historyData, tabValue]);

  // --- 2. Dropzone Logic ---
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.length > 0) {
      const file = acceptedFiles[0];

      if (!file.name.endsWith('.zip')) {
        toast.warning("Disarankan mengupload file .zip");
      }

      setUploadFile(file);
      setIsModalOpen(true);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    }
  });

  // --- 3. Form Handlers ---
  const handleAddDetail = () => {
    if (detailInput.trim()) {
      setDetailList([...detailList, detailInput.trim()]);
      setDetailInput('');
    }
  };

  const handleRemoveDetail = (index: number) => {
    const newList = [...detailList];

    newList.splice(index, 1);
    setDetailList(newList);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setUploadFile(null);
    setAppName('');
    setProject('');
    setTerminalType('');
    setDetailList([]);
    setDetailInput('');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };

  // --- 4. Upload Action ---
  const handleUploadSubmit = async () => {
    if (!uploadFile || !appName || !project || !terminalType) {
      toast.error("Mohon lengkapi semua data wajib.");

      return;
    }

    setUploading(true);

    const formattedDetail = detailList.join('\n');
    const formData = new FormData();

    formData.append('n_app_name', appName);
    formData.append('n_app_detail', formattedDetail);
    formData.append('c_terminal_type', terminalType);
    formData.append('c_project', project);
    formData.append('file', uploadFile);

    try {
      const response = await axios.post(`${BASE_URL}/app/upload`, formData, {
        headers: { 'Authorization': API_AUTH, 'Content-Type': 'multipart/form-data' },
      });

      if (response.status === 200 || response.data?.status === '00') {
        toast.success("Aplikasi berhasil diupload!");
        handleCloseModal();
        fetchHistory();
      } else {
        toast.error(response.data?.message || "Gagal upload aplikasi.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Terjadi kesalahan saat upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 4, minHeight: '100vh' }}>

      {/* HEADER */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" color="text.primary">
          App Version Control
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload versi aplikasi terbaru dan kelola riwayat pembaruan perangkat.
        </Typography>
      </Box>

      {/* --- SECTION 1: DRAG & DROP UPLOAD --- */}
      <Paper
        elevation={0}
        sx={{
          p: 0,
          mb: 4,
          borderRadius: 4,
          overflow: 'hidden',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: 3
          }
        }}
      >
        <div {...getRootProps()} style={{ padding: '50px', textAlign: 'center' }}>
          <input {...getInputProps()} />

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box sx={{
              p: 2,
              borderRadius: '50%',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'action.selected' : '#eef2ff',
              color: 'primary.main'
            }}>
              <IconCloudUpload size={48} stroke={1.5} />
            </Box>
          </Box>

          <Typography variant="h5" fontWeight="600" gutterBottom color="text.primary">
            {isDragActive ? "Drop file ZIP di sini..." : "Drag & Drop File Aplikasi"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Support file <strong>.ZIP</strong>. Maksimal ukuran file 100MB.
          </Typography>

          <Button variant="contained" color="primary" sx={{ px: 4, borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}>
            Pilih File
          </Button>
        </div>
      </Paper>


      {/* --- SECTION 2: HISTORY & TABS --- */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconHistory className="text-gray-500 mr-2" />
          <Typography variant="h5" fontWeight="bold" color="text.primary">
            Riwayat Versi
          </Typography>
        </Box>

        {/* TABS COMPONENT */}
        <Paper elevation={0} sx={{ bgcolor: 'background.paper', borderRadius: 2, mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 },
            }}
          >
            {terminalTabs.map((type) => (
              <Tab key={type} label={type} value={type} />
            ))}
          </Tabs>
        </Paper>
      </Box>

      {/* --- LIST DATA --- */}
      {loadingHistory ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredData.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ textAlign: 'center', py: 6, bgcolor: 'background.paper', borderRadius: 3 }} elevation={0}>
                <Box sx={{ mb: 2, opacity: 0.5, display: 'flex', justifyContent: 'center' }}>
                  <IconFileTypeZip size={64} />
                </Box>
                <Typography color="text.secondary">
                  Belum ada data aplikasi untuk kategori <strong>{tabValue}</strong>.
                </Typography>
              </Paper>
            </Grid>
          ) : (
            filteredData.map((item) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={item.i_id}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.paper',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    {/* Header Card */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? '#e3f2fd' : '#e3f2fd',
                          color: 'primary.main'
                        }}>
                          <IconFileTypeZip size={26} />
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight="bold" lineHeight={1.2} color="text.primary">
                            {item.n_app_name}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
                            <IconCalendar size={14} style={{ opacity: 0.6 }} />
                            <Typography variant="caption" color="text.secondary">
                              {item.d_app_upload ? format(new Date(item.d_app_upload), 'dd MMM yyyy, HH:mm') : '-'}
                            </Typography>
                          </Stack>
                        </Box>
                      </Box>
                      <Chip label="Active" color="success" size="small" variant="filled" sx={{ fontWeight: 'bold' }} />
                    </Box>

                    {/* Metadata Badges */}
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Chip
                        icon={<IconBuildingSkyscraper size={14} />}
                        label={item.c_project}
                        size="small"
                        sx={{ fontWeight: 600, bgcolor: 'action.hover', color: 'text.primary' }}
                      />
                      <Chip
                        icon={<IconDeviceDesktop size={14} />}
                        label={item.c_terminal_type}
                        size="small"
                        sx={{ fontWeight: 600, bgcolor: 'action.hover', color: 'text.primary' }}
                      />
                    </Stack>

                    <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

                    {/* Content Detail */}
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'text.primary' }}>
                      Changelog / Details:
                    </Typography>

                    <Box
                      component="ul"
                      sx={{
                        m: 0,
                        pl: 5,
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                        '& li': { mb: 0.5 }
                      }}
                    >
                      {item.n_app_detail ? (
                        item.n_app_detail.split('\n').map((line, idx) => (
                          line.trim() !== '' && <li key={idx}>{line}</li>
                        ))
                      ) : (
                        <li> Tidak ada detail</li>
                      )}
                    </Box>
                  </CardContent>

                  {/* Footer Card: Download Button */}
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<IconDownload size={18} />}
                      href={item.link_download}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        borderColor: 'divider',
                        color: 'text.primary',
                        bgcolor: 'background.paper',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover',
                          color: 'primary.main'
                        }
                      }}
                    >
                      Download ZIP
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* --- MODAL / POPUP UPLOAD --- */}
      <Dialog
        open={isModalOpen}
        onClose={!uploading ? handleCloseModal : undefined}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" component="div" fontWeight="bold" color="text.primary">
            Upload Detail
          </Typography>
          {!uploading && (
            <IconButton onClick={handleCloseModal} size="small">
              <IconX size={20} />
            </IconButton>
          )}
        </DialogTitle>

        <Divider />

        <DialogContent>
          <Box sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <IconFileTypeZip className="text-blue-500" size={32} />
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="body2" color="text.secondary">File Selected:</Typography>
              <Typography variant="subtitle2" fontWeight="bold" noWrap color="text.primary">
                {uploadFile?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(uploadFile?.size ? (uploadFile.size / 1024 / 1024).toFixed(2) : 0)} MB
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="App Name / Version (e.g. v1.0.5)"
                fullWidth
                required
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Masukkan nama versi aplikasi"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* SELECT PROJECT */}
            <Grid size={{ xs: 6 }}>
              <Autocomplete
                options={projectsList}
                loading={loadingProjects}
                getOptionLabel={(option) => option.c_project || ""}
                value={projectsList.find(p => p.c_project === project) || null}
                onChange={(_, newValue) => {
                  setProject(newValue?.c_project || "");
                  setTerminalType(""); // Reset terminal type jika project berubah
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Project (Code)"
                    required
                    placeholder="e.g. KCI"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingProjects ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* SELECT TERMINAL TYPE */}
            <Grid size={{ xs: 6 }}>
              <Autocomplete
                options={terminalTypesList}
                loading={loadingTypes}
                disabled={!project} // Disable jika project belum dipilih
                getOptionLabel={(option) => option.c_terminal_type || ""}
                value={terminalTypesList.find(t => t.c_terminal_type === terminalType) || null}
                onChange={(_, newValue) => {
                  setTerminalType(newValue?.c_terminal_type || "");
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Terminal Type"
                    required
                    placeholder="e.g. GATET"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingTypes ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* DYNAMIC LIST INPUT FOR DETAIL */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, mt: 1, color: 'text.primary' }}>
                App Details / Changelog:
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ketik fitur/perbaikan lalu tekan Enter..."
                  value={detailInput}
                  onChange={(e) => setDetailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDetail();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  sx={{ minWidth: '50px' }}
                  onClick={handleAddDetail}
                >
                  <IconPlus size={20} />
                </Button>
              </Box>

              {/* Render List Chips/Items */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '150px', overflowY: 'auto' }}>
                {detailList.length === 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Belum ada detail ditambahkan.
                  </Typography>
                )}
                {detailList.map((detail, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1, pl: 2
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
                      <Typography variant="body2" color="text.primary">{detail}</Typography>
                    </Box>
                    <IconButton size="small" color="error" onClick={() => handleRemoveDetail(idx)}>
                      <IconTrash size={16} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseModal} disabled={uploading} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleUploadSubmit}
            variant="contained"
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <IconCheck size={20} />}
          >
            {uploading ? 'Uploading...' : 'Submit Data'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
