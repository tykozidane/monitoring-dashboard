'use client'

// React Imports
import { useEffect, useState, useMemo } from 'react'
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
import Tooltip from '@mui/material/Tooltip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import LinearProgress from '@mui/material/LinearProgress'

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
  loadingExpanded: boolean;
  setExpandedDataSelected: (value: ViewStateType) => void;
  setViewState: (value: ViewStateType) => void;
  geojson: GeojsonProps;
  searchQuery: string; setSearchQuery: (value: string) => void;
  popupInfo: TerminalMonitoringProps | null;
  setPopupInfo: (value: TerminalMonitoringProps | null) => void;
  fetchAllTerminalsApi?: () => Promise<TerminalMonitoringProps[]>;
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

const getStatusColorClass = (status: string) => {
  const s = status?.toLowerCase() || '';

  if (s === 'normal' || s === 'ok') return 'text-green-500';
  if (s === 'warning') return 'text-amber-500';
  if (s === 'danger') return 'text-red-500';
  if (s === 'no_data' || s === 'no data') return 'text-gray-500';

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
  vehicleTrackingData, expanded, expandedData, loadingExpanded, handleChange, setExpandedDataSelected, setPopupInfo
}: {
  vehicleTrackingData: StationData
  expanded: string | false
  expandedData: TerminalMonitoringProps[]
  loadingExpanded: boolean
  handleChange: (panel: string, lng: number, lat: number) => (event: SyntheticEvent, isExpanded: boolean) => void
  setExpandedDataSelected: (value: ViewStateType) => void
  setPopupInfo: (value: TerminalMonitoringProps | null) => void
}) => {

  const isExpanded = expanded === vehicleTrackingData.c_station;
  const hasStaleData = expandedData && expandedData.length > 0 && expandedData[0].c_station !== vehicleTrackingData.c_station;
  const isCurrentlyLoading = loadingExpanded || hasStaleData;
  let displayStatus = vehicleTrackingData.status || 'NORMAL';

  if (isExpanded && !isCurrentlyLoading && (!expandedData || expandedData.length === 0)) {
    displayStatus = 'NO DATA';
  }

  return (
    <Accordion expanded={isExpanded} onChange={handleChange(vehicleTrackingData.c_station, Number(vehicleTrackingData.n_lng), Number(vehicleTrackingData.n_lat))}>
      <AccordionSummary>
        <div className='flex gap-4 items-center'>
          <CustomAvatar skin='light' color='secondary'>
            <i className=' tabler-train text-3xl' />
          </CustomAvatar>
          <div className='flex flex-col gap-1'>
            <Typography className='font-bold text-[15px]'>{vehicleTrackingData.n_station}</Typography>
            <Typography className={`font-bold text-xs uppercase tracking-wider ${getStatusColorClass(displayStatus)}`}>
              {displayStatus.replace('_', ' ')}
            </Typography>
          </div>
        </div>
      </AccordionSummary>

      <AccordionDetails>
        {isExpanded && isCurrentlyLoading ? (
          <div className="relative flex flex-col gap-3 p-4 text-center rounded-md mb-2 bg-actionHover">
            <Typography variant="body2" color="text.secondary" className="italic animate-pulse">Loading data...</Typography>
          </div>
        ) : isExpanded && (!expandedData || expandedData.length === 0) ? (
          <div className="relative flex flex-col gap-3 p-4 text-center rounded-md mb-2 bg-actionHover">
            <Typography variant="body2" color="text.secondary" className="italic font-bold">NO DATA</Typography>
            <Typography variant="caption" color="text.secondary">No data terminals available.</Typography>
          </div>
        ) : (
          isExpanded && expandedData.map((item, index) => {
            const statusColor = getStatusColorClass(item.status);
            const statusIcon = getStatusIcon(item.status);

            return (
              <Timeline
                key={index}
                className="relative cursor-pointer transition-colors rounded-lg px-2 -mx-2 hover:bg-actionHover"
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
                      SN: {item.c_terminal_sn}
                    </Typography>
                  </TimelineContent>
                </TimelineItem>
              </Timeline>
            )
          })
        )}
      </AccordionDetails>
    </Accordion>
  )
}

