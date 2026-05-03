'use client'

// React Imports
import { useState, useEffect, useRef } from 'react'

// MUI Imports
import Backdrop from '@mui/material/Backdrop'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Third-party Imports
import classNames from 'classnames'
import { getSession } from 'next-auth/react'

// Components Imports
import CustomIconButton from '@core/components/mui/IconButton'
import FleetSidebar from './FleetSidebar'
import FleetMap from './FleetMap'
import { useSettings } from '@core/hooks/useSettings'
import { commonLayoutClasses } from '@layouts/utils/layoutClasses'
import { ApiAxios } from '@/libs/ApiAxios'
import type { DashboardProcessedData } from '../..'

export interface TerminalMonitoringProps {
  c_project: string;
  c_station: string;
  c_terminal_sn: string;
  c_terminal_type: string;
  c_terminal_01?: string;
  c_terminal_02?: string;
  n_lat: string;
  n_lng: string;
  status: string;
}
export interface ViewStateType {
  longitude: number;
  latitude: number;
  zoom: number;
}
export interface StationData {
  c_project: string;
  n_project_name: string | null;
  n_project_desc: string | null;
  c_station: string;
  n_station: string;
  n_lat: string;
  n_lng: string;
  status: string;
}
export interface FeatureData {
  type: string;
  geometry: { type: string; longitude: number; latitude: number };
  data: StationData;
}
export interface GeojsonProps {
  type: string;
  features: FeatureData[];
}

type FleetProps = {
  mapboxAccessToken: string;
  selectedStation: StationData | null;
  activeProject: string | null;
  dashboardData: DashboardProcessedData | null
}

