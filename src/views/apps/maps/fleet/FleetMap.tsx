// React Imports
import { useRef, useEffect } from 'react'

// Third-party Imports
import { Map, Marker } from 'react-map-gl/mapbox'
import type { MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

// Types Imports
import type { viewStateType } from './index'

// Style Imports
import './styles.css'
import { type TerminalMonitoringProps } from './FleetSidebar'

type Props = {
  viewState: viewStateType
  carIndex: number | false
  geojson: {
    type: string
    features: {
      type: string
      geometry: {
        type: string
        longitude: number
        latitude: number
      }
    }[]
  }
  expandedDataSelected?: viewStateType
  expandedData?: TerminalMonitoringProps[]
  mapboxAccessToken: string
}

const FleetMap = (props: Props) => {
  // Vars
  const { carIndex, viewState, geojson, mapboxAccessToken, expandedData, expandedDataSelected } = props

  // Hooks
  const mapRef = useRef<MapRef>(null!)

  useEffect(() => {
    mapRef.current?.flyTo({ center: [viewState.longitude, viewState.latitude], zoom: 16 })
  }, [viewState])

  useEffect(() => {
    if (expandedDataSelected) {
      mapRef.current?.flyTo({ center: [expandedDataSelected.longitude, expandedDataSelected.latitude], zoom: expandedDataSelected.zoom })
    }
  }, [expandedDataSelected])

  return (
    <div className='is-full bs-full'>
      <Map
        mapboxAccessToken={mapboxAccessToken}
        ref={mapRef}
        mapStyle='mapbox://styles/fembinurilham/cmjqzdxpx00el01sd5al36oz7'
        attributionControl={false}
        initialViewState={{
          longitude: 106.838469,
          latitude: -6.242127,
          zoom: 16,
          bearing: -50,
          pitch: 80
        }}
      >
        {geojson.features.map((item, index) => {
          return (
            <Marker
              key={index}
              longitude={item.geometry.longitude}
              latitude={item.geometry.latitude}
              style={{ display: 'flex' }}
            >
              <img
                src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png'
                height={35}
                width={20}
                {...(index === carIndex && {
                  style: { filter: 'drop-shadow(0 0 7px var(--mui-palette-primary-main))' }
                })}
              />
            </Marker>
          )
        })}
        {expandedData?.map((item, index) => {
          return (
            <Marker
              key={index}
              longitude={Number(item.n_lng)}
              latitude={Number(item.n_lat)}
              anchor="top"
            >
              <div
                className={`${Number(expandedDataSelected?.longitude) == Number(item.n_lng) && Number(expandedDataSelected?.latitude) == Number(item.n_lat) && 'animate-bounce'}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column', // Menumpuk ke bawah
                  alignItems: 'center',   // Posisi tengah horizontal
                  cursor: 'pointer'
                }}
              >
                <img
                  src='https://cdn-icons-png.flaticon.com/512/3606/3606645.png'
                  height={20}
                  width={20}
                  {...(index === carIndex && {
                    style: { filter: 'drop-shadow(0 0 7px var(--mui-palette-primary-main))' }
                  })}
                />
                {Number(expandedDataSelected?.longitude) == Number(item.n_lng) && Number(expandedDataSelected?.latitude) == Number(item.n_lat) && (
                  <p className='text-[10px] leading-3 font-bold text-gray-800 '>{item.c_terminal_type} </p>
                )}
                {Number(expandedDataSelected?.longitude) == Number(item.n_lng) && Number(expandedDataSelected?.latitude) == Number(item.n_lat) && (
                  <p className='text-[10px] leading-3 font-bold text-gray-800 '> ({item.c_terminal_01}{item.c_terminal_02 ? ' | ' + item.c_terminal_02 : ''})</p>
                )}
              </div>
            </Marker>
          )
        })}
      </Map>
    </div>
  )
}

export default FleetMap