const FleetSidebar = (props: Props) => {
  const {
    backdropOpen, setBackdropOpen, sidebarOpen, setSidebarOpen,
    isBelowLgScreen, isBelowMdScreen, isBelowSmScreen,
    expanded, expandedData, loadingExpanded, setExpandedDataSelected, setExpanded, setViewState, geojson,
    searchQuery, setSearchQuery, popupInfo, setPopupInfo, fetchAllTerminalsApi
  } = props

  const [showFilters, setShowFilters] = useState(false);
  const [globalTerminals, setGlobalTerminals] = useState<TerminalMonitoringProps[]>([]);
  const [isFetchingAll, setIsFetchingAll] = useState(false);

  const [filterTerminalName, setFilterTerminalName] = useState('');
  const [filterTerminalSn, setFilterTerminalSn] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const handleChange = (panelId: string, lng: number, lat: number) => (event: SyntheticEvent, isExpanded: boolean) => {
    if (isExpanded) {
      setViewState({ longitude: lng, latitude: lat, zoom: 16 })
    }

    setExpanded(isExpanded ? panelId : false)
  }

  const handleToggleFilter = async () => {
    const nextState = !showFilters;

    setShowFilters(nextState);

    if (nextState && globalTerminals.length === 0) {
      setIsFetchingAll(true);

      try {
        if (fetchAllTerminalsApi) {
          const data = await fetchAllTerminalsApi();

          setGlobalTerminals(data);
        }
      } catch (error) {
        console.error("Failed to fetch all terminals:", error);
      } finally {
        setIsFetchingAll(false);
      }
    }
  }

  useEffect(() => {
    if (!backdropOpen && sidebarOpen) {
      setSidebarOpen(false)
    }
  }, [backdropOpen])

  const isAdvancedFilterActive = filterTerminalName !== '' || filterTerminalSn !== '' || filterStatus !== '';

  const filteredStations = useMemo(() => {
    if (!searchQuery) return geojson.features;

    return geojson.features.filter((item) => {
      const stationName = item.data.n_station?.toLowerCase() || '';


      return stationName.includes(searchQuery.toLowerCase());
    });
  }, [geojson.features, searchQuery]);

  const globalFilteredTerminals = useMemo(() => {
    if (!isAdvancedFilterActive) return [];

    return globalTerminals.filter((item) => {
      const matchName = filterTerminalName ? item.c_terminal_type?.toLowerCase().includes(filterTerminalName.toLowerCase()) : true;
      const matchSn = filterTerminalSn ? item.c_terminal_sn?.toLowerCase().includes(filterTerminalSn.toLowerCase()) : true;
      const matchStatus = filterStatus ? item.status?.toLowerCase() === filterStatus.toLowerCase() : true;


      return matchName && matchSn && matchStatus;
    });
  }, [globalTerminals, filterTerminalName, filterTerminalSn, filterStatus, isAdvancedFilterActive]);

  return (
    <Drawer
      className='bs-full flex flex-col'
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
          backgroundColor: 'background.paper',
          display: 'flex', flexDirection: 'column'
        }
      }}
    >
      <div className='flex justify-between items-center plb-6 pli-6'>
        <Typography variant='h5'>Monitoring Station</Typography>

        <div className='flex items-center gap-1'>
          <Tooltip title="Advanced Search Data">
            <IconButton
              color={showFilters ? 'primary' : 'default'}
              onClick={handleToggleFilter}
            >
              <i className='tabler-filter' />
            </IconButton>
          </Tooltip>

          {isBelowMdScreen ? (
            <IconButton onClick={() => { setSidebarOpen(false); setBackdropOpen(false) }}>
              <i className='tabler-x' />
            </IconButton>
          ) : null}
        </div>
      </div>

      <div className="px-6 pb-6 mb-2 flex flex-col gap-4 border-b border-divider shrink-0">

        {/* KOLOM PENCARIAN STASIUN DISEMBUNYIKAN JIKA FILTER TERMINAL TERBUKA */}
        {!showFilters && (
          <TextField
            label="Search Station..."
            variant="outlined"
            size="small"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        )}

        {showFilters && (
          <div className="flex flex-col gap-3 p-4 bg-actionHover rounded-md border border-divider animate-fade-in">
            <Typography variant="caption" className="font-bold uppercase tracking-wider text-textSecondary mb-1">
              Advanced Filters (Terminal)
            </Typography>

            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Terminal Name"
                variant="outlined"
                size="small"
                fullWidth
                value={filterTerminalName}
                onChange={(e) => setFilterTerminalName(e.target.value)}
              />
              <TextField
                label="Terminal SN"
                variant="outlined"
                size="small"
                fullWidth
                value={filterTerminalSn}
                onChange={(e) => setFilterTerminalSn(e.target.value)}
              />
            </div>

            <FormControl size="small" fullWidth>
              <InputLabel id="status-filter-label">Terminal Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={filterStatus}
                label="Terminal Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value=""><em>All Statuses</em></MenuItem>
                <MenuItem value="NORMAL">Normal</MenuItem>
                <MenuItem value="WARNING">Warning</MenuItem>
                <MenuItem value="DANGER">Danger</MenuItem>
                <MenuItem value="NO_DATA">No Data</MenuItem>
              </Select>
            </FormControl>
          </div>
        )}
      </div>

      {isFetchingAll && (
        <div className="px-6 mb-4 shrink-0">
          <LinearProgress color="primary" />
          <Typography variant="caption" color="text.secondary" className="block text-center mt-2 italic animate-pulse">
            Preparing overall data for search...
          </Typography>
        </div>
      )}

      <ScrollWrapper isBelowLgScreen={isBelowLgScreen}>

        {isAdvancedFilterActive ? (
          <div className="flex flex-col gap-2 mt-4">
            <Typography variant="caption" className="font-bold uppercase mb-2 block text-primary">
              Search Results: {globalFilteredTerminals.length} Terminal(s)
            </Typography>

            {globalFilteredTerminals.length === 0 && !isFetchingAll && (
              <Typography variant='body2' color="text.secondary" className='text-center mt-4 italic bg-actionHover p-3 rounded-md'>
                No terminal data found matching the filters.
              </Typography>
            )}

            {globalFilteredTerminals.map((item, index) => {
              const statusColor = getStatusColorClass(item.status);
              const statusIcon = getStatusIcon(item.status);

              const stationFeature = geojson.features.find(f => f.data.c_station === item.c_station);
              const stationName = stationFeature ? stationFeature.data.n_station : item.c_station;

              return (
                <div
                  key={index}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-actionHover transition-colors border-divider flex items-start gap-4 shadow-sm"
                  onClick={() => {
                    setExpandedDataSelected({ longitude: Number(item.n_lng), latitude: Number(item.n_lat), zoom: 22 });
                    setPopupInfo(item);
                  }}
                >
                  <CustomAvatar skin='light' color='secondary' className="mt-1">
                    <i className={`${statusIcon} text-2xl ${statusColor}`} />
                  </CustomAvatar>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between items-center">
                      <Typography className="font-bold text-[14px]">
                        {item.c_terminal_type}
                      </Typography>
                      <Typography className={`uppercase font-bold text-[10px] px-2 py-0.5 rounded-full bg-opacity-20 ${statusColor} bg-current`}>
                        {item.status}
                      </Typography>
                    </div>
                    <Typography variant="body2" className="text-[12px]" color="text.secondary">
                      SN: <span className="font-semibold">{item.c_terminal_sn}</span>
                    </Typography>
                    <Typography variant="caption" className="text-[11px] flex items-center gap-1 mt-0.5" color="text.disabled">
                      <i className="tabler-map-pin text-[12px]" />
                      {stationName}
                    </Typography>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <>
            {filteredStations.length === 0 && (
              <Typography variant='body2' color="text.secondary" className='text-center mt-6 italic'>No stations found.</Typography>
            )}
            {filteredStations.map((item, index) => (
              <VehicleTracking
                vehicleTrackingData={item.data}
                expanded={expanded}
                expandedData={expandedData}
                loadingExpanded={loadingExpanded}
                handleChange={handleChange}
                setExpandedDataSelected={setExpandedDataSelected}
                setPopupInfo={setPopupInfo}
                key={item.data.c_station || index}
              />
            ))}
          </>
        )}
      </ScrollWrapper>
    </Drawer>
  )
}

export default FleetSidebar
