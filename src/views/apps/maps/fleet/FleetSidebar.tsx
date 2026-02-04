// React Imports
import { useEffect, useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'

// Mui Imports
import MuiAccordion from '@mui/material/Accordion'
import MuiAccordionDetails from '@mui/material/AccordionDetails'
import MuiAccordionSummary from '@mui/material/AccordionSummary'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import MuiTimeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import type { AccordionProps } from '@mui/material/Accordion'
import type { AccordionSummaryProps } from '@mui/material/AccordionSummary'
import type { AccordionDetailsProps } from '@mui/material/AccordionDetails'
import type { TimelineProps } from '@mui/lab/Timeline'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Types Imports
import { CircularProgress } from '@mui/material'

import axios from 'axios'

import type { coordinate, viewStateType } from './index'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'

type Props = {
  backdropOpen: boolean
  setBackdropOpen: (value: boolean) => void
  sidebarOpen: boolean
  setSidebarOpen: (value: boolean) => void
  isBelowLgScreen: boolean
  isBelowMdScreen: boolean
  isBelowSmScreen: boolean
  expanded: number | false
  expandedData: TerminalMonitoringProps[]
  setExpandedDataSelected: (value: viewStateType) => void
  setExpanded: (value: number | false) => void
  setViewState: (value: viewStateType) => void
  geojson: {
    type: string
    features: {
      type: string
      geometry: {
        type: string
        longitude: number
        latitude: number
      },
      data: coordinate
    }[]
  }
}

// Styled component for Accordion component
const Accordion = styled(MuiAccordion)<AccordionProps>({
  boxShadow: 'none !important',
  border: 'none',
  '&:before': {
    content: 'none'
  },
  marginBlockEnd: '0px !important'
})

// Styled component for AccordionSummary component
const AccordionSummary = styled(MuiAccordionSummary)<AccordionSummaryProps>(({ theme }) => ({
  paddingBlock: theme.spacing(0, 6),
  paddingInline: theme.spacing(0)
}))

// Styled component for AccordionDetails component
const AccordionDetails = styled(MuiAccordionDetails)<AccordionDetailsProps>(({ theme }) => ({
  paddingBlock: theme.spacing(0, 1),
  paddingInline: theme.spacing(0)
}))

// Styled Timeline component
const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    '&:before': {
      display: 'none'
    }
  },
  '& .MuiTimelineDot-root': {
    border: 0,
    padding: 0
  }
})

export interface TerminalMonitoringProps {
  c_project: string;
  n_project_name: string;
  n_project_desc: string;

  c_terminal_sn: string;
  c_terminal_type: string;

  c_terminal_01: string;
  c_terminal_02: string | null;

  c_station: string;
  n_station: string;

  n_lat: string;   // string karena dari API string
  n_lng: string;   // string karena dari API string

  d_monitoring: string | null; // null saat NO DATA
  status: string;
  progress: number;
}

export interface StationMonitoringProps {
  c_project: string;           // "2"
  c_station: string;           // "CIL"

  n_project_name: string | null;
  n_project_desc: string | null;

  n_station: string;           // "Station CiliwungLRT Jabodebek"

  n_lat: string;               // "-6.243477"
  n_lng: string;               // "106.864131"

  status: string;
}


const ScrollWrapper = ({ children, isBelowLgScreen }: { children: ReactNode; isBelowLgScreen: boolean }) => {
  if (isBelowLgScreen) {
    return <div className='bs-full overflow-y-auto overflow-x-auto pbe-6 pli-6'>{children}</div>
  } else {
    return (
      <PerfectScrollbar options={{ wheelPropagation: false, suppressScrollX: true }} className='pbe-6 pli-6'>
        {children}
      </PerfectScrollbar>
    )
  }
}

