'use client'

import { useEffect, useState } from 'react';

import { Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';

import DriftMarker from "react-leaflet-drift-marker";

// --- 1. RUMUS MENGHITUNG SUDUT (BEARING) ---
const getBearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));

  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);

  const bearing = toDeg(Math.atan2(y, x));

  return (bearing + 360) % 360; // Normalisasi ke 0-360 derajat
};

// Jalur Pesawat (Jakarta Loop)
const FLIGHT_PATH = [
  { lat: -6.125578, lng: 106.655935 }, // Soekarno Hatta
  { lat: -6.175392, lng: 106.827153 }, // Monas
  { lat: -6.225000, lng: 106.800000 }, // Blok M
  { lat: -6.265538, lng: 106.884218 }, // Halim
  { lat: -6.125578, lng: 106.655935 }, // Balik ke Soetta
];

const PlaneMarker = () => {
  const [, setCurrentIndex] = useState(0);
  const [position, setPosition] = useState(FLIGHT_PATH[0]);
  const [angle, setAngle] = useState(0); // State untuk sudut putaran

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        // 1. Tentukan Titik Sekarang & Titik Tujuan
        const nextIndex = (prevIndex + 1) % FLIGHT_PATH.length;
        const start = FLIGHT_PATH[prevIndex];
        const end = FLIGHT_PATH[nextIndex];

        // 2. Hitung Arah (Bearing)
        const newBearing = getBearing(start.lat, start.lng, end.lat, end.lng);

        setAngle(newBearing);

        // 3. Update Posisi
        setPosition(end);

        return nextIndex;
      });
    }, 3000); // 3 Detik

    return () => clearInterval(interval);
  }, []);

  // --- 2. ICON DINAMIS (BISA BERPUTAR) ---
  // Menggunakan L.DivIcon agar bisa menyisipkan style "transform: rotate"
  const rotatedIcon = new L.DivIcon({
    className: 'plane-icon-custom', // Class custom (bisa dikosongkan)
    html: `
      <div style="
        transform: rotate(${angle}deg);
        transition: transform 3s linear; /* Animasi putaran halus */
        width: 50px; height: 50px;
        display: flex; justify-content: center; align-items: center;
      ">
        <img
          src="https://static.vecteezy.com/system/resources/previews/015/242/306/original/aircraft-or-airplane-on-top-view-png.png"
          style="width: 100%; height: 100%; filter: drop-shadow(3px 5px 2px rgba(0,0,0,0.4));"
        />
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25],
  });

  return (
    <DriftMarker
      icon={rotatedIcon} // Masukkan icon yang sudah diputar
      position={position}
      duration={3000} // Samakan dengan interval useEffect
    >
      <Popup>
        <b>Garuda Indonesia</b><br />
        Heading: {Math.round(angle)}°
      </Popup>
      <Tooltip>GA-737</Tooltip>
    </DriftMarker>
  );
};

export default PlaneMarker;
