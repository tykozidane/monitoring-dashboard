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

  export type SyncDataProps = {
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

  type TerminalMonitoringProps = {
    c_terminal_type: string
    c_terminal_sn: string
    c_station: string
    n_project_name?: string
    status: string
    [key: string]: any
  }

  type DataWithAction = TerminalMonitoringProps & {
    action?: string
  }

  type SyncDataProps = {
    sync_id: string
    item_serial_code: string
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
    match_status: 'MATCH' | 'NOT_MATCH'
    signature_status: string | null
  }

  type StationProps = {
    c_station: string
    n_station: string
    n_project_name?: string
  }

  type DeviceDetail = {
    i_id: string
    n_device_name: string
    n_device_type_name: string
    c_device: string
    c_device_type: string
    c_serial_number: string
    status: 'OK' | 'WARNING' | 'ERROR'
    d_time_sensor: string
    c_terminal: string
  }

  type SyncDetailResponse = {
    t_m_terminal: any[]
    t_m_sync_terminal: any[]
  }

  type DeviceOption = {
    c_device: string
    c_device_type: string
    n_device_name: string
  }
}

// File ini harus dianggap sebagai module agar 'declare global' bekerja
export {}
