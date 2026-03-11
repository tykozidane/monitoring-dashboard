// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import { Grow } from '@mui/material'

import UserListTable from './UserListTable'
import type { RoleDefaultProps } from '@/libs/prisma-selects'

const UserList = ({ permission, roleData, updateDataRole }: { permission: string[], roleData: RoleDefaultProps[], updateDataRole?: (datas: RoleDefaultProps[]) => void }) => {
  const Subject = 'Users';

  return (
    <Grow in={true}>
      <Grid container spacing={6}>
        <Grid size={12}>
          <div className="col-12">
            <h1 className="text-4xl font-bold">{Subject}</h1>
          </div>
        </Grid>
        <Grid size={12}>
          <UserListTable permission={permission} updateDataRole={updateDataRole} roleData={roleData} />
        </Grid>
      </Grid>
    </Grow>
  )
}

export default UserList
