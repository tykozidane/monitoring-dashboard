'use client'

import dynamic from 'next/dynamic';

const MapView = dynamic(
  () => import('@/views/dashboard/maps/dashboard/MapComponent'),
  {
    ssr: false,
    loading: () => <div className="h-[400px] bg-gray-100 flex items-center justify-center">Loading Peta...</div>
  }
);

export default function DashboardPage() {

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">Dashboard Peta</h1>

      <div className="border rounded-lg overflow-hidden shadow-lg h-[500px]">
        <MapView />
      </div>
    </div>
  );
}
