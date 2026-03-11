'use client'

import { useState } from 'react'

import type { ComponentType, MouseEvent } from 'react'

import type { TypographyProps } from '@mui/material'

import type { RoleDefaultProps } from '@/libs/prisma-selects'
import type { VerticalMenuDataType } from '@/types/menuTypes'

// React Imports

type OpenDialogOnElementClickProps = {
  elementEdit: ComponentType
  elementDelete: ComponentType<any>
  dialogEdit: ComponentType<any>
  dialogDelete: ComponentType<any>
  elementPropsEdit?: any
  elementPropsDelete: TypographyProps
  dialogPropsEdit?: { title: string }
  dialogPropsDelete?: { title: string }
  data?: RoleDefaultProps
  menuData: VerticalMenuDataType[]
  updateData: (datas: RoleDefaultProps[]) => void
}

const OpenDialogOnElementClick = (props: OpenDialogOnElementClickProps) => {
  // Props
  const { elementEdit: Element, elementDelete: ElementDelete, dialogEdit: DialogEdit, dialogDelete: DialogDelete, elementPropsEdit, elementPropsDelete, dialogPropsEdit, dialogPropsDelete, data, menuData, updateData } = props

  // States
  const [open, setOpen] = useState(false)
  const [open1, setOpen1] = useState(false)

  // Extract onClick from elementProps
  const { onClick: elementOnClick, ...restElementPropsEdit } = elementPropsEdit || {}
  const { onClick: elementOnClickDelete, ...restElementPropsDelete } = elementPropsDelete || {}

  // Handle onClick event
  const handleOnClick = (e: MouseEvent<HTMLElement>) => {
    elementOnClick && elementOnClick(e)
    setOpen(true)
  }

  const handleOnClickDelete = (e: MouseEvent<HTMLElement>) => {
    elementOnClickDelete && elementOnClickDelete(e)
    setOpen1(true)
  }

  return (
    <>
      {/* Receive element component as prop and we will pass onclick event which changes state to open */}
      <Element onClick={handleOnClick} {...restElementPropsEdit} />
      <ElementDelete onClick={handleOnClickDelete} {...restElementPropsDelete} />
      {/* Receive dialog component as prop and we will pass open and setOpen props to that component */}
      <DialogEdit updateData={updateData} open={open} setOpen={setOpen} {...dialogPropsEdit} data={data} menuData={menuData} />
      <DialogDelete updateData={updateData} open={open1} setOpen={setOpen1} {...dialogPropsDelete} data={data} menuData={menuData} />
    </>
  )
}

export default OpenDialogOnElementClick
