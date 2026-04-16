// React Imports
import { useRef, useEffect, useState } from 'react'

// Third-party Imports
import { Map, Marker, Popup } from 'react-map-gl/mapbox'
import type { MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getSession } from 'next-auth/react'

// Custom Imports
import { ApiAxios } from '@/libs/ApiAxios'
import './styles.css'
import type { GeojsonProps, TerminalMonitoringProps, ViewStateType } from './'

type Props = {
  viewState: ViewStateType
  expandedStationId: string | false
  geojson: GeojsonProps
  expandedDataSelected?: ViewStateType
  expandedData?: TerminalMonitoringProps[]
  mapboxAccessToken: string
  activeProject: string | null;

  // Prop Popup Control
  popupInfo: TerminalMonitoringProps | null;
  setPopupInfo: (value: TerminalMonitoringProps | null) => void;
}

export interface DeviceInfo {
  c_device: string;
  c_device_type: string;
  c_direction: number;
  c_serial_number: string;
  status: string;
}

export interface MetricInfo {
  c_data_type: string;
  measure: string;
  notes: string | null;
  status: string;
  value: number;
}

// Helper untuk sorting (Danger -> Warning -> Normal)
const getStatusWeight = (status: string) => {
  const s = status?.toLowerCase() || '';

  if (s === 'danger') return 1;
  if (s === 'warning') return 2;
  if (s === 'normal') return 3;

  return 4; // Untuk NO_DATA atau status lainnya
};

// Helper untuk warna badge status agar konsisten
const getStatusBadgeStyle = (status: string) => {
  const s = status?.toLowerCase() || '';

  if (s === 'danger') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (s === 'warning') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (s === 'normal') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
};

