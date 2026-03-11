'use client'

import { useState, useEffect } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid'
import Grow from '@mui/material/Grow'

import { Divider } from '@mui/material'

import UserList from '../user'

// Component Imports
import RoleCards from './RoleCards'
import type { VerticalMenuDataType } from '@/types/menuTypes'
import type { RoleDefaultProps } from '@/libs/prisma-selects'

const Roles = ({ permission, permissionUsers, roleData, menuData }: { permissionUsers: string[], permission: string[], roleData: RoleDefaultProps[], menuData: VerticalMenuDataType[] }) => {

  const Subject = 'Roles';

  const [role, setroleData] = useState(roleData)

  return (
    <Grow in={true}>
      <Grid container spacing={6}>
        <Grid size={12}>
          <div className="col-12 ">
            <h1 className="text-4xl font-bold">{Subject}</h1>
          </div>
        </Grid>
        <Grid size={12}>
          <RoleCards permission={permission} updateDataRole={(datas: any) => setroleData(datas)} menuData={menuData} roleData={role} />
          <br />
          <Divider />
          <br />
          <UserList permission={permissionUsers} updateDataRole={(datas) => setroleData(datas)} roleData={role} />
        </Grid>
      </Grid>
    </Grow>
  )
}

export default Roles
