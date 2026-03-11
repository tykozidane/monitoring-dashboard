import path from 'path';

import fs from 'fs';

import type { NextRequest } from "next/server";

import { format } from "date-fns";

import { getToken } from 'next-auth/jwt';


const JWT_SECRET = process.env.NEXTAUTH_SECRET as string

//for web
export async function MiddlewareApi(req: NextRequest, run: (request: any) => any) {
  try {
    const sessionJWT = await getToken({ req, secret: JWT_SECRET })
    let body = {
      query: req.nextUrl.searchParams,
      session: sessionJWT
    }


    if (!sessionJWT) {
      return {
        message: 'Session Invalid',
        status: 401,
        error: true
      }
    }


    if (req.headers.get('Content-Type')?.includes('multipart/form-data')) {
      const formData = await req.formData();

      const formDataToObject = (formData: FormData): Record<string, any> => {
        const obj: Record<string, any> = {};

        formData.forEach((value, key) => {
          const normalizedKey = key.replace(/\[\d+\]/g, ''); // Remove array index brackets like [0], [1], etc.

          if (key.includes('[')) {
            // Handle cases like data[0][files]
            const [mainKey, subKey] = normalizedKey.split('[').map(k => k.replace(']', ''));

            if (!obj[mainKey]) obj[mainKey] = [];

            const indexMatch = key.match(/\[(\d+)\]/);
            const index = indexMatch ? parseInt(indexMatch[1]) : obj[mainKey].length;

            obj[mainKey][index] = obj[mainKey][index] || {};
            obj[mainKey][index][subKey] = value;
          } else {
            // Handle regular keys
            if (normalizedKey in obj) {
              if (Array.isArray(obj[normalizedKey])) {
                obj[normalizedKey].push(value);
              } else {
                obj[normalizedKey] = [obj[normalizedKey], value];
              }
            } else {
              obj[normalizedKey] = value;
            }
          }
        });

        return obj;
      };

      const data = formDataToObject(formData);

      if (req.method == 'PATCH' && !data.id) {
        return {
          message: 'Request Invalid',
          status: 400
        }
      }

      body = { ...body, ...data };

    } else if (req.headers.get('Content-Type')?.includes('application/json')) {
      const data = await req.json().catch(() => ({}));

      if (req.method == 'PATCH' && !data.id) {
        return {
          message: 'Request Invalid',
          status: 400
        }
      }

      body = { ...body, ...data };
    }

    return run(body);

  } catch (err) {
    console.log(err);

    return {
      message: 'Server is not responding',
      status: 500,
      error: true
    }
  }
}

export async function FileHandle({
  file,
  name,
  dir,
  mime = [],
  size = { min: 0, max: Infinity },
  deleteFile
}: {
  file?: File,
  name?: string,
  dir?: string,
  mime?: string[],
  size?: { min?: number, max?: number }, // Size is now in MB
  deleteFile?: string | null
}) {
  if (file && name && dir && file?.name && file?.size) {
    try {
      // Convert size from MB to bytes
      const minSize = (size.min || 0) * 1024 * 1024; // Convert min size from MB to bytes
      const maxSize = (size.max || Infinity) * 1024 * 1024; // Convert max size from MB to bytes

      // Get file extension
      const ext = file.name.split('.').pop();
      const mimeType = file.type;

      // Check MIME type
      if (mime.length && !mime.includes(mimeType)) {
        throw new Error(`Invalid MIME type. Allowed types: ${mime.join(', ')}`);
      }

      // Check file size
      if (file.size < minSize || (size.max !== undefined && file.size > maxSize)) {
        let errorMessage = `File size should be at least ${size.min || 0} MB`;

        if (size.max !== undefined) {
          errorMessage += ` and at most ${size.max} MB.`;
        } else {
          errorMessage += '.';
        }

        throw new Error(errorMessage);
      }

      // Convert file to buffer
      const buffer: string | any = Buffer.from(await file.arrayBuffer());

      // Ensure directory exists
      fs.mkdirSync(dir, { recursive: true });


      if (deleteFile && fs.existsSync('./public' + deleteFile)) {
        fs.unlinkSync('./public' + deleteFile);
      }

      // Construct file name and path
      const nameFile = `${name}_${format(new Date(), "yy-MM-dd-HHmmss")}.${ext}`;
      const pathFile = path.join(dir, nameFile).replace('public', '').replaceAll('\\', '/');

      const fullPath = path.resolve(dir, nameFile);

      fs.writeFileSync(fullPath, buffer);

      // ✅ Ambil owner dari folder dan set ke file
      const folderStat = fs.statSync(dir);
      const uid = folderStat.uid;
      const gid = folderStat.gid;

      fs.chownSync(fullPath, uid, gid);

      // pastikan permission read untuk semua
      fs.chmodSync(fullPath, 0o644);

      return { path: pathFile }
    } catch (error: any) {
      return { error: error.message };
    }
  } else if (deleteFile) {
    if (deleteFile && fs.existsSync('./public' + deleteFile)) {
      fs.unlinkSync('./public' + deleteFile);
    }

    return { success: 'Success Delete File' }
  } else {
    function isImageFile(file: any): boolean {
      return file?.mimetype
    }

    if (isImageFile(file)) {
      return { error: 'Function FileHandle Error' }
    }

    return null
  }
}
