'use client'

import React, { useMemo } from 'react';


import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

import type { coordinate } from './MapComponent';

interface MarkerComponentProps {
  item: coordinate;
  onClick: (item: coordinate) => void;
}

const MarkerComponent: React.FC<MarkerComponentProps> = ({ item, onClick }) => {

  // Fungsi helper untuk mendapatkan warna
  const getColor = (status: string): string => {
    // Normalisasi string (opsional, untuk jaga-jaga huruf kecil/besar)
    const normalizedStatus = status ? status.toLowerCase() : '';

    if (normalizedStatus === 'ok') return '#22c55e';        // Green
    if (normalizedStatus === 'warning') return '#eab308';   // Yellow/Orange
    if (normalizedStatus === 'not ok') return '#ef4444';    // Red
    if (normalizedStatus === 'no data') return '#9ca3af';   // Grey

    return '#3b82f6';                                       // Default Blue
  };

  // Menggunakan useMemo agar icon tidak dibuat ulang setiap render (Performance)
  const icon = useMemo(() => {
    const color = getColor(item.status || '');

    // SVG String
    const svgString = `
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 10.9 12.5 28.5 12.5 28.5S25 23.4 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}"/>
        <circle cx="12.5" cy="12.5" r="5" fill="white"/>
      </svg>
    `;

    return new L.Icon({
      iconUrl: `data:image/svg+xml;base64,${typeof window !== 'undefined' ? window.btoa(svgString) : ''}`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
  }, [item.status]); // Icon hanya berubah jika status berubah


  return (
    <Marker
      position={[Number(item.n_lat || 0), Number(item.n_lng || 0)]}
      icon={icon}
      eventHandlers={{
        click: () => onClick(item),
      }}
    >
      {/* 🟢 Tooltip muncul saat hover */}
      <Tooltip direction="top" offset={[0, -30]}>
        <div className="text-sm">
          <div><b>Nama:</b> {item.n_station}</div>
          <div><b>Status:</b> {item.status}</div>
          <div><b>Project:</b> {item.n_project_name}</div>
        </div>
      </Tooltip>
    </Marker>
  );
};

export default MarkerComponent;
