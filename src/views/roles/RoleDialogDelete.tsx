'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import DialogActions from '@mui/material/DialogActions'
import { CircularProgress, Button } from '@mui/material'

// Style Imports
import { toast } from 'react-toastify'

import ApiSend from '@/components/ApiSend'


type RoleDialogProps = {
  open: boolean
  setOpen: (open: boolean) => void
  title?: string
  data?: any
  menuData: any
  updateData: (datas: any) => void
}


const RoleDialogDelete = ({ open, setOpen, title, data, menuData, updateData }: RoleDialogProps) => {
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    setOpen(false)
  }

  const onSubmit = async () => {
    setLoading(true)

    const postData = {
      id: data?.id,
    };

    const res = await ApiSend({ url: `/role`, method: 'DELETE', data: postData });

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    if (res?.valid) {
      toast.success(res.message)
      if (res.data) updateData(res.data)
      await sleep(500)
      handleClose()
    } else if (res.status == 401) {
      toast.info(res.message)
      await sleep(500)
      handleClose()
    } else {
      toast.error(res.message)
      await sleep(500)
      handleClose()
    }

    await sleep(100)
    setLoading(false)
  }

  return (
    <Dialog fullWidth maxWidth='md' scroll='body' open={open} onClose={handleClose}>
      <DialogTitle variant='h4' className='flex gap-2 flex-col sm:pbs-16 sm:pbe-6 sm:pli-16'>
        <div className='max-sm:is-[80%] max-sm:text-center'>Delete Data ?</div>
        <Typography component='span' className='flex flex-col '>
          You will delete {data?.name ?? data?.name} data!!
        </Typography>
      </DialogTitle>
      <DialogActions className='pbs-0 sm:pbe-16 sm:pli-16'>
        <Button disabled={loading} variant='contained' onClick={onSubmit} color="error" type='submit' className='gap-2'> {loading && <CircularProgress size={20} color='inherit' />}
          Delete
        </Button>
        <Button disabled={loading} variant='outlined' color='secondary' type='reset' onClick={handleClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RoleDialogDelete
