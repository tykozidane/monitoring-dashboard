// BoundsHandler.tsx
'use client'

import { useEffect } from 'react';

import { useMap, useMapEvents } from 'react-leaflet';

interface BoundsHandlerProps {
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}

const BoundsHandler = ({ onBoundsChange }: BoundsHandlerProps) => {
  const map = useMap();

  // 1. Fungsi untuk update bounds
  const updateBounds = () => {
    const bounds = map.getBounds(); // Ambil batas kotak area yang terlihat

    onBoundsChange(bounds);
  };

  // 2. Jalankan sekali saat pertama kali load
  useEffect(() => {
    updateBounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // 3. Event Listener (moveend mencakup zoom DAN geser/pan)
  useMapEvents({
    moveend: () => updateBounds(),
    zoomend: () => updateBounds(), // Opsional (moveend biasanya sudah cover zoom)
  });

  return null;
};

export default BoundsHandler;