const VehicleTracking = ({
  vehicleTrackingData,
  index,
  expanded,
  expandedData,
  handleChange,
  setExpandedDataSelected
}: {
  vehicleTrackingData: StationMonitoringProps
  index: number
  expanded: number | false
  expandedData: TerminalMonitoringProps[]
  handleChange: (panel: number) => (event: SyntheticEvent, isExpanded: boolean) => void
  setExpandedDataSelected: (value: viewStateType) => void
}) => {


  const [loading, setloading] = useState(false);

  const getProgressColor = (value: number) => {
    // Jika nilai di bawah 35% -> Merah
    if (value <= 35) return '#ef4444'; // Tailwind: red-500 (Danger)

    // Jika nilai di antara 36% - 75% -> Oranye/Kuning
    if (value <= 75) return '#f59e0b'; // Tailwind: amber-500 (Warning)

    // Jika di atas 75% -> Hijau
    return '#22c55e'; // Tailwind: green-500 (Success)
  };

  const progress = expandedData.length ? Math.round((expandedData.filter(i => i.status === 'OK').length / expandedData.length) * 100) : 0;

  const downloadConfig = async (Terminal: TerminalMonitoringProps) => {
    try {
      setloading(true);

      const response = await axios.post('http://192.168.62.90:4003/api/v1/terminal/get-terminal-config', {
        "c_project": Terminal.c_project,
        "c_terminal_sn": Terminal.c_terminal_sn
      }, {
        headers: { 'authorization': "Basic aGlzbnV0ZWNoOm51dGVjaDEyMw==" }
      });

      // 🔹 Convert object → JSON string
      const jsonString = JSON.stringify(response?.data?.data, null, 2);

      // 🔹 Buat file Blob
      const blob = new Blob([jsonString], { type: "application/json" });

      // 🔹 Buat URL download
      const url = window.URL.createObjectURL(blob);

      // 🔹 Trigger download
      const a = document.createElement("a");

      a.href = url;
      a.download = `${Terminal.c_terminal_type}-config-${Terminal.c_terminal_sn}.json`;
      document.body.appendChild(a);
      a.click();

      // 🔹 Cleanup
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setloading(false), 1000);
    }
  };

  return (
    <Accordion expanded={expanded === index} onChange={handleChange(index)}>
      <AccordionSummary>
        <div className='flex gap-4 items-center'>
          <CustomAvatar skin='light' color='secondary'>
            <i className=' tabler-train text-3xl' />
          </CustomAvatar>
          <div className='flex flex-col gap-1'>
            <Typography className='font-normal'>{vehicleTrackingData.n_station}</Typography>
            <Typography className='font-normal text-textSecondary!'>{vehicleTrackingData.status}</Typography>
          </div>
        </div>
      </AccordionSummary>
      <AccordionDetails>
        {!!expandedData?.length ? <div className="relative flex flex-col gap-3 plb-4 ">
          <div className="flex items-center justify-between">
            <Typography className="text-textPrimary!">
              Progress Success
            </Typography>
            <Typography>{progress}%</Typography>
          </div>
          <LinearProgress
            sx={{
              height: 8,
              borderRadius: 4,
              '& .MuiLinearProgress-bar': {
                backgroundColor: getProgressColor(progress),
                transition: 'background-color 0.4s ease-in-out, transform 0.4s linear'
              }
            }}
            variant="determinate"
            value={progress}
          />
        </div> : <div className="relative flex flex-col gap-3 p-4 text-center  bg-gray-200/5">
          Not Data
        </div>}

        {expandedData?.map((item, index) => (
          <Timeline
            key={index}
            className="relative pbs-4 pr-14 cursor-pointer"
            onClick={() =>
              setExpandedDataSelected({
                longitude: Number(item.n_lng),
                latitude: Number(item.n_lat),
                zoom: 22
              })
            }
          >
            <TimelineItem>
              <TimelineSeparator>
                <TimelineDot variant="outlined" className="mlb-0">
                  <i
                    className={
                      item.status === 'OK'
                        ? 'tabler-circle-check text-xl text-success'
                        : 'tabler-circle-x text-xl text-red-500'
                    }
                  />
                </TimelineDot>
                <TimelineConnector />
              </TimelineSeparator>

              <TimelineContent className="flex flex-col gap-0.5 pbs-0 pis-4 pbe-5">
                <Typography
                  className="font-medium text-textPrimary!"
                >
                  {item.c_terminal_type}
                </Typography>

                <Typography className={
                  item.status === 'OK'
                    ? 'uppercase text-success! font-medium'
                    : 'uppercase text-red-500! font-medium'
                }>
                  {item.status}
                </Typography>

                <Typography variant="body2">
                  SN:{item.c_terminal_sn} ({item.c_terminal_01}{item.c_terminal_02 ? ' | ' + item.c_terminal_02 : ''})
                </Typography>
              </TimelineContent>
            </TimelineItem>

            {/* 🔘 TOMBOL KANAN TENGAH */}

            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadConfig(item)
              }}
              title="Download Config"
              disabled={loading}
              className="
                absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer
                h-10 w-10 flex items-center justify-center
                rounded bg-blue-600 text-white
                hover:bg-blue-900"
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : <i className="tabler-download text-xl" />}

            </button>
          </Timeline>
        ))}


        {/* <Timeline className='pbs-4'>
          <TimelineItem>
            <TimelineSeparator>
              <TimelineDot variant='outlined' className='mlb-0'>
                <i className='tabler-circle-check text-xl text-success' />
              </TimelineDot>
              <TimelineConnector />
            </TimelineSeparator>
            <TimelineContent className='flex flex-col gap-0.5 pbs-0 pis-4 pbe-5'>
              <Typography variant='caption' className='uppercase text-success!'>
                Tracking Number Created
              </Typography>
              <Typography className='font-medium text-textPrimary!'>{vehicleTrackingData.driverName}</Typography>
              <Typography variant='body2'>Sep 01, 7:53 AM</Typography>
            </TimelineContent>
          </TimelineItem>
        </Timeline>
        <Timeline>
          <TimelineItem>
            <TimelineSeparator>
              <TimelineDot variant='outlined' className='mlb-0'>
                <i className='tabler-circle-check text-xl text-success' />
              </TimelineDot>
              <TimelineConnector />
            </TimelineSeparator>
            <TimelineContent className='flex flex-col gap-0.5 pbs-0 pis-4 pbe-5'>
              <Typography variant='caption' className='uppercase text-success!'>
                Out For Delivery
              </Typography>
              <Typography className='font-medium text-textPrimary!'>{vehicleTrackingData.driverName}</Typography>
              <Typography variant='body2'>Sep 03, 8:02 AM</Typography>
            </TimelineContent>
          </TimelineItem>
        </Timeline> */}
        {/* <Timeline>
          <TimelineItem>
            <TimelineSeparator>
              <TimelineDot variant='outlined' className='mlb-0'>
                <i className='tabler-map-pin text-xl text-primary' />
              </TimelineDot>
            </TimelineSeparator>
            <TimelineContent className='flex flex-col gap-0.5 pbs-0 pis-4 pbe-5'>
              <Typography variant='caption' className='uppercase text-primary!'>
                Arrived
              </Typography>
              <Typography className='font-medium text-textPrimary!'>{vehicleTrackingData.passengerName}</Typography>
              <Typography variant='body2'>Sep 03, 8:02 AM</Typography>
            </TimelineContent>
          </TimelineItem>
        </Timeline> */}
      </AccordionDetails>
    </Accordion>
  )
}

