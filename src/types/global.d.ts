declare global {
  type DeviceDetail = {
    c_project: string
    n_project_name: string
    n_project_desc: string
    c_device: string
    n_device_name: string
    c_device_type: string
    n_device_type_name: string
    c_device_subtype: string
    n_device_subtype_name: string
    c_station: string
    n_station: string
    c_terminal: string
    n_lat: string
    n_lng: string
    d_time_sensor: string // ISO Date String
    created_at: string // ISO Date String
    status: 'OK' | 'WARNING' | 'ERROR' | string
  }

  type TerminalMonitoringProps = {
    c_project: string
    n_project_name: string
    n_project_desc: string

    c_terminal_sn: string
    c_terminal_type: string

    c_terminal_01: string
    c_terminal_02: string | null

    c_station: string
    n_station: string

    n_lat: string
    n_lng: string

    d_monitoring: string | null // null saat NO DATA
    status: string
    progress: number
  }

  type StationProps = {
    c_project: string
    n_project_name: string
    n_project_desc: string
    c_station: string
    n_station: string
    n_lat: string
    n_lng: string
    status: string
  }

  type ViewStateType = {
    longitude: number
    latitude: number
    zoom: number
  }

  type GeojsonProps = {
    type: 'FeatureCollection'
    features: Array<{
      type: 'Feature'
      geometry: {
        type: 'Point'
        longitude: number
        latitude: number
      }
      data: DeviceDetail // Mengacu pada DeviceDetail di atas
    }>
  }
}

// File ini harus dianggap sebagai module agar 'declare global' bekerja
export {}
