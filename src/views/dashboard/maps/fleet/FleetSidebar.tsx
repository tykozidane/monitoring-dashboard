// React Imports
import { useEffect, useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'

// Mui Imports
import MuiAccordion from '@mui/material/Accordion'
import MuiAccordionDetails from '@mui/material/AccordionDetails'
import MuiAccordionSummary from '@mui/material/AccordionSummary'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import MuiTimeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TextField from '@mui/material/TextField'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'
import type { GeojsonProps, StationData, TerminalMonitoringProps, ViewStateType } from './'

type Props = {
  backdropOpen: boolean; setBackdropOpen: (value: boolean) => void;
  sidebarOpen: boolean; setSidebarOpen: (value: boolean) => void;
  isBelowLgScreen: boolean; isBelowMdScreen: boolean; isBelowSmScreen: boolean;
  expanded: string | false; setExpanded: (value: string | false) => void;
  expandedData: TerminalMonitoringProps[];

  // PERBAIKAN TIPE DATA FUNGSI
  setExpandedDataSelected: (value: ViewStateType) => void;

  setViewState: (value: ViewStateType) => void;
  geojson: GeojsonProps;
  searchQuery: string; setSearchQuery: (value: string) => void;

  popupInfo: TerminalMonitoringProps | null;
  setPopupInfo: (value: TerminalMonitoringProps | null) => void;
}

const Accordion = styled(MuiAccordion)({
  boxShadow: 'none !important', border: 'none', '&:before': { content: 'none' }, marginBlockEnd: '0px !important'
})

const AccordionSummary = styled(MuiAccordionSummary)(({ theme }) => ({
  paddingBlock: theme.spacing(0, 6), paddingInline: theme.spacing(0)
}))

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  paddingBlock: theme.spacing(0, 1), paddingInline: theme.spacing(0)
}))

const Timeline = styled(MuiTimeline)({
  paddingLeft: 0, paddingRight: 0,
  '& .MuiTimelineItem-root': { width: '100%', '&:before': { display: 'none' } },
  '& .MuiTimelineDot-root': { border: 0, padding: 0 }
})

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

// FUNGSI HELPER UNTUK WARNA
const getStatusColorClass = (status: string) => {
  const s = status?.toLowerCase() || '';

  if (s === 'normal' || s === 'ok') return 'text-green-500';
  if (s === 'warning') return 'text-amber-500';
  if (s === 'danger') return 'text-red-500';

  return 'text-gray-500';
}

const getStatusIcon = (status: string) => {
  const s = status?.toLowerCase() || '';

  if (s === 'normal' || s === 'ok') return 'tabler-circle-check';
  if (s === 'warning') return 'tabler-alert-triangle';
  if (s === 'danger') return 'tabler-circle-x';

  return 'tabler-info-circle';
}

