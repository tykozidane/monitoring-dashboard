// React Imports
import React, { useState } from 'react'

// MUI Imports
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import { toast } from 'react-toastify'
import { useForm, Controller } from 'react-hook-form'
import Autocomplete from '@mui/material/Autocomplete'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { email, object, minLength, string, regex, pipe, nonEmpty } from 'valibot'

import ApiSend from '@/components/ApiSend'
import { ImagePost } from '@/components/ImagePost';
import { base64ToFile, isBase64 } from '@/utils/helpers'

type Props = {
  open: boolean
  handleClose: () => void
  roleData: any
  updateData: (datas: any) => void,
}


const schema = object({
  name: pipe(
    string(),
    minLength(1, 'This field is required'),
    minLength(3, 'First Name must be at least 3 characters long')
  ),
  username: pipe(
    string(),
    minLength(1, 'This field is required'),
    minLength(3, 'Username must be at least 3 characters long'),
    regex(/^[a-zA-Z0-9]+$/, 'Username invalid')
  ),
  password: pipe(
    string('Your password must be a string.'),
    nonEmpty('Please enter your password.'),
    minLength(8, 'Your password must have 8 characters or more.')
  ),
  role: pipe(
    string(),
    minLength(1, 'This field is required')
  )
});

const AddUserDrawer = ({ roleData, open, handleClose, updateData }: Props) => {

  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    reset()
    handleClose()
  }


  const {
    control,
    reset,
    handleSubmit,
    getValues,
    formState: { errors }
  } = useForm<any>({
    resolver: valibotResolver(schema),
    defaultValues: {
      name: '',
      username: '',
      password: '',
      role: '',
    }
  })

  const onSubmit = async () => {

    setLoading(true)

    const data = { ...getValues(), status: 'active', emailVerified: new Date, roleId: roleData.find((f: any) => getValues()?.['role'] == f.name)?.id }

    delete data.role

    if (isBase64(data.image)) {
      data.image = base64ToFile(data.image);
    } else {
      delete data.image
    }

    const res = await ApiSend({
      url: `/user`,
      method: 'POST',
      headers: {
        "Content-Type": "multipart/form-data",
      },
      data
    });

    if (res?.valid) {
      toast.success(res.message)
      reset()
      handleClose()
      if (res.data) updateData(res.data)
    } else if (res.status == 401) {
      toast.info(res.message)
    } else {
      toast.error(res.message)
    }

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    await sleep(500)
    setLoading(false)
  }

  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const handleClickShowPassword = () => setIsPasswordShown(show => !show)


  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleReset}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 400 } } }}
    >
      <div className='flex items-center justify-between pli-5 plb-4'>
        <Typography variant='h5'>Add User</Typography>
        <IconButton size='small' onClick={handleReset}>
          <i className='ri-close-line text-2xl' />
        </IconButton>
      </div>
      <Divider />
      <div className='p-5'>
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5'>
          <ImagePost control={control} name='image' />
          <Controller
            name='name'
            control={control}
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                label='Full Name'
                placeholder='John Die'
                error={!!fieldState.error} helperText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name='username'
            control={control}
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                label='Username'
                placeholder='John'
                error={!!fieldState.error} helperText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name='password'
            control={control}
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                label='Password'
                placeholder='············'
                id='form-validation-basic-password'
                type={isPasswordShown ? 'text' : 'password'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        size='small'
                        edge='end'
                        onClick={handleClickShowPassword}
                        onMouseDown={e => e.preventDefault()}
                        aria-label='toggle password visibility'
                      >
                        <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Controller
            name={'role'}
            control={control}
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <Autocomplete
                {...field}
                disableClearable
                options={roleData.map((mp: any) => mp.name)}
                fullWidth
                onChange={(_, data) => field.onChange(data)}
                value={field?.value || null}
                renderInput={params => <TextField  {...params} error={!!fieldState.error} helperText={fieldState.error?.message} label={'Role'} />}
              />
            )}
          />
          <div className='flex items-center gap-4'>
            <Button disabled={loading} variant='contained' type='submit' className='gap-2'> {loading && <CircularProgress size={20} color='inherit' />}
              Submit
            </Button>
            <Button disabled={loading} variant='outlined' color='error' type='reset' onClick={handleReset}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  )
}

export default AddUserDrawer
