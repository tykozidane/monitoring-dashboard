import React from 'react';
import { Skeleton, Box, Grid, Card } from '@mui/material';

const Loading: React.FC = () => {
  return (
    <Box>
      <Grid size={12}>
        <Card className='p-5'>
          <div className='flex justify-between'>
            <Skeleton animation="wave" width="30%" height={60} />
            <Skeleton animation="wave" width="40%" height={60} />
          </div>
          <div>
            <Skeleton animation="wave" className='w-full mt-2' variant="rectangular" height={50} />
            <Skeleton className='w-full mt-3' animation="wave" variant="rectangular" height={500} />
          </div>
        </Card>
      </Grid>
    </Box>
  );
};

export default Loading;
