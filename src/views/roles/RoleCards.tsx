'use client'

import { useState, useEffect } from 'react'

// MUI Imports
import Image from 'next/image'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import AvatarGroup from '@mui/material/AvatarGroup'
import Button from '@mui/material/Button'
import type { TypographyProps } from '@mui/material/Typography'
import type { CardProps } from '@mui/material/Card'


// Component Imports
import RoleDialogEdit from './RoleDialogEdit'
import RoleDialogDelete from './RoleDialogDelete'
import OpenDialogOnElementClick from './OpenDialogOnElementClick'
import Link from '@components/Link'
import CustomAvatar from '@core/components/mui/Avatar'
import type { VerticalMenuDataType } from '@/types/menuTypes'
import type { RoleDefaultProps } from '@/libs/prisma-selects'

type CardDataType = {
  title: string
  avatars: string[]
  totalUsers: number
  data: RoleDefaultProps
}


const RoleCards = ({ permission, roleData, menuData, updateDataRole }: { permission: string[], roleData: RoleDefaultProps[], menuData: VerticalMenuDataType[], updateDataRole: (datas: RoleDefaultProps[]) => void }) => {

  const [cardData, setcardData] = useState<CardDataType[]>(roleData.map((mp) => {
    return {
      totalUsers: mp.users.length,
      title: mp.name,
      avatars: mp.users.filter((mp1) => mp1.image).map((mp1) => mp1.image as string),
      data: mp
    }
  }))

  useEffect(() => {
    setcardData(roleData.map((mp) => {
      return {
        totalUsers: mp.users.length,
        title: mp.name,
        avatars: mp.users.filter((mp1) => mp1.image).map((mp1) => mp1.image as string),
        data: mp
      }
    }))
  }, [roleData])

  // Vars
  const typographyProps: TypographyProps = permission?.includes('write') ? {
    children: 'Edit',
    component: Link,
    color: 'primary',
    onClick: e => e.preventDefault()
  } : {
    children: null
  }

  const typographyPropsDelete: TypographyProps = permission?.includes('delete') ? {
    children: 'Delete',
    component: Link,
    color: 'red',
    onClick: e => e.preventDefault()
  } : {
    children: null
  }

  const CardProps: CardProps = {
    className: 'cursor-pointer bs-full',
    children: (
      <Grid container className='bs-full hover:animate-pulse'>
        <Grid size={5}>
          <div className='flex items-end justify-center bs-full'>
            <Image alt='add-role' src='/images/illustrations/characters/9.png' height={130} width={130} />
          </div>
        </Grid>
        <Grid size={7}>
          <CardContent>
            <div className='flex flex-col items-end gap-4 text-right'>
              <Button variant='contained' size='small'>
                Add Role
              </Button>
              <Typography>
                Add role, <br />
                if it doesn&#39;t exist.
              </Typography>
            </div>
          </CardContent>
        </Grid>
      </Grid>
    )
  }

  const updateData = (datas: RoleDefaultProps[]) => {
    updateDataRole(datas)
  }

  return (
    <Grid container spacing={6}>
      {cardData.map((item, index) => (
        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={index}>
          <Card>
            <CardContent className='flex flex-col gap-4'>
              <div className='flex items-center justify-between'>
                <Typography className='grow'>{`Total ${item.totalUsers} users`}</Typography>
                <AvatarGroup total={item.totalUsers}>
                  {item.avatars.map((img, index: number) => (
                    <CustomAvatar key={index} alt={item.title} src={`${img}`} size={40} />
                  ))}
                  {!item.avatars.length && !item.totalUsers ? <CustomAvatar alt={'0'} src={`+0`} size={40} /> : null}
                </AvatarGroup>
              </div>
              <div className='flex justify-between items-center'>
                <div className='flex flex-col items-start gap-1'>
                  <Typography variant='h5'>{item.title}</Typography>
                  <div className='flex gap-2'>
                    {permission?.includes('write') || permission?.includes('delete') ?
                      <OpenDialogOnElementClick
                        menuData={menuData}
                        data={item.data}
                        elementEdit={Typography}
                        elementDelete={Typography}
                        elementPropsEdit={typographyProps}
                        elementPropsDelete={typographyPropsDelete}
                        dialogEdit={RoleDialogEdit}
                        dialogDelete={RoleDialogDelete}
                        updateData={updateData}
                        dialogPropsEdit={{ title: item.title }}
                        dialogPropsDelete={{ title: item.title }}
                      /> : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {permission?.includes('create') ?
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <OpenDialogOnElementClick
            menuData={menuData}
            dialogEdit={RoleDialogEdit}
            dialogDelete={RoleDialogDelete}
            updateData={updateData}
            elementEdit={Card}
            elementDelete={Card}
            elementPropsEdit={CardProps}
            elementPropsDelete={{
              children: null
            }}
          />
        </Grid> : null}
    </Grid>
  )
}

export default RoleCards
