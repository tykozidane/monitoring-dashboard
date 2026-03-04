import { useState, useRef, useEffect } from 'react';

import {
  Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, CircularProgress, Autocomplete,
  Box, Tooltip
} from '@mui/material';

// Map Components
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { toast } from 'react-toastify';

// Fix for default Leaflet icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const BASE_URL = process.env.API_MONITORING_URL;
const API_AUTH = process.env.API_AUTH;

// Interface Data
interface ProjectProps {
  c_project: string;
  n_project: string;
}

interface StationProps {
  c_project: string;
  c_station: string;
  n_station: string;
}

// --- HELPER COMPONENT FOR MAP CLICK ---
const LocationPicker = ({ setPosition }: { setPosition: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
};

// ==========================================================
// MAIN CODE FOR ADD TERMINAL MODAL
// ==========================================================

export const AddTerminalModal = ({
  isOpen,
  onClose,
  onSuccess
}: {
  isOpen: boolean,
  onClose: () => void,
  onSuccess: () => void
}) => {

  const initialFormState = {
    c_terminal_01: "",
    c_terminal_02: "",
    c_terminal_type: "",
    c_project: "",
    c_station: "",
    n_terminal_name: "",
    n_lat: "",
    n_lng: ""
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addLoading, setAddLoading] = useState(false);

  // Map States
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [tempLocation, setTempLocation] = useState<{ lat: number, lng: number } | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Autocomplete Location Search States
  const [inputValue, setInputValue] = useState("");
  const [locationOptions, setLocationOptions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- Data Lists States ---
  const [projects, setProjects] = useState<ProjectProps[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Station State (Moved from props to local state)
  const [stations, setStations] = useState<StationProps[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);

  const [terminalTypes, setTerminalTypes] = useState<{ c_terminal_type: string }[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  const [spareGates, setSpareGates] = useState<{ c_project: string, c_station: string, c_terminal_01: string, c_terminal_02: string, n_terminal_name: string }[]>([]);
  const [loadingSpareGates, setLoadingSpareGates] = useState(false);

  // Helper boolean to check if current type is GATE
  const isGateType = formData.c_terminal_type.includes('GATE');

  // --- 1. FETCH PROJECTS ON OPEN ---
  useEffect(() => {
    if (isOpen) {
      const fetchProjects = async () => {
        setLoadingProjects(true);

        try {
          const response = await axios.get(`${BASE_URL}/project/get-all-project`, {
            headers: { 'Authorization': API_AUTH, 'Content-Type': 'application/json' }
          });

          setProjects(response.data?.data || []);
        } catch (error) {
          console.error("Error fetching projects", error);
          toast.error("Gagal memuat data project");
        } finally {
          setLoadingProjects(false);
        }
      };

      fetchProjects();
    }
  }, [isOpen]);

  // --- 2. FETCH STATIONS (Triggered when Project Selected) ---
  useEffect(() => {
    // Reset station dan terminal data jika project berubah
    if (!formData.c_project) {
      setStations([]);

      return;
    }

    const fetchStations = async () => {
      setLoadingStations(true);

      try {
        const response = await axios.get(`${BASE_URL}/station/mini?c_project=${formData.c_project}`, {
          headers: { 'Authorization': API_AUTH, 'Content-Type': 'application/json' }
        });

        const newStation = response.data?.data || [];

        setStations(newStation);

      } catch (error) {
        console.error("Error fetching stations", error);
        toast.error("Gagal memuat data stasiun");
      } finally {
        setLoadingStations(false);
      }
    };

    if (isOpen) {
      fetchStations();
    }
  }, [formData.c_project, isOpen]);


  // --- 3. FETCH TERMINAL TYPES (Triggered when Project Selected) ---
  useEffect(() => {
    if (formData.c_project && isOpen) {
      const fetchTypes = async () => {
        setLoadingTypes(true);

        try {
          const response = await axios.get(`${BASE_URL}/terminal/type?c_project=${formData.c_project}`, {
            headers: { 'Authorization': API_AUTH, 'Content-Type': 'application/json' }
          });

          setTerminalTypes(response.data?.data || []);
        } catch (error) {
          console.error("Failed to fetch terminal types", error);
        } finally {
          setLoadingTypes(false);
        }
      };

      fetchTypes();
    } else {
      setTerminalTypes([]);
    }
  }, [formData.c_project, isOpen]);

  // --- 4. FETCH SPARE GATES (Triggered ONLY if Type includes 'GATE' & Station Selected) ---
  useEffect(() => {
    if (isGateType && formData.c_project && formData.c_station) {
      const fetchSpareGatesData = async () => {
        setLoadingSpareGates(true);

        try {
          const response = await axios.get(
            `${BASE_URL}/terminal/spare-gate?c_project=${formData.c_project}&c_station=${formData.c_station}`,
            {
              headers: { 'Authorization': API_AUTH, 'Content-Type': 'application/json' }
            }
          );

          setSpareGates(response.data.data || []);
        } catch (error) {
          console.error("Error fetch spare gates", error);
        } finally {
          setLoadingSpareGates(false);
        }
      };

      fetchSpareGatesData();
    }
  }, [isGateType, formData.c_project, formData.c_station]);

  // --- Effect for Location Search (Nominatim) ---
  useEffect(() => {
    let active = true;

    if (inputValue.length < 4) {
      setLocationOptions([]);

      return undefined;
    }

    const fetchLocations = async () => {
      setIsSearching(true);

      try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${inputValue}&limit=5`);

        if (active && response.data) {
          setLocationOptions(response.data);
        }
      } catch (error) {
        console.error("Search error", error);
      } finally {
        if (active) setIsSearching(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchLocations();
    }, 600);


    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [inputValue]);

  // --- Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.c_terminal_01) newErrors.c_terminal_01 = "Terminal 01 is required";
    if (!formData.c_terminal_type) newErrors.c_terminal_type = "Terminal Type is required";
    if (!formData.c_project) newErrors.c_project = "Project is required";
    if (!formData.c_station) newErrors.c_station = "Station is required";
    if (!formData.n_terminal_name) newErrors.n_terminal_name = "Terminal Name is required";
    if (!formData.n_lat) newErrors.n_lat = "Latitude is required";
    if (!formData.n_lng) newErrors.n_lng = "Longitude is required";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleAddTerminal = async () => {
    if (!validateForm()) return;
    setAddLoading(true);

    try {
      const resp = await axios.post(`${BASE_URL}/terminal/add-terminal`, formData, {
        headers: {
          'Authorization': API_AUTH,
          'Content-Type': 'application/json'
        }
      });

      if (resp.data?.status === '00') {
        toast.success(resp.data?.message);
        handleClose();
        onSuccess();
      } else {
        toast.error(resp.data?.data?.msg || 'Failed to add terminal');
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add terminal.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormState);
    setErrors({});
    onClose();
  };

  const handleConfirmLocation = () => {
    if (tempLocation) {
      setFormData(prev => ({
        ...prev,
        n_lat: tempLocation.lat.toString(),
        n_lng: tempLocation.lng.toString()
      }));
      setErrors(prev => ({ ...prev, n_lat: "", n_lng: "" }));
    }

    setIsMapOpen(false);
  };

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          setTempLocation({ lat: latitude, lng: longitude });
          if (mapRef.current) mapRef.current.flyTo([latitude, longitude], 18);
        },
        (error) => {
          console.error(error);
          toast.error("Failed to get location.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation not supported.");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>Add New Terminal</DialogTitle>
        <DialogContent dividers>

          {/* UPDATED GRID CONTAINER */}
          <Grid container spacing={3} sx={{ mt: 1 }}>

            {/* 1. Select Project */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={projects}
                loading={loadingProjects}
                getOptionLabel={(option) => option.n_project || option.c_project || ""}
                value={projects.find(p => p.c_project === formData.c_project) || null}
                onChange={(_, newValue) => {
                  setFormData(prev => ({
                    ...prev,
                    c_project: newValue?.c_project || "",
                    c_station: "",       // Reset Station
                    c_terminal_type: "", // Reset Type
                    n_terminal_name: "",
                    c_terminal_01: "",
                    c_terminal_02: ""
                  }));
                  if (errors.c_project) setErrors(prev => ({ ...prev, c_project: "" }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Project *"
                    error={!!errors.c_project}
                    helperText={errors.c_project}
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

            {/* 2. Select Station */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={stations}
                loading={loadingStations}
                getOptionLabel={(option) => option.n_station || option.c_station || ""}
                value={stations.find(s => s.c_station === formData.c_station) || null}
                disabled={!formData.c_project}
                onChange={(_, newValue) => {
                  setFormData(prev => ({
                    ...prev,
                    c_station: newValue?.c_station || "",
                    n_terminal_name: "",
                    c_terminal_01: "",
                    c_terminal_02: ""
                  }));
                  if (errors.c_station) setErrors(prev => ({ ...prev, c_station: "" }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Station *"
                    placeholder={!formData.c_project ? "Select Project First" : ""}
                    error={!!errors.c_station}
                    helperText={errors.c_station}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingStations ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* 3. Terminal Type */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={terminalTypes}
                loading={loadingTypes}
                getOptionLabel={(option) => option.c_terminal_type || ""}
                value={terminalTypes.find(t => t.c_terminal_type === formData.c_terminal_type) || null}
                disabled={!formData.c_project}
                onChange={(_, newValue) => {
                  const newType = newValue?.c_terminal_type || "";

                  setFormData(prev => ({
                    ...prev,
                    c_terminal_type: newType,
                    n_terminal_name: "",
                    c_terminal_01: "",
                    c_terminal_02: ""
                  }));
                  if (errors.c_terminal_type) setErrors(prev => ({ ...prev, c_terminal_type: "" }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Terminal Type *"
                    error={!!errors.c_terminal_type}
                    helperText={errors.c_terminal_type}
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

            {/* 4. Terminal Name */}
            <Grid size={{ xs: 12, sm: 6 }}>
              {isGateType ? (
                <Autocomplete
                  options={spareGates}
                  loading={loadingSpareGates}
                  getOptionLabel={(option) => option.n_terminal_name || ""}
                  value={spareGates.find(s => s.n_terminal_name === formData.n_terminal_name) || null}
                  disabled={!formData.c_station}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      setFormData(prev => ({
                        ...prev,
                        n_terminal_name: newValue.n_terminal_name,
                        c_terminal_01: newValue.c_terminal_01 || "",
                        c_terminal_02: newValue.c_terminal_02 || "",
                      }));
                      setErrors(prev => ({ ...prev, n_terminal_name: "", c_terminal_01: "" }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Gate (Terminal Name) *"
                      placeholder={!formData.c_station ? "Select Station first" : "Search Gate..."}
                      error={!!errors.n_terminal_name}
                      helperText={errors.n_terminal_name}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingSpareGates ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              ) : (
                <TextField
                  fullWidth
                  label="Terminal Name *"
                  name="n_terminal_name"
                  value={formData.n_terminal_name}
                  onChange={handleInputChange}
                  error={!!errors.n_terminal_name}
                  helperText={errors.n_terminal_name}
                />
              )}
            </Grid>

            {/* 5. Terminal 01 */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Terminal 01"
                name="c_terminal_01"
                value={formData.c_terminal_01}
                onChange={handleInputChange}
                InputProps={{ readOnly: isGateType }}
                variant={isGateType ? "filled" : "outlined"}
                error={!!errors.c_terminal_01}
                helperText={errors.c_terminal_01}
              />
            </Grid>

            {/* 6. Terminal 02 */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Terminal 02"
                name="c_terminal_02"
                value={formData.c_terminal_02 || ""}
                onChange={handleInputChange}
                InputProps={{ readOnly: isGateType }}
                variant={isGateType ? "filled" : "outlined"}
              />
            </Grid>

            {/* 7. Latitude */}
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                fullWidth
                label="Latitude *"
                name="n_lat"
                value={formData.n_lat}
                onChange={handleInputChange}
                error={!!errors.n_lat}
                helperText={errors.n_lat}
              />
            </Grid>

            {/* 8. Longitude */}
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                fullWidth
                label="Longitude *"
                name="n_lng"
                value={formData.n_lng}
                onChange={handleInputChange}
                error={!!errors.n_lng}
                helperText={errors.n_lng}
              />
            </Grid>

            {/* 9. Map Button */}
            <Grid size={{ xs: 12, sm: 2 }} sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Button
                variant="outlined"
                fullWidth
                sx={{ height: '56px' }}
                onClick={() => setIsMapOpen(true)}
              >
                Map
              </Button>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }} className='pt-3'>
          <Button onClick={handleClose} color="inherit" disabled={addLoading} variant='text'>
            Cancel
          </Button>
          <Button onClick={handleAddTerminal} variant="contained" color="primary" disabled={addLoading}>
            {addLoading ? <CircularProgress size={24} color="inherit" /> : 'Submit Terminal'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- MAP SELECTION SUB-DIALOG --- */}
      <Dialog open={isMapOpen} onClose={() => setIsMapOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Select Terminal Location</DialogTitle>
        <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '500px' }}>
          <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Autocomplete
              fullWidth
              size="small"
              options={locationOptions}
              getOptionLabel={(option: any) => option.display_name || ""}
              filterOptions={(x) => x}
              noOptionsText={isSearching ? "Searching..." : inputValue.length < 4 ? "Type at least 4 characters..." : "Location not found"}
              onChange={(_, newValue: any) => {
                if (newValue) {
                  const lat = parseFloat(newValue.lat);
                  const lng = parseFloat(newValue.lon);

                  setTempLocation({ lat, lng });
                  if (mapRef.current) mapRef.current.flyTo([lat, lng], 18);
                }
              }}
              onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search location..."
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
              <Button
                variant="contained"
                color="secondary"
                onClick={handleGetCurrentLocation}
                sx={{ minWidth: '160px' }}
              >
                My Location
              </Button>
            </Tooltip>
          </Box>

          <Box sx={{ flexGrow: 1, position: 'relative' }} className="rounded overflow-hidden mx-5 mb-5 mt-3">
            <MapContainer
              center={[-6.200000, 106.816666]}
              zoom={18}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              <LocationPicker setPosition={(lat, lng) => setTempLocation({ lat, lng })} />
              {tempLocation && <Marker position={[tempLocation.lat, tempLocation.lng]} />}
            </MapContainer>
          </Box>
        </DialogContent>
        <DialogActions className='pt-3'>
          <Box sx={{ width: '100%', px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="text-sm text-gray-500">
              {tempLocation ? `Lat: ${tempLocation.lat.toFixed(6)}, Lng: ${tempLocation.lng.toFixed(6)}` : 'Click map to pin'}
            </div>
            <div>
              <Button onClick={() => setIsMapOpen(false)} color="inherit" sx={{ mr: 1 }}>Cancel</Button>
              <Button onClick={handleConfirmLocation} variant="contained" disabled={!tempLocation}>
                Confirm Location
              </Button>
            </div>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
}