const VehicleTracking = ({
  vehicleTrackingData, expanded, expandedData, handleChange, setExpandedDataSelected, setPopupInfo
}: {
  vehicleTrackingData: StationData
  expanded: string | false
  expandedData: TerminalMonitoringProps[]
  handleChange: (panel: string, lng: number, lat: number) => (event: SyntheticEvent, isExpanded: boolean) => void
  setExpandedDataSelected: (value: ViewStateType) => void
  setPopupInfo: (value: TerminalMonitoringProps | null) => void
}) => {

  const isExpanded = expanded === vehicleTrackingData.c_station;

  return (
    <Accordion expanded={isExpanded} onChange={handleChange(vehicleTrackingData.c_station, Number(vehicleTrackingData.n_lng), Number(vehicleTrackingData.n_lat))}>
      <AccordionSummary>
        <div className='flex gap-4 items-center'>
          <CustomAvatar skin='light' color='secondary'>
            <i className=' tabler-train text-3xl' />
          </CustomAvatar>
          <div className='flex flex-col gap-1'>
            <Typography className='font-bold text-[15px]'>{vehicleTrackingData.n_station}</Typography>
            <Typography className={`font-bold text-xs uppercase tracking-wider ${getStatusColorClass(vehicleTrackingData.status)}`}>
              {vehicleTrackingData.status}
            </Typography>
          </div>
        </div>
      </AccordionSummary>

      <AccordionDetails>
        {isExpanded && (!expandedData || expandedData.length === 0) ? (
          <div className="relative flex flex-col gap-3 p-4 text-center rounded-md mb-2 bg-actionHover">
            <Typography variant="body2" color="text.secondary" className="italic">No terminal data available</Typography>
          </div>
        ) : null}

        {isExpanded && expandedData?.map((item, index) => {
          const statusColor = getStatusColorClass(item.status);
          const statusIcon = getStatusIcon(item.status);

          return (
            <Timeline
              key={index}
              className="relative  cursor-pointer transition-colors rounded-lg px-2 -mx-2 hover:bg-actionHover"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpandedDataSelected({ longitude: Number(item.n_lng), latitude: Number(item.n_lat), zoom: 22 });
                setPopupInfo(item);
              }}
            >
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot variant="outlined" className="mlb-0 border-0">
                    <i className={`${statusIcon} text-xl ${statusColor}`} />
                  </TimelineDot>
                  <TimelineConnector />
                </TimelineSeparator>

                <TimelineContent className="flex flex-col gap-0.5 pbs-0 pis-4 pbe-4 mt-4">
                  <Typography className="font-semibold text-[14px]">
                    {item.c_terminal_type}
                  </Typography>
                  <Typography className={`uppercase font-bold text-[12px] tracking-wide ${statusColor}`}>
                    {item.status}
                  </Typography>
                  <Typography variant="body2" className="text-[12px]" color="text.secondary">
                    SN: {item.c_terminal_sn} ({item.c_terminal_01}{item.c_terminal_02 ? ' | ' + item.c_terminal_02 : ''})
                  </Typography>
                </TimelineContent>
              </TimelineItem>
            </Timeline>
          )
        })}
      </AccordionDetails>
    </Accordion>
  )
}

const FleetSidebar = (props: Props) => {
  const {
    backdropOpen, setBackdropOpen, sidebarOpen, setSidebarOpen,
    isBelowLgScreen, isBelowMdScreen, isBelowSmScreen,
    expanded, expandedData, setExpandedDataSelected, setExpanded, setViewState, geojson,
    searchQuery, setSearchQuery, popupInfo, setPopupInfo
  } = props

  const handleChange = (panelId: string, lng: number, lat: number) => (event: SyntheticEvent, isExpanded: boolean) => {
    if (isExpanded) {
      setViewState({ longitude: lng, latitude: lat, zoom: 16 })
    }

    setExpanded(isExpanded ? panelId : false)
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
      ModalProps={{ disablePortal: true, keepMounted: true }}
      sx={{
        zIndex: isBelowMdScreen && sidebarOpen ? 11 : 10,
        position: !isBelowMdScreen ? 'static' : 'absolute',
        ...(isBelowSmScreen && sidebarOpen && { width: '100%' }),
        '& .MuiDrawer-paper': {
          borderRight: 'none', boxShadow: 'none', overflow: 'hidden', width: isBelowSmScreen ? '100%' : '360px', position: !isBelowMdScreen ? 'static' : 'absolute',
          backgroundColor: 'background.paper'
        }
      }}
    >
      <div className='flex justify-between items-center plb-6 pli-6'>
        <Typography variant='h5'>Monitoring Station</Typography>
        {isBelowMdScreen ? (
          <IconButton onClick={() => { setSidebarOpen(false); setBackdropOpen(false) }}>
            <i className='tabler-x' />
          </IconButton>
        ) : null}
      </div>

      <div className="px-6 pb-6 mb-6 flex flex-col gap-4 border-b border-divider">
        <TextField
          label="Search Station" variant="outlined" size="small" fullWidth
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <ScrollWrapper isBelowLgScreen={isBelowLgScreen}>
        {geojson.features.length === 0 && (
          <Typography variant='body2' color="text.secondary" className='text-center mt-6 italic'>No station found.</Typography>
        )}
        {geojson.features.map((item, index) => (
          <VehicleTracking
            vehicleTrackingData={item.data}
            expanded={expanded}
            expandedData={expandedData}
            handleChange={handleChange}
            setExpandedDataSelected={setExpandedDataSelected}
            setPopupInfo={setPopupInfo}
            key={item.data.c_station || index}
          />
        ))}
      </ScrollWrapper>
    </Drawer>
  )
}

export default FleetSidebar