const FleetSidebar = (props: Props) => {
  // Props
  const {
    backdropOpen,
    setBackdropOpen,
    sidebarOpen,
    setSidebarOpen,
    isBelowLgScreen,
    isBelowMdScreen,
    isBelowSmScreen,
    expanded,
    expandedData,
    setExpandedDataSelected,
    setExpanded,
    setViewState,
    geojson
  } = props

  const handleChange = (panel: number) => (event: SyntheticEvent, isExpanded: boolean) => {
    if (isExpanded) {
      setViewState({
        longitude: geojson.features[panel].geometry.longitude,
        latitude: geojson.features[panel].geometry.latitude,
        zoom: 16
      })
    }

    setExpanded(isExpanded ? panel : false)
  }

  useEffect(() => {
    if (!backdropOpen && sidebarOpen) {
      setSidebarOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backdropOpen])

  return (
    <Drawer
      className='bs-full'
      open={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      variant={!isBelowMdScreen ? 'permanent' : 'persistent'}
      ModalProps={{
        disablePortal: true,
        keepMounted: true // Better open performance on mobile.
      }}
      sx={{
        zIndex: isBelowMdScreen && sidebarOpen ? 11 : 10,
        position: !isBelowMdScreen ? 'static' : 'absolute',
        ...(isBelowSmScreen && sidebarOpen && { width: '100%' }),
        '& .MuiDrawer-paper': {
          borderRight: 'none',
          boxShadow: 'none',
          overflow: 'hidden',
          width: isBelowSmScreen ? '100%' : '360px',
          position: !isBelowMdScreen ? 'static' : 'absolute'
        }
      }}
    >
      <div className='flex justify-between items-center p-6'>
        <Typography variant='h5'>Monitoring Station</Typography>

        {isBelowMdScreen ? (
          <IconButton
            onClick={() => {
              setSidebarOpen(false)
              setBackdropOpen(false)
            }}
          >
            <i className='tabler-x' />
          </IconButton>
        ) : null}
      </div>
      <ScrollWrapper isBelowLgScreen={isBelowLgScreen}>
        {geojson.features.map((item, index) => (
          <VehicleTracking
            vehicleTrackingData={item.data}
            index={index}
            expanded={expanded}
            expandedData={expandedData}
            handleChange={handleChange}
            setExpandedDataSelected={setExpandedDataSelected}
            key={index}
          />
        ))}
      </ScrollWrapper>
    </Drawer>
  )
}

export default FleetSidebar
