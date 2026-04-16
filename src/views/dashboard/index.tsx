'use client'

// React Imports
import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { Grid, Card, CardContent, List, ListItem, ListItemText, Autocomplete, TextField } from '@mui/material'

// Third-party Imports
import type { ApexOptions } from 'apexcharts'
import { getSession } from 'next-auth/react'

// Project Imports
import { ApiAxios } from '@/libs/ApiAxios'
import CustomAvatar from '@/@core/components/mui/Avatar'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { UserDefaultProps } from '@/libs/prisma-selects'

import FleetMap from './maps/fleet'

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

export interface Terminal {
  n_terminal_name: string
  c_terminal_sn: string
  n_lat: string
  n_lng: string
  d_monitoring: string
  status: string
}

export interface Station {
  c_project: string
  n_project_name: string | null
  n_project_desc: string | null
  c_station: string
  n_station: string
  n_lat: string
  n_lng: string
  status: string
  terminal: Terminal[]
}

export interface ProjectOption {
  c_project: string;
  n_project?: string;
}

export interface DashboardRawData {
  green_station: number
  warning_station: number
  danger_station: number
  list_danger: Station[]
  list_warning: Station[]
}

export interface DashboardProcessedData extends DashboardRawData {
  list_warning: Station[]
}

type SummaryDataType = {
  title: string
  value: string | number
  color: ThemeColor
  icon: ReactNode
}

const BASE_URL = process.env.NEXT_PUBLIC_API_MONITORING_URL || process.env.API_MONITORING_URL || 'https://da-device.devops-nutech.com/api/v1'

const getSummaryData = (data: DashboardProcessedData | null): SummaryDataType[] => [
  {
    title: 'Safe Stations',
    value: data?.green_station || 0,
    color: 'success',
    icon: (
      <svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'></path>
        <polyline points='22 4 12 14.01 9 11.01'></polyline>
      </svg>
    )
  },
  {
    title: 'Warning Stations',
    value: data?.warning_station || 0,
    color: 'warning',
    icon: (
      <svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'></path>
        <line x1='12' y1='9' x2='12' y2='13'></line>
        <line x1='12' y1='17' x2='12.01' y2='17'></line>
      </svg>
    )
  },
  {
    title: 'Danger Stations',
    value: data?.danger_station || 0,
    color: 'error',
    icon: (
      <svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <circle cx='12' cy='12' r='10'></circle>
        <line x1='15' y1='9' x2='9' y2='15'></line>
        <line x1='9' y1='9' x2='15' y2='15'></line>
      </svg>
    )
  }
]

