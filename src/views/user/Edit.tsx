'use client'

import { useEffect, useState } from 'react'

import Image from "next/image";


import { toast } from 'react-toastify'

import { useForm, Controller } from 'react-hook-form'

import { Autocomplete, CircularProgress, DialogActions, Button, Dialog, DialogTitle, Typography, DialogContent, IconButton, Grid, TextField } from '@mui/material'



import { valibotResolver } from '@hookform/resolvers/valibot'
import { email, object, minLength, string, regex, pipe, nonEmpty } from 'valibot'

import ApiSend from '@/components/ApiSend'
import { ImagePost } from "@/components/ImagePost";
import { base64ToFile, isBase64 } from "@/utils/helpers";
import type { RoleDefaultProps, UserDefaultProps } from "@/libs/prisma-selects";

const schema = object({
  name: pipe(
    string(),
    minLength(1, 'This field is required'),
    minLength(3, 'First Name must be at least 3 characters long')
  ),
  username: pipe(
    string(),
    minLength(1, 'This field is required'),
    minLength(5, 'First Name must be at least 5 characters long'),
    regex(/^[a-zA-Z0-9]+$/, 'Username invalid')
  ),
  role: pipe(
    string(),
    minLength(1, 'This field is required')
  )
});

const Edit = ({ Open, roleData, handleClose, updateData }: { Open?: UserDefaultProps, roleData: RoleDefaultProps[], updateData: (datas: RoleDefaultProps) => void, handleClose: () => void }) => {
  const [loading, setLoading] = useState(false)

  const {
    control,
    reset,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors }
  } = useForm<any>({
    resolver: valibotResolver(schema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      role: '',
    }
  })

  useEffect(() => {
    setValue('id', Open?.id);
    setValue('name', Open?.name ?? '');
    setValue('username', Open?.username ?? '');
    setValue('role', Open?.role?.name);
    setValue('image', Open?.image);

  }, [Open, setValue]);

  const handleEdit = async () => {
    setLoading(true)

    const data = {
      ...getValues(),
      image_del: getValues().image === null ? "1" : undefined,
      image: isBase64(getValues().image) ? base64ToFile(getValues().image) : undefined,
      roleId: roleData.find((f) => getValues()?.['role'] == f.name)?.id
    }

    const res = await ApiSend({
      url: `/user`,
      method: 'PATCH',
      headers: {
        "Content-Type": "multipart/form-data",
      },
      data
    });

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    if (res?.valid) {
      toast.success(res.message)
      if (res.data) updateData(res.data)
      await sleep(500)
      handleClose()
      reset()
    } else if (res.status == 401) {
      toast.info(res.message)
    } else {
      toast.error(res.message)
      await sleep(500)
    }

    await sleep(100)
    setLoading(false)
  }

  return (
    <Dialog fullWidth open={!!Open} onClose={handleClose} maxWidth='md' scroll='body'>
      <DialogTitle variant='h4' className='flex gap-2 flex-col items-center sm:pt-16 sm:pb-6 sm:px-16'>
        <div className='max-sm:w-[80%] max-sm:text-center'>Edit User Information</div>
        <Typography component='span' className='flex flex-col text-center'>
          Updating user details.
        </Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit(handleEdit)}>
        <DialogContent className='overflow-visible pt-0 sm:pb-6 sm:px-16'>
          <IconButton onClick={handleClose} className='absolute top-4 end-4'>
            <i className='ri-close-line text-textSecondary' />
          </IconButton>
          <Grid container spacing={5}>
            <Grid size={12}>
              <ImagePost control={control} name='image' />
              <Controller
                name='name'
                control={control}
                rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    className='mt-5'
                    fullWidth
                    label='Full Name'
                    placeholder='John Die'
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
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
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
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
                    renderInput={params => (
                      <TextField
                        {...params}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        label={'Role'}
                      />
                    )}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions className='justify-center pt-0 sm:pb-16 sm:px-16'>
          <Button disabled={loading} variant='contained' type='submit' className='gap-2'>
            {loading && <CircularProgress size={20} color='inherit' />}
            Submit
          </Button>
          <Button variant='outlined' color='secondary' type='reset' onClick={handleClose}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )

}

export default Edit
