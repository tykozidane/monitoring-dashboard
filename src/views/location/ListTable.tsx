'use client'

import { useState } from 'react'

import { Card, Grid, Tab, Tabs, Chip, Grow } from '@mui/material'

import Terminal from './Terminal'
import Station from './Station'

const ListTable = (props: { permission: string[] }) => {
  const [activeTab, setActiveTab] = useState('station')

  return (
    <Grow in={true}>
      <Grid size={12}>
        <Card>
          <div className='border-b'>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              aria-label="terminal tabs"
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: '1px solid #e0e0e0', '& .MuiTabs-indicator': { height: '4px', borderRadius: '4px 4px 0 0' } }}
            >
              <Tab
                label="Station"
                value="station"
                icon={<i className='tabler-database text-xl' />}
                iconPosition="start"
                sx={{ minHeight: '60px', fontSize: '1rem', textTransform: 'none' }}
              />
              <Tab
                label="Terminal"
                value="terminal"
                icon={<i className='tabler-database text-xl' />}
                iconPosition="start"
                sx={{ minHeight: '60px', fontSize: '1rem', textTransform: 'none' }}
              />
            </Tabs>
          </div>

          {activeTab === 'terminal' && <Terminal {...props} />}
          {activeTab === 'station' && <Station {...props} />}
        </Card>
      </Grid>
    </Grow>
  )
}

export default ListTable
