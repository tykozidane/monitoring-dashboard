'use client'

// React Imports
import { useState, useEffect } from 'react'

import axios from 'axios'

// MUI Imports
import Backdrop from '@mui/material/Backdrop'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Third-party Imports
import classNames from 'classnames'

//Components Imports
import CustomIconButton from '@core/components/mui/IconButton'
import FleetSidebar from './FleetSidebar'
import FleetMap from './FleetMap'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Util Imports
import { commonLayoutClasses } from '@layouts/utils/layoutClasses'


export type DeviceDetail = {
  c_project: string;
  n_project_name: string;
  n_project_desc: string;
  c_device: string;
  n_device_name: string;
  c_device_type: string;
  n_device_type_name: string;
  c_device_subtype: string;
  n_device_subtype_name: string;
  c_station: string;
  n_station: string;
  c_terminal: string;
  n_lat: string;
  n_lng: string;
  d_time_sensor: string; // ISO Date String
  created_at: string;    // ISO Date String
  status: "OK" | "WARNING" | "ERROR" | string;
};

export type coordinate = {
  c_project: string,
  n_project_name: string,
  n_project_desc: string,
  c_station: string,
  n_station: string,
  n_lat: string,
  n_lng: string,
  status: string
}

export type viewStateType = {
  longitude: number
  latitude: number
  zoom: number
}

export type geojsonProps = {

  type: 'FeatureCollection',
  features: Array<{
    type: 'Feature',
    geometry: {
      type: 'Point',
      longitude: number,
      latitude: number
    },
    data: DeviceDetail
  }>
}

const Fleet = ({ mapboxAccessToken }: { mapboxAccessToken: string }) => {
  // States
  const [backdropOpen, setBackdropOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expanded, setExpanded] = useState<number | false>(false)
  const [expandedData, setExpandedData] = useState<DeviceDetail[]>([])
  const [expandedDataSelected, setExpandedDataSelected] = useState<viewStateType>()

  const [viewState, setViewState] = useState<viewStateType>({
    longitude: 106.900,
    latitude: -6.236,
    zoom: 12.5
  })


  const [geojson, setGeojson] = useState<geojsonProps>({
    type: 'FeatureCollection',
    features: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/pages/monit/station');

        setGeojson({
          type: 'FeatureCollection',
          features: response.data.data.map((map: coordinate) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              longitude: Number(map.n_lng),
              latitude: Number(map.n_lat)
            },
            data: map
          }))
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    // Auto-refresh every 60 seconds
    // const interval = setInterval(fetchData, 60000);
    // return () => clearInterval(interval);
  }, []);

  // Hooks
  const { settings } = useSettings()
  const isBelowLgScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))
  const isBelowMdScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'))
  const isBelowSmScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))

  useEffect(() => {
    if (!isBelowMdScreen && backdropOpen && sidebarOpen) {
      setBackdropOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBelowMdScreen])

  useEffect(() => {
    if (!isBelowSmScreen && sidebarOpen) {
      setBackdropOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBelowSmScreen])

  useEffect(() => {
    if (expanded !== false && expanded > -1 && geojson.features[expanded])
      handleOpenDetail(geojson.features[expanded].data)
  }, [expanded, geojson])

  const handleOpenDetail = async (item: coordinate) => {
    try {
      const response = await axios.post('http://localhost:3000/api/pages/monit/alat', {
        c_station: item.c_station
      });

      console.log("Response", response.data.data)

      setExpandedData(response.data.data);
      setExpandedDataSelected(undefined)
    } catch (err) {
      console.error("Error fetching:", err);
    }
  }

  return (
    <div
      className={classNames(
        commonLayoutClasses.contentHeightFixed,
        'flex is-full bs-full  overflow-hidden rounded-xl relative',
        {
          border: settings.skin === 'bordered',
          'shadow-md': settings.skin !== 'bordered'
        }
      )}
    >
      {isBelowMdScreen ? (
        <CustomIconButton
          variant='contained'
          color='primary'
          className='absolute top-4 left-4 z-10 bg-backgroundPaper text-textPrimary shadow-xs shadow-gray-500 hover:bg-backgroundPaper focus:bg-backgroundPaper active:bg-backgroundPaper'
          onClick={() => {
            setSidebarOpen(true)
            setBackdropOpen(true)
          }}
        >
          <i className='tabler-menu-2' />
        </CustomIconButton>
      ) : null}
      <FleetSidebar
        backdropOpen={backdropOpen}
        setBackdropOpen={setBackdropOpen}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isBelowMdScreen={isBelowMdScreen}
        isBelowLgScreen={isBelowLgScreen}
        isBelowSmScreen={isBelowSmScreen}
        expanded={expanded}
        expandedData={expandedData}
        setExpanded={setExpanded}
        setViewState={setViewState}
        geojson={geojson}
        setExpandedDataSelected={setExpandedDataSelected}
      />
      <FleetMap carIndex={expanded} expandedDataSelected={expandedDataSelected} viewState={viewState} geojson={geojson} expandedData={expandedData} mapboxAccessToken={mapboxAccessToken} />
      <Backdrop open={backdropOpen} onClick={() => setBackdropOpen(false)} className='absolute z-10' />
    </div>
  )
}

export default Fleet
