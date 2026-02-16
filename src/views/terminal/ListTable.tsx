'use client'

import { useState } from 'react'

import { Card, Grid, Tab, Tabs, Chip, Grow } from '@mui/material'

import Sync from './Sync'
import Library from './Library'

const ListTable = () => {
  const [activeTab, setActiveTab] = useState('library')
  const [unsyncedCount, setUnsyncedCount] = useState(0)

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
                label={<div className='flex items-center gap-2'>Sync {unsyncedCount > 0 && <Chip label={unsyncedCount} color='error' size='small' className='h-5 min-w-5 px-1 font-bold' />}</div>}
                value="sync"
                icon={<i className='tabler-refresh text-xl' />}
                iconPosition="start"
                sx={{ minHeight: '60px', fontSize: '1rem', textTransform: 'none' }}
              />
              <Tab
                label="Library"
                value="library"
                icon={<i className='tabler-database text-xl' />}
                iconPosition="start"
                sx={{ minHeight: '60px', fontSize: '1rem', textTransform: 'none' }}
              />
            </Tabs>
          </div>

          {activeTab === 'library' && <Library />}
          {activeTab === 'sync' && <Sync onUpdateCount={setUnsyncedCount} />}
        </Card>
      </Grid>
    </Grow>
  )
}

export default ListTable