const Dashboard = ({ user, mapboxAccessToken }: { user: UserDefaultProps | null, mapboxAccessToken: string }) => {
  const belowMdScreen = useMediaQuery('(max-width: 900px)')

  const [isMounted, setIsMounted] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [projectsActive, setProjectsActive] = useState<string | null>(null)
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false)
  const [dashboardData, setDashboardData] = useState<DashboardProcessedData | null>(null)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const processDashboardData = (raw: DashboardRawData): DashboardProcessedData => {
    const actualDanger: Station[] = []
    const actualWarning: Station[] = []

    if (raw.list_danger) {
      raw.list_danger.forEach(station => {
        actualDanger.push(station)
      })

      raw.list_warning.forEach(station => {
        actualWarning.push(station)
      })
    }


    return { ...raw, list_danger: actualDanger, list_warning: actualWarning }
  }

  const fetchProjects = useCallback(async (mounted: boolean) => {
    if (mounted) setLoadingProjects(true);
    const session = await getSession();

    try {
      const response = await ApiAxios.get(`${BASE_URL}/project/get-all-project`, {
        headers: { 'Authorization': `Bearer ${session?.user?.accessToken}`, 'Content-Type': 'application/json' }
      });

      if (mounted) {
        const projectData: ProjectOption[] = response.data?.data || [];

        setProjects(projectData);

        if (projectData.length > 0 && !projectsActive) {
          setProjectsActive(projectData[0].c_project);
        } else if (!projectsActive) {
          setProjectsActive("KCI");
        }
      }
    } catch (error) {
      console.error("Error fetching projects", error);
    } finally {
      if (mounted) setLoadingProjects(false);
    }
  }, [projectsActive]);

  const fetchDashboardData = useCallback(async (projectCode: string) => {
    if (!projectCode) return;

    try {
      const session = await getSession();

      const response = await ApiAxios.post(
        `${BASE_URL}/output/monitoring-summary`,
        { c_project: projectCode },
        { headers: { 'Authorization': `Bearer ${session?.user?.accessToken}`, 'Content-Type': 'application/json' } }
      );

      const rawData: DashboardRawData = response.data?.data || {
        green_station: 0, warning_station: 0, danger_station: 0, list_danger: []
      };

      setDashboardData(processDashboardData(rawData));
    } catch (err) {
      console.error("Error fetching dashboard monitoring", err);
    } finally {
      setLoading(false);
    }
  }, [])

  useEffect(() => {
    let mounted = true;

    fetchProjects(mounted);

    return () => { mounted = false; };
  }, [fetchProjects])

  useEffect(() => {
    if (projectsActive) {
      fetchDashboardData(projectsActive);
      const interval = setInterval(() => fetchDashboardData(projectsActive), 10000);


      return () => clearInterval(interval);
    }
  }, [projectsActive, fetchDashboardData])

  const renderSafeDate = (dateString: string) => {
    if (!isMounted) return 'Loading date...'

    return `Monitored: ${new Date(dateString).toLocaleString('id-ID')}`
  }

  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    setTimeout(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }, 100);
  }

  const summaryData = getSummaryData(dashboardData)

  const totalStations = dashboardData
    ? dashboardData.green_station + dashboardData.warning_station + dashboardData.danger_station
    : 0

  const chartColors = ['#28C76F', '#FF9F43', '#EA5455'];

  const options: ApexOptions = {
    chart: { sparkline: { enabled: true } },
    grid: { padding: { left: 20, right: 20 } },
    colors: chartColors,
    stroke: { width: 0 },
    legend: { show: false },
    tooltip: { theme: 'false' },
    dataLabels: { enabled: false },
    labels: ['Safe', 'Warning', 'Danger'],
    states: { hover: { filter: { type: 'none' } }, active: { filter: { type: 'none' } } },
    plotOptions: {
      pie: {
        customScale: 0.9,
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: { offsetY: 20, fontSize: '0.875rem' },
            value: { color: '#b3b3b3', offsetY: -15, fontWeight: 500, fontSize: '1.125rem' },
            total: {
              show: true, color: '#979797', fontSize: '0.8125rem', label: 'Total Stations',
              formatter: (w: any) => {
                if (!w?.globals?.seriesTotals) return "0";

                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString()
              }
            }
          }
        }
      }
    }
  }

  return (
    <>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <div className='flex max-md:flex-col md:items-start justify-between gap-6 plb-6'>
            <div className='md:is-8/12 w-full'>

              <div className='flex items-start justify-between w-full mbe-2'>
                <div>
                  <div className='flex items-baseline gap-1'>
                    <Typography variant='h5'>System Status Overview,</Typography>
                    <Typography variant='h4'>{user?.name ?? user?.username} 👋🏻</Typography>
                  </div>
                  <div className='mbe-4 mt-2'>
                    <Typography color="text.secondary">Here is the real-time monitoring of your stations and terminals.</Typography>
                    <Typography color="text.secondary">Data automatically updates every 10 seconds.</Typography>
                  </div>
                </div>

                <div className="ml-auto">
                  <Autocomplete
                    disablePortal
                    disableClearable={!!projectsActive}
                    options={projects}
                    loading={loadingProjects}
                    getOptionLabel={(option) => option.n_project || option.c_project || ""}
                    renderInput={(params) => <TextField {...params} label="Select Project" size="small" />}
                    className='min-w-[200px] shadow-sm'
                    value={projects.find(p => p.c_project === projectsActive) ?? null}
                    onChange={(_, v) => {
                      if (v) {
                        setProjectsActive(v.c_project);
                        setLoading(true);
                        setDashboardData(null);
                      }
                    }}
                    isOptionEqualToValue={(option, value) => option.c_project === value.c_project}
                  />
                </div>
              </div>

              <div className='flex flex-wrap max-md:flex-col justify-between gap-6 mt-4'>
                {summaryData.map((item, i) => (
                  <div key={i} className='flex gap-4'>
                    <CustomAvatar variant='rounded' skin='light' size={54} color={item.color}>
                      {item.icon}
                    </CustomAvatar>
                    <div>
                      <Typography className='font-medium'>{item.title}</Typography>
                      <Typography variant='h4' color={`${item.color}.main`}>
                        {loading ? '...' : item.value}
                      </Typography>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Divider orientation={belowMdScreen ? 'horizontal' : 'vertical'} flexItem />

            <div className='flex justify-between md:is-4/12'>
              <div className='flex flex-col justify-between gap-6'>
                <div>
                  <Typography variant='h5' className='mbe-1'>Network Health</Typography>
                  <Typography color="text.secondary">Station Distribution</Typography>
                </div>
                <div>
                  <Typography variant='h4' className='mbe-2'>
                    {loading ? '...' : totalStations} <span className='text-textSecondary'>Total</span>
                  </Typography>
                  <Chip label={`${dashboardData?.green_station || 0} Safe`} variant='tonal' size='small' color='success' />
                </div>
              </div>

              {dashboardData !== null ? (
                <AppReactApexCharts
                  type='donut'
                  height={189}
                  width={150}
                  options={options}
                  series={[dashboardData.green_station, dashboardData.warning_station, dashboardData.danger_station]}
                />
              ) : (
                <div className="flex items-center justify-center h-[189px] w-[150px] opacity-50">
                  <Typography variant="body2">Loading chart...</Typography>
                </div>
              )}
            </div>
          </div>
        </Grid>

        {/* Danger List Section */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h5' color='error' className='mbe-4 flex items-center gap-2'>
                <span className="animate-warning-icon text-4xl">🚨</span>
                Danger Stations ({dashboardData?.list_danger?.length || 0})
              </Typography>
              <List className="h-[350px] scroll-on-hover pr-2">
                {dashboardData?.list_danger?.map((station, index) => (
                  <div
                    key={`danger-${index}`}
                    onClick={() => handleStationClick(station)}
                    className="animate-danger-box mbe-4 p-4 border rounded border-error/50 bg-error/10 cursor-pointer hover:bg-error/20 transition-all"
                    style={{ animationDelay: `${index * 0.75}s` }}
                  >
                    <Typography variant='subtitle1' className='font-bold'>{station.n_station}</Typography>
                    <Typography variant='body2' className='mbe-2 opacity-80'>Station ID: {station.c_station}</Typography>

                    <Divider className='my-2' />
                    <Typography variant='caption' className='font-bold uppercase opacity-80'>Affected Terminals:</Typography>
                    {station.terminal.map((term, tIndex) => (
                      <ListItem key={`danger-term-${tIndex}`} disablePadding className='mt-1'>
                        <ListItemText
                          primary={`Terminal: ${term.n_terminal_name} (SN: ${term.c_terminal_sn})`}
                          secondary={renderSafeDate(term.d_monitoring)}
                        />
                        <Chip label={term.status} color='error' size='small' className="animate-pulse" />
                      </ListItem>
                    ))}
                  </div>
                ))}
                {!loading && dashboardData?.list_danger?.length === 0 && (
                  <Typography variant="body2" className="text-center italic opacity-70 mt-4">No danger stations found.</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Warning List Section */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h5' color='warning.main' className='mbe-4 flex items-center gap-2'>
                <span className="animate-warning-icon text-4xl">⚠️</span>
                Warning Stations ({dashboardData?.list_warning?.length || 0})
              </Typography>
              <List className="h-[350px] scroll-on-hover pr-2">
                {dashboardData?.list_warning?.map((station, index) => (
                  <div
                    key={`warning-${index}`}
                    onClick={() => handleStationClick(station)}
                    className="mbe-4 p-4 border rounded border-warning/50 bg-warning/10 cursor-pointer hover:bg-warning/20 transition-all"
                  >
                    <Typography variant='subtitle1' className='font-bold'>{station.n_station}</Typography>
                    <Typography variant='body2' className='mbe-2 opacity-80'>Station ID: {station.c_station}</Typography>

                    <Divider className='my-2' />
                    <Typography variant='caption' className='font-bold uppercase opacity-80'>Affected Terminals:</Typography>
                    {station.terminal.map((term, tIndex) => (
                      <ListItem key={`warning-term-${tIndex}`} disablePadding className='mt-1'>
                        <ListItemText
                          primary={`Terminal: ${term.n_terminal_name} (SN: ${term.c_terminal_sn})`}
                          secondary={renderSafeDate(term.d_monitoring)}
                        />
                        <Chip label={term.status} color='warning' size='small' />
                      </ListItem>
                    ))}
                  </div>
                ))}
                {!loading && dashboardData?.list_warning?.length === 0 && (
                  <Typography variant="body2" className="text-center italic opacity-70 mt-4">No warning stations found.</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }} className="w-full h-full min-h-[600px] mt-6">
          <FleetMap
            selectedStation={selectedStation}
            mapboxAccessToken={mapboxAccessToken}
            activeProject={projectsActive}
            dashboardData={dashboardData}
          />
        </Grid>
      </Grid>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes intermittent-shake {
          0%, 80%, 100% { transform: translateX(0); }
          82%, 86%, 90%, 94%, 98% { transform: translateX(-4px); }
          84%, 88%, 92%, 96% { transform: translateX(4px); }
        }
        @keyframes intermittent-pulse {
          0%, 80%, 100% { transform: scale(1); }
          90% { transform: scale(1.3); }
        }
        .animate-danger-box { animation: intermittent-shake 4s ease-in-out infinite; }
        .animate-warning-icon { animation: intermittent-pulse 2.5s ease-in-out infinite; display: inline-block; }

        .scroll-on-hover { overflow-y: hidden; }
        .scroll-on-hover:hover { overflow-y: auto; }
        .scroll-on-hover::-webkit-scrollbar { width: 6px; }
        .scroll-on-hover::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.2); border-radius: 10px; }
      `}} />

    </>
  )
}

export default Dashboard