const Fleet = ({ mapboxAccessToken, selectedStation, activeProject, dashboardData }: FleetProps) => {
  const [backdropOpen, setBackdropOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [expanded, setExpanded] = useState<string | false>(false)
  const [expandedData, setExpandedData] = useState<TerminalMonitoringProps[]>([])
  const [expandedDataSelected, setExpandedDataSelected] = useState<ViewStateType>()
  const lastExpandedRef = useRef<string | false>(false);

  const [popupInfo, setPopupInfo] = useState<TerminalMonitoringProps | null>(null);

  const [rawStations, setRawStations] = useState<StationData[]>([])
  const [originalStations, setOriginalStations] = useState<StationData[]>([])
  const [geojson, setGeojson] = useState<GeojsonProps>({ type: 'FeatureCollection', features: [] })
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [viewState, setViewState] = useState<ViewStateType>({
    longitude: 106.900,
    latitude: -6.236,
    zoom: 12.5
  })

  const { settings } = useSettings()
  const isBelowLgScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))
  const isBelowMdScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'))
  const isBelowSmScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))

  // Fetch Stations
  useEffect(() => {
    let isMounted = true;

    const fetchStations = async (projectCode: string) => {
      try {
        const session = await getSession();
        const apiUrl = process.env.NEXT_PUBLIC_API_MONITORING_URL || process.env.API_MONITORING_URL || 'https://da-device.devops-nutech.com/api/v1';

        const response = await ApiAxios.post(`${apiUrl}/output/all-station`, { c_project: projectCode }, {
          headers: {
            'Authorization': `Bearer ${session?.user?.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (isMounted) {
          const stationData: StationData[] = response.data?.data;
          const validData = Array.isArray(stationData) ? stationData : [];

          setOriginalStations(validData);
          setRawStations(validData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);

        if (isMounted) {
          setOriginalStations([]);
          setRawStations([]);
        }
      }
    };

    if (activeProject) fetchStations(activeProject);

    return () => { isMounted = false; }
  }, [activeProject]);

  useEffect(() => {
    if (!dashboardData) return;

    setRawStations(originalStations.map((m) => {
      const findDanger = dashboardData.list_danger?.find((f) => f.c_station === m.c_station);

      if (findDanger) return { ...m, ...findDanger };

      const findWarning = dashboardData.list_warning?.find((f) => f.c_station === m.c_station);

      if (findWarning) return { ...m, ...findWarning };

      return { ...m };
    }));

    setExpandedData((prev) => {
      const newExpandedData = prev.map((m) => {
        const findStationDanger = dashboardData.list_danger?.find((f) => f.c_station === m.c_station);
        const findStationWarning = dashboardData.list_warning?.find((f) => f.c_station === m.c_station);

        let findTerminal = findStationDanger?.terminal?.find((f) => f.c_terminal_sn === m.c_terminal_sn);

        if (!findTerminal) {
          findTerminal = findStationWarning?.terminal?.find((f) => f.c_terminal_sn === m.c_terminal_sn);
        }

        if (findTerminal) return { ...m, ...findTerminal };

        return { ...m, status: 'normal' };
      });

      setPopupInfo((currentPopup) => {
        if (currentPopup) {
          const updatedPopupData = newExpandedData.find(t => t.c_terminal_sn === currentPopup.c_terminal_sn);

          if (updatedPopupData) return { ...currentPopup, ...updatedPopupData };
        }

        return currentPopup;
      });

      return newExpandedData;
    });
  }, [dashboardData, originalStations]);

  useEffect(() => {
    let filtered = Array.isArray(rawStations) ? [...rawStations] : [];

    if (searchQuery) {
      filtered = filtered.filter(s => s?.n_station?.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    setGeojson({
      type: 'FeatureCollection',
      features: filtered.map((mapItem) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          longitude: Number(mapItem.n_lng) || 0,
          latitude: Number(mapItem.n_lat) || 0
        },
        data: mapItem
      }))
    });
  }, [rawStations, searchQuery]);

  const lastNavigatedStationRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedStation && Array.isArray(rawStations) && rawStations.length > 0) {
      if (lastNavigatedStationRef.current !== selectedStation.c_station) {
        setSearchQuery(selectedStation.n_station);
        setExpanded(selectedStation.c_station);

        setViewState({
          longitude: Number(selectedStation.n_lng) || 0,
          latitude: Number(selectedStation.n_lat) || 0,
          zoom: 16
        });

        handleOpenDetail(selectedStation.c_station, selectedStation.c_project);

        if (isBelowMdScreen) {
          setSidebarOpen(true);
          setBackdropOpen(true);
        }

        lastNavigatedStationRef.current = selectedStation.c_station;
      }
    }
  }, [selectedStation, rawStations, isBelowMdScreen]);

  const [loadingExpanded, setLoadingExpanded] = useState<boolean>(false);

  const handleOpenDetail = async (stationId: string, projectCode?: string, isBackground = false) => {
    try {
      if (!isBackground) {
        setLoadingExpanded(true);
        setExpandedData([]);
      }

      const session = await getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_MONITORING_URL || process.env.API_MONITORING_URL || 'https://da-device.devops-nutech.com/api/v1';

      const response = await ApiAxios.post(`${apiUrl}/output/terminal-by-station`, {
        c_station: stationId,
        c_project: projectCode ?? activeProject ?? 'KCI'
      }, {
        headers: {
          'Authorization': `Bearer ${session?.user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const terminalData = response.data?.data;

      if (Array.isArray(terminalData)) {
        const syncedData = terminalData.map((term) => {
          const findStationDanger = dashboardData?.list_danger?.find((f) => f.c_station === stationId);
          const findStationWarning = dashboardData?.list_warning?.find((f) => f.c_station === stationId);

          let findTerminal = findStationDanger?.terminal?.find((f) => f.c_terminal_sn === term.c_terminal_sn);

          if (!findTerminal) {
            findTerminal = findStationWarning?.terminal?.find((f) => f.c_terminal_sn === term.c_terminal_sn);
          }

          if (findTerminal) return { ...term, ...findTerminal };

          return { ...term, status: 'normal' };
        });

        setExpandedData(syncedData);
      } else {
        setExpandedData([]);
      }

      if (!isBackground) setExpandedDataSelected(undefined);

    } catch (err) {
      console.error("Error fetching terminal by station:", err);
      if (!isBackground) setExpandedData([]);
    } finally {
      if (!isBackground) setLoadingExpanded(false);
    }
  }


  // --- FUNGSI BARU: Mengambil seluruh terminal dengan melakukan hit API per Stasiun ---
  const fetchAllTerminalsApi = async (): Promise<TerminalMonitoringProps[]> => {
    try {
      const session = await getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_MONITORING_URL || process.env.API_MONITORING_URL || 'https://da-device.devops-nutech.com/api/v1';

      // 1. Pastikan kita punya daftar stasiun yang akan di-looping
      if (!originalStations || originalStations.length === 0) {
        console.warn("No station data available to fetch terminals.");

        return [];
      }

      // 2. Buat array of Promises. Kita hit API terminal-by-station untuk setiap stasiun secara paralel
      const promises = originalStations.map((station) =>
        ApiAxios.post(`${apiUrl}/output/terminal-by-station`, {
          c_station: station.c_station,
          c_project: activeProject ?? 'KCI'
        }, {
          headers: {
            'Authorization': `Bearer ${session?.user?.accessToken}`,
            'Content-Type': 'application/json'
          }
        }).catch((err) => {
          // Tangkap error per API agar jika 1 stasiun gagal, pencarian keseluruhan tidak terhenti (crash)
          console.error(`Failed to fetch terminal for station ${station.c_station}:`, err);

          return null; // Return null untuk stasiun yang gagal
        })
      );

      // 3. Jalankan semua promise secara bersamaan
      const responses = await Promise.all(promises);

      // 4. Gabungkan (flatten) data dari semua stasiun menjadi satu array besar
      let allTerminals: TerminalMonitoringProps[] = [];

      responses.forEach((res) => {
        if (res && res.data && Array.isArray(res.data.data)) {
          allTerminals = [...allTerminals, ...res.data.data];
        }
      });

      // 5. Lakukan sinkronisasi langsung dengan status realtime Dashboard
      const syncedData = allTerminals.map((term) => {
        const findStationDanger = dashboardData?.list_danger?.find((f) => f.c_station === term.c_station);
        const findStationWarning = dashboardData?.list_warning?.find((f) => f.c_station === term.c_station);

        let findTerminal = findStationDanger?.terminal?.find((f) => f.c_terminal_sn === term.c_terminal_sn);

        if (!findTerminal) {
          findTerminal = findStationWarning?.terminal?.find((f) => f.c_terminal_sn === term.c_terminal_sn);
        }

        if (findTerminal) return { ...term, ...findTerminal };

        return { ...term, status: 'normal' };
      });

      return syncedData;

    } catch (error) {
      console.error("Failed to fetch all terminals in bulk:", error);

      return [];
    }
  };

  useEffect(() => {
    if (expanded !== false && expanded !== lastExpandedRef.current) {
      const activeFeature = geojson.features.find(f => f.data.c_station === expanded);

      if (activeFeature) {
        handleOpenDetail(activeFeature.data.c_station, activeFeature.data.c_project, false);
        lastExpandedRef.current = expanded;
      }
    } else if (expanded === false) {
      lastExpandedRef.current = false;
    }
  }, [expanded]);

  return (
    <div
      className={classNames(
        commonLayoutClasses.contentHeightFixed,
        'flex is-full overflow-hidden rounded-xl relative',
        { border: settings.skin === 'bordered', 'shadow-md': settings.skin !== 'bordered' }
      )}
      style={{ height: 'calc(100vh - 110px)' }}
    >
      {isBelowMdScreen ? (
        <CustomIconButton
          variant='contained' color='primary'
          className='absolute top-4 left-4 z-10 bg-backgroundPaper text-textPrimary shadow-xs shadow-gray-500 hover:bg-backgroundPaper'
          onClick={() => { setSidebarOpen(true); setBackdropOpen(true); }}
        >
          <i className='tabler-menu-2' />
        </CustomIconButton>
      ) : null}

      <FleetSidebar
        backdropOpen={backdropOpen} setBackdropOpen={setBackdropOpen}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        isBelowMdScreen={isBelowMdScreen} isBelowLgScreen={isBelowLgScreen} isBelowSmScreen={isBelowSmScreen}
        expanded={expanded} setExpanded={setExpanded}
        expandedData={expandedData} setExpandedDataSelected={setExpandedDataSelected}
        setViewState={setViewState}
        geojson={geojson}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        popupInfo={popupInfo}
        setPopupInfo={setPopupInfo}
        loadingExpanded={loadingExpanded}

        // Passing fungsi hit API ke sidebar!
        fetchAllTerminalsApi={fetchAllTerminalsApi}
      />

      <FleetMap
        expandedStationId={expanded}
        expandedDataSelected={expandedDataSelected}
        viewState={viewState}
        geojson={geojson}
        expandedData={expandedData}
        mapboxAccessToken={mapboxAccessToken}
        activeProject={activeProject}
        popupInfo={popupInfo}
        setPopupInfo={setPopupInfo}
      />

      <Backdrop open={backdropOpen} onClick={() => setBackdropOpen(false)} className='absolute z-10' />
    </div>
  )
}

export default Fleet
