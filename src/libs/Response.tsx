import { NextResponse } from 'next/server';

const replacer = (key: string, value: any) => {
  return typeof value === 'bigint' ? value.toString() : value;
};

export function JsonResponse(data: { data?: any; status: number; message: string | string[], error?: string | boolean }) {

  return NextResponse.json(
    JSON.parse(JSON.stringify(data, replacer)),
    data?.error ? { status: data.status } : undefined
  );
}
