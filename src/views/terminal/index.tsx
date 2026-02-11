// MUI Imports
import { Grow, Grid } from '@mui/material';

// Component Imports
import ListTable from './ListTable'

const List = () => {
  const Subject = 'Terminal Monitoring';

  return (
    <Grow in={true}>
      <Grid container spacing={6}>
        <Grid size={12}>
          <div className="col-12">
            <h1 className="text-4xl font-bold">{Subject}</h1>
          </div>
        </Grid>
        <Grid size={12}>
          <ListTable subject={Subject} />
        </Grid>
      </Grid>
    </Grow>
  )
}

export default List
