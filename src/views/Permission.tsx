'use client'

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import BlankLayout from "@/@layouts/BlankLayout";
import NotAuthorized from "./NotAuthorized";
import type { Mode, SystemMode } from "@/@core/types";

const Permission = ({ lang, mode, systemMode, permission, children }: { lang: string, mode: Mode, systemMode: SystemMode, permission: NavigationItem[], children: ReactNode }) => {
  const [state, setstate] = useState<boolean>(true);

  const pathname = usePathname().replaceAll('/' + lang, '');


  const checkPathPermission = (
    pathname: string,
    data: MenuItem[],
    excludedPaths: string[] = []
  ): boolean => {
    // Jika pathname ada dalam excludedPaths, kembalikan true
    if (excludedPaths.includes(pathname)) {
      return true;
    }

    // Fungsi untuk melakukan pengecekan pada data
    const findPermission = (items: MenuItem[]): boolean => {
      if (items) {
        for (const item of items) {
          // Jika path ditemukan di href dan action mengandung 'read'
          if (item.href === pathname && item.action?.includes('read')) {
            return true;
          }

          // Jika ada children, lakukan pengecekan secara rekursif
          if (item.children) {
            const foundInChildren = findPermission(item.children);

            if (foundInChildren) {
              return true;
            }
          }
        }
      }

      return false;
    };

    // Jika path ditemukan di data dan mengandung 'read', kembalikan true
    const pathExistsInData = findPermission(data);

    // Jika path tidak ada di data, kembalikan false
    return pathExistsInData;
  };

  const excludedPaths = ['/accounts'];

  useEffect(() => {
    setstate(checkPathPermission(pathname, permission, excludedPaths));
  }, [pathname, permission, excludedPaths, checkPathPermission]);


  return state ? children : <BlankLayout systemMode={systemMode}>
    <NotAuthorized mode={mode} />
  </BlankLayout>

}

export default Permission;
