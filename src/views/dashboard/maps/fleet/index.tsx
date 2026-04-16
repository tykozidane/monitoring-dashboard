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

  const [popupInfo, setPopupInfo] = useState<TerminalMonitoringProps | null>(null);

  const [rawStations, setRawStations] = useState<StationData[]>([])
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

          setRawStations(Array.isArray(stationData) ? stationData : []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (isMounted) setRawStations([]);
      }
    };

    if (activeProject) fetchStations(activeProject);

    return () => { isMounted = false; }
  }, [activeProject]);

  useEffect(() => {
    setRawStations((prev) => prev.map((m) => {
      const find = dashboardData?.list_danger.find((f) => f.c_station === m.c_station)

      if (find) return { ...m, ...find }

      return m
    }))
    setExpandedData((prev) => prev.map((m) => {
      const find = dashboardData?.list_danger.find((f) => f.c_station === m.c_station)?.terminal.find((f) => f.c_terminal_sn === m.c_terminal_sn)

      if (find) return { ...m, ...find }

      return m
    }))
  }, [dashboardData])

  // Memfilter Geojson
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

  // Gunakan useRef untuk melacak station mana yang terakhir kali di-auto-navigate
  const lastNavigatedStationRef = useRef<string | null>(null);

  // Efek Navigasi Otomatis dari Dashboard
  useEffect(() => {
    if (selectedStation && Array.isArray(rawStations) && rawStations.length > 0) {

      // Validasi: Hanya jalankan setViewState & flyTo jika station ini belum difokuskan
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

        // Tandai station ini agar tidak memicu flyTo berulang kali saat interval 5 detik berjalan
        lastNavigatedStationRef.current = selectedStation.c_station;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStation, rawStations, isBelowMdScreen]);

  // Function Fetch Terminal Data
  const handleOpenDetail = async (stationId: string, projectCode?: string) => {
    try {
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
        setExpandedData(terminalData);
      } else {
        setExpandedData([]);
      }

      setExpandedDataSelected(undefined);

      // setPopupInfo(null);
    } catch (err) {
      console.error("Error fetching terminal by station:", err);
      setExpandedData([]);
    }
  }

  // Jika accordion di sidebar di-expand secara manual
  useEffect(() => {
    if (expanded !== false && geojson.features.length > 0) {
      const activeFeature = geojson.features.find(f => f.data.c_station === expanded);

      if (activeFeature) {
        handleOpenDetail(activeFeature.data.c_station, activeFeature.data.c_project);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, geojson.features]);

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

        // Oper state popup ke Sidebar
        popupInfo={popupInfo}
        setPopupInfo={setPopupInfo}
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