const FleetMap = (props: Props) => {
  const { expandedStationId, viewState, geojson, mapboxAccessToken, expandedData, expandedDataSelected, activeProject, popupInfo, setPopupInfo } = props

  const mapRef = useRef<MapRef>(null!)
  const [deviceDetails, setDeviceDetails] = useState<DeviceInfo[]>([]);
  const [metricDetails, setMetricDetails] = useState<MetricInfo[]>([]);
  const [loadingPopup, setLoadingPopup] = useState<boolean>(false);

  useEffect(() => {
    mapRef.current?.flyTo({ center: [viewState.longitude, viewState.latitude], zoom: viewState.zoom || 16 })
  }, [viewState])

  useEffect(() => {
    if (expandedDataSelected) {
      mapRef.current?.flyTo({ center: [expandedDataSelected.longitude, expandedDataSelected.latitude], zoom: expandedDataSelected.zoom })
    }
  }, [expandedDataSelected])

  useEffect(() => {
    if (!popupInfo) {
      setDeviceDetails([]);
      setMetricDetails([]);

      return;
    }

    let isMounted = true;

    const fetchDetails = async () => {
      setLoadingPopup(true);

      try {
        const session = await getSession();
        const apiUrl = process.env.NEXT_PUBLIC_API_MONITORING_URL || process.env.API_MONITORING_URL || 'https://da-device.devops-nutech.com/api/v1';

        const payload = {
          c_project: activeProject ?? "KCI",
          c_terminal_sn: popupInfo.c_terminal_sn,
          c_station: popupInfo.c_station
        };

        const response = await ApiAxios.post(`${apiUrl}/terminal/detail-terminal-monitoring`, payload, {
          headers: {
            'Authorization': `Bearer ${session?.user?.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (isMounted) {
          // Destructure data dari response Axios -> response.data.data
          const apiData = response.data?.data;

          const rawDevices = Array.isArray(apiData?.devices) ? apiData.devices : [];

          // Datanya ada di array "data" di dalam object "data"
          const rawMetrics = Array.isArray(apiData?.data) ? apiData.data : [];

          // Sort berdasarkan prioritas status
          const sortedDevices = [...rawDevices].sort((a, b) => getStatusWeight(a.status) - getStatusWeight(b.status));
          const sortedMetrics = [...rawMetrics].sort((a, b) => getStatusWeight(a.status) - getStatusWeight(b.status));

          setDeviceDetails(sortedDevices);
          setMetricDetails(sortedMetrics);
        }
      } catch (error) {
        console.error("Error fetching terminal details", error);
      } finally {
        if (isMounted) setLoadingPopup(false);
      }
    };

    fetchDetails();

    return () => { isMounted = false; }
  }, [popupInfo, activeProject]);

  // Kalkulasi Badge Keseluruhan (Devices + Metrics)
  const totalDanger = [...deviceDetails, ...metricDetails].filter(i => i.status?.toLowerCase() === 'danger').length;
  const totalWarning = [...deviceDetails, ...metricDetails].filter(i => i.status?.toLowerCase() === 'warning').length;
  const totalNormal = [...deviceDetails, ...metricDetails].filter(i => i.status?.toLowerCase() === 'normal').length;

  return (
    <div className='is-full h-full w-full'>
      <style dangerouslySetInnerHTML={{
        __html: `
        .mapboxgl-popup-content {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .mapboxgl-popup-tip {
          border-top-color: var(--mui-palette-background-paper) !important;
          border-bottom-color: var(--mui-palette-background-paper) !important;
        }
      `}} />

      <Map
        mapboxAccessToken={mapboxAccessToken}
        ref={mapRef}
        mapStyle='mapbox://styles/fembinurilham/cmjqzdxpx00el01sd5al36oz7'
        attributionControl={false}
        initialViewState={{
          longitude: 106.838469,
          latitude: -6.242127,
          zoom: 12,
          bearing: 0,
          pitch: 0
        }}
      >
        {/* MARKER STASIUN */}
        {geojson.features.map((item, index) => {
          const isActiveStation = expandedStationId === item.data.c_station;


          return (
            <Marker key={item.data.c_station || index} longitude={item.geometry.longitude} latitude={item.geometry.latitude} style={{ display: 'flex' }}>
              <img
                src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png'
                height={35} width={20}
                {...(isActiveStation && { style: { filter: 'drop-shadow(0 0 8px var(--mui-palette-primary-main))', transform: 'scale(1.2)', transition: '0.2s' } })}
              />
            </Marker>
          )
        })}

        {/* MARKER TERMINAL */}
        {expandedData?.map((item, index) => {
          const isSelectedTerminal = Number(expandedDataSelected?.longitude) === Number(item.n_lng) && Number(expandedDataSelected?.latitude) === Number(item.n_lat);


          return (
            <Marker
              key={`terminal-${index}`}
              longitude={Number(item.n_lng)}
              latitude={Number(item.n_lat)}
              anchor="top"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo(item);
              }}
            >
              <div className={`${isSelectedTerminal ? 'animate-bounce' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                <img
                  src='https://cdn-icons-png.flaticon.com/512/3606/3606645.png'
                  height={20} width={20}
                  {...(isSelectedTerminal && { style: { filter: 'drop-shadow(0 0 7px var(--mui-palette-primary-main))' } })}
                />
                {isSelectedTerminal && (
                  <p className='text-[10px] leading-3 font-bold text-gray-800 bg-white/80 px-1 rounded shadow-sm'>{item.c_terminal_type} </p>
                )}
                {isSelectedTerminal && (
                  <p className='text-[10px] leading-3 font-bold text-gray-800 bg-white/80 px-1 rounded mt-0.5 shadow-sm'> ({item.c_terminal_01}{item.c_terminal_02 ? ' | ' + item.c_terminal_02 : ''})</p>
                )}
              </div>
            </Marker>
          )
        })}

        {/* POPUP / TOOLTIP DATA DARI API */}
        {popupInfo && (
          <Popup
            anchor="bottom"
            longitude={Number(popupInfo.n_lng)}
            latitude={Number(popupInfo.n_lat)}
            onClose={() => setPopupInfo(null)}
            closeOnClick={true}
            closeButton={false}
            offset={25}
            maxWidth="800px" // Diperlebar agar cukup untuk dua tabel
          >
            <div className="w-[800px] max-w-[90vw] flex flex-col bg-backgroundPaper border border-divider rounded shadow-lg text-textPrimary overflow-hidden">

              {/* HEADER (Sticky Title & Badges) */}
              <div className="p-3 border-b border-divider bg-backgroundPaper z-10 shrink-0 flex justify-between items-center">
                <p className="font-bold text-[14px]">
                  {popupInfo.c_terminal_type} - {popupInfo.c_terminal_sn}
                </p>
                {/* STATUS BADGES KALKULASI */}
                {!loadingPopup && (
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">DANGER: {totalDanger}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700">WARNING: {totalWarning}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">NORMAL: {totalNormal}</span>
                  </div>
                )}
              </div>

              {/* BODY (Scrollable area) - Dibuat dua kolom */}
              <div
                className="max-h-[300px] overflow-y-auto scroll-on-hover p-3 pt-2 flex gap-4"
                style={{ overscrollBehavior: 'contain' }}
                onWheel={(e) => e.stopPropagation()}
              >
                {loadingPopup ? (
                  <div className="flex justify-center items-center w-full py-4">
                    <span className="text-textSecondary text-xs italic animate-pulse">Loading data...</span>
                  </div>
                ) : (
                  <>
                    {/* KOLOM KIRI: DEVICES */}
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-textSecondary mb-1 sticky top-0 bg-backgroundPaper py-1 z-10 border-b border-divider">DEVICES</p>
                      {deviceDetails.length === 0 ? (
                        <div className="py-2 text-textSecondary text-xs italic">No device data.</div>
                      ) : (
                        <table className="w-full text-left border-collapse text-[11px]">
                          <tbody>
                            {deviceDetails.map((dev, idx) => (
                              <tr key={`dev-${idx}`} className="border-b border-divider last:border-0 hover:bg-actionHover transition-colors">
                                <td className="py-2 pl-1 pr-2 font-medium whitespace-nowrap uppercase">{dev.c_device.replace(/_/g, ' ') || '-'}</td>
                                <td className="py-2 pr-2 text-textSecondary whitespace-nowrap">{dev.c_device_type || '-'}</td>
                                <td className="py-2 pr-1 whitespace-nowrap text-right">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getStatusBadgeStyle(dev.status)}`}>
                                    {dev.status.toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* PEMBATAS TENGAH */}
                    <div className="w-px bg-divider shrink-0"></div>

                    {/* KOLOM KANAN: METRICS */}
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-textSecondary mb-1 sticky top-0 bg-backgroundPaper py-1 z-10 border-b border-divider">METRICS</p>
                      {metricDetails.length === 0 ? (
                        <div className="py-2 text-textSecondary text-xs italic">No metric data.</div>
                      ) : (
                        <table className="w-full text-left border-collapse text-[11px]">
                          <tbody>
                            {metricDetails.map((metric, idx) => (
                              <tr key={`metric-${idx}`} className="border-b border-divider last:border-0 hover:bg-actionHover transition-colors">
                                <td className="py-2 pl-1 pr-2 font-medium whitespace-nowrap uppercase">{metric.c_data_type.replace(/_/g, ' ') || '-'}</td>
                                <td className="py-2 pr-2 text-textSecondary whitespace-nowrap font-mono text-right">
                                  {metric.value} {metric.measure}
                                </td>
                                <td className="py-2 pr-1 whitespace-nowrap text-right">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getStatusBadgeStyle(metric.status)}`}>
                                    {metric.status.toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}

export default FleetMap
