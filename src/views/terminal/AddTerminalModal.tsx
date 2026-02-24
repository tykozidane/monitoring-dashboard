import { useState, useRef, useEffect } from 'react';

import {
  Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, CircularProgress, InputAdornment, IconButton,
  Box, Tooltip, Autocomplete
} from '@mui/material';

// Map Components (Ensure you have installed: npm install leaflet react-leaflet)
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
    c_terminal_type: "CVIM",
    c_project: "KCI",
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
  const mapRef = useRef<L.Map | null>(null); // Reference to control the map (e.g., for flying to coordinates)

  // Autocomplete States
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- Effect untuk Autocomplete Search (Debounce) ---
  useEffect(() => {
    let active = true;

    if (inputValue.length < 4) {
      setOptions([]);

      return undefined;
    }

    const fetchLocations = async () => {
      setIsSearching(true);

      try {
        // limit=5 agar dropdown tidak terlalu panjang
        const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${inputValue}&limit=5`);

        if (active && response.data) {
          setOptions(response.data);
        }
      } catch (error) {
        console.error("Search error", error);
      } finally {
        if (active) setIsSearching(false);
      }
    };

    // Timeout 600ms agar tidak spam API saat user sedang mengetik
    const delayDebounceFn = setTimeout(() => {
      fetchLocations();
    }, 600);

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [inputValue]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({ ...prev, [name]: value }));

    // Remove error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // --- Validation Function ---
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // All fields are required except c_terminal_02
    if (!formData.c_terminal_01) newErrors.c_terminal_01 = "Terminal 01 is required";
    if (!formData.c_terminal_type) newErrors.c_terminal_type = "Terminal Type is required";
    if (!formData.c_project) newErrors.c_project = "Project is required";
    if (!formData.c_station) newErrors.c_station = "Station is required";
    if (!formData.n_terminal_name) newErrors.n_terminal_name = "Terminal Name is required";
    if (!formData.n_lat) newErrors.n_lat = "Latitude is required";
    if (!formData.n_lng) newErrors.n_lng = "Longitude is required";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  const handleAddTerminal = async () => {
    if (!validateForm()) {
      return;
    }

    setAddLoading(true);

    try {
      const resp = await axios.post(`${BASE_URL}/terminal/add-terminal`, formData, {
        headers: {
          'Authorization': API_AUTH,
          'Content-Type': 'application/json'
        }
      });

      if (resp.data?.data?.status === '00') {
        toast.success("Terminal successfully added!");
        handleClose();
        onSuccess();
      } else {
        toast.error(resp.data?.data?.msg || 'Failed to add terminal')
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

  // --- Map Handlers ---
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

  // Geolocation API to get current device location
  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          setTempLocation({ lat: latitude, lng: longitude });

          if (mapRef.current) {
            mapRef.current.flyTo([latitude, longitude], 18); // Zoom to 18 (very close)
          }
        },
        (error) => {
          console.error(error);
          toast.error("Failed to get current location. Please check your browser permissions.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  return (
    <>
      {/* --- ADD TERMINAL MODAL --- */}
      <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>Add New Terminal</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth label="Terminal 01 *" name="c_terminal_01"
                value={formData.c_terminal_01} onChange={handleInputChange}
                error={!!errors.c_terminal_01} helperText={errors.c_terminal_01}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth label="Terminal 02 (Optional)" name="c_terminal_02"
                value={formData.c_terminal_02} onChange={handleInputChange}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth label="Terminal Type *" name="c_terminal_type"
                value={formData.c_terminal_type} onChange={handleInputChange}
                error={!!errors.c_terminal_type} helperText={errors.c_terminal_type}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth label="Project *" name="c_project"
                value={formData.c_project} onChange={handleInputChange}
                error={!!errors.c_project} helperText={errors.c_project}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth label="Station *" name="c_station"
                value={formData.c_station} onChange={handleInputChange}
                error={!!errors.c_station} helperText={errors.c_station}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth label="Terminal Name *" name="n_terminal_name"
                value={formData.n_terminal_name} onChange={handleInputChange}
                error={!!errors.n_terminal_name} helperText={errors.n_terminal_name}
              />
            </Grid>

            {/* Coordinates Section with Map Button */}
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                fullWidth label="Latitude *" name="n_lat"
                value={formData.n_lat} onChange={handleInputChange}
                error={!!errors.n_lat} helperText={errors.n_lat}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                fullWidth label="Longitude *" name="n_lng"
                value={formData.n_lng} onChange={handleInputChange}
                error={!!errors.n_lng} helperText={errors.n_lng}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 2 }} sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Button
                variant="outlined"
                fullWidth
                sx={{ height: '56px' }} // Match TextField height
                onClick={() => setIsMapOpen(true)}
              >
                <i className="tabler-map-pin text-xl mr-2" /> Map
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

          {/* Map Controls: Search & Current Location */}
          <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>

            {/* Mengubah TextField menjadi Autocomplete MUI */}
            <Autocomplete
              fullWidth
              size="small"
              options={options}
              getOptionLabel={(option: any) => option.display_name || ""}
              filterOptions={(x) => x} // Disable filter lokal, karena API Nominatim yang handle
              noOptionsText={isSearching ? "Searching..." : inputValue.length < 4 ? "Type at least 4 characters..." : "Location not found"}
              onChange={(_, newValue: any) => {
                if (newValue) {
                  const lat = parseFloat(newValue.lat);
                  const lng = parseFloat(newValue.lon);

                  setTempLocation({ lat, lng });

                  if (mapRef.current) {
                    mapRef.current.flyTo([lat, lng], 18);
                  }
                }
              }}
              onInputChange={(_, newInputValue) => {
                setInputValue(newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search location (e.g., Sudirman Station)"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isSearching ? <CircularProgress color="inherit" size={20} /> : <i className="tabler-search" />}
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
                sx={{ minWidth: '180px' }}
              >
                <i className="tabler-current-location mr-2" /> My Location
              </Button>
            </Tooltip>
          </Box>

          <Box sx={{ flexGrow: 1, position: 'relative' }} className="rounded overflow-hidden mx-5 mb-5 mt-3">
            <MapContainer
              center={[-6.200000, 106.816666]} // Default center (Jakarta)
              zoom={18} // Start with a very close zoom
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19} // OSM max zoom
              />
              <LocationPicker setPosition={(lat, lng) => setTempLocation({ lat, lng })} />
              {tempLocation && <Marker position={[tempLocation.lat, tempLocation.lng]} />}
            </MapContainer>
          </Box>
        </DialogContent>
        <DialogActions className='pt-3'>
          <Grid container justifyContent="space-between" alignItems="center" sx={{ width: '100%', px: 2 }}>
            <div className="text-sm text-gray-500">
              {tempLocation ? `Lat: ${tempLocation.lat.toFixed(6)}, Lng: ${tempLocation.lng.toFixed(6)}` : 'Click on the map to pin a location'}
            </div>
            <div>
              <Button onClick={() => setIsMapOpen(false)} color="inherit" sx={{ mr: 1 }}>Cancel</Button>
              <Button onClick={handleConfirmLocation} variant="contained" disabled={!tempLocation}>
                Confirm Location
              </Button>
            </div>
          </Grid>
        </DialogActions>
      </Dialog>
    </>
  );
}
