// eslint-disable-next-line import/no-unresolved

'use client'

import { useEffect, useRef } from 'react';

import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface MeasureControlProps {
  onPathChange?: (coordinates: { lat: number; lng: number }[]) => void;
}

const MeasureControl = ({ onPathChange }: MeasureControlProps) => {
  const map = useMap();
  const historyRef = useRef<{ lat: number; lng: number }[]>([]);
  const controlRef = useRef<any>(null);

  // --- FIX 1: Gunakan Ref untuk menyimpan callback terbaru ---
  // Ini mencegah useEffect utama reload hanya karena onPathChange berubah
  const onPathChangeRef = useRef(onPathChange);

  // Update ref setiap kali prop onPathChange berubah
  useEffect(() => {
    onPathChangeRef.current = onPathChange;
  }, [onPathChange]);

  useEffect(() => {
    if (!map) return;

    const startMeasurePlugin = async () => {
      try {
        // Cek jika plugin belum ada di global L
        if (!(L.Control as any).PolylineMeasure) {
          await import('leaflet.polylinemeasure');

          // @ts-ignore
          await import('leaflet.polylinemeasure/Leaflet.PolylineMeasure.css');
        }
      } catch (err) {
        console.error("Gagal load plugin:", err);

        return;
      }

      // Hapus control lama jika ada (cleanup sisa)
      if (controlRef.current) {
        map.removeControl(controlRef.current);
      }

      const options = {
        position: 'topleft',
        unit: 'kilometres',
        showBearings: true,
        clearMeasurementsOnStop: false,
        showClearControl: true,
        showUnitControl: true,

        // Tambahan opsi agar lebih stabil
        tooltipTextFinish: 'Klik untuk selesai',
        tooltipTextDelete: 'Tekan SHIFT + Klik untuk hapus titik',
        tooltipTextMove: 'Klik dan geser untuk memindahkan',
        tooltipTextResume: 'Klik resume untuk lanjut',
        tooltipTextAdd: 'Klik untuk mulai menggambar',
      };

      // @ts-ignore
      const measureControl = new L.Control.PolylineMeasure(options);

      measureControl.addTo(map);
      controlRef.current = measureControl;

      const handleAdd = (e: any) => {
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };

        historyRef.current = [...historyRef.current, newPoint];

        // --- FIX 2: Panggil via Ref, bukan prop langsung ---
        if (onPathChangeRef.current) {
          onPathChangeRef.current(historyRef.current);
        }
      };

      const handleClear = () => {
        historyRef.current = [];


        // --- FIX 3: Panggil via Ref ---
        if (onPathChangeRef.current) {
          onPathChangeRef.current([]);
        }

        console.log("Cleared");
      };

      // Event listener khusus plugin ini
      map.on('polylinemeasure:add', handleAdd);
      map.on('polylinemeasure:clear', handleClear);

      // (Opsional) Handle saat user menekan 'Finish' tapi tidak clear
      // map.on('polylinemeasure:finish', ...);
    };

    startMeasurePlugin();

    return () => {
      if (controlRef.current) {
        try {
          map.removeControl(controlRef.current);
        } catch (e) {
          console.warn("Cleanup error", e);
        }
      }

      map.off('polylinemeasure:add');
      map.off('polylinemeasure:clear');
    };

    // --- FIX 4: HAPUS 'onPathChange' dari dependency array ---
    // Sekarang useEffect ini HANYA jalan jika 'map' berubah (init awal)
  }, [map]);

  return null;
};

export default MeasureControl;
