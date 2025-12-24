// MUI Imports
import Grid from '@mui/material/Grid'

// Component Imports
import MapComponent from '@views/apps/maps/dashboard'
import WelcomeCard from '@views/apps/academy/dashboard/WelcomeCard'

/**
 * ! If you need data using an API call, uncomment the below API code, update the `process.env.API_URL` variable in the
 * ! `.env` file found at root of your project and also update the API endpoints like `/apps/academy` in below example.
 * ! Also, remove the above server action import and the action itself from the `src/app/server/actions.ts` file to clean up unused code
 * ! because we've used the server action for getting our static data.
 */

/* const getAcademyData = async () => {
  // Vars
  const res = await fetch(`${process.env.API_URL}/apps/academy`)

  if (!res.ok) {
    throw new Error('Failed to fetch academy data')
  }

  return res.json()
} */

const AcademyDashboard = async () => {

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <WelcomeCard />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <MapComponent />
      </Grid>
    </Grid>
  )
}

export default AcademyDashboard
