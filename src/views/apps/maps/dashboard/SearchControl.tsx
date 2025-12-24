'use client'

import { useEffect } from 'react';

import { useMap } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';

// @ts-ignore
import 'leaflet-geosearch/dist/geosearch.css';


// Props opsional jika ingin menangkap hasil search
interface SearchControlProps {
  onResult?: (result: any) => void;
}

const SearchControl = ({ onResult }: SearchControlProps) => {
  const map = useMap(); // Akses instance peta

  useEffect(() => {
    // 1. Pilih Provider (Sumber Data), bisa OSM, Google, Bing, dll.
    const provider = new OpenStreetMapProvider();

    // 2. Konfigurasi Search Control
    // @ts-ignore (Terkadang TypeScript komplain soal tipe GeoSearchControl)
    const searchControl = new GeoSearchControl({
      provider: provider,
      style: 'button', // Tampilan: 'bar' atau 'button'
      showMarker: true, // Tampilkan marker saat ketemu
      showPopup: true, // Tampilkan popup label
      autoClose: true, // Tutup hasil saat dipilih
      retainZoomLevel: false, // Zoom otomatis ke lokasi
      animateZoom: true,
      keepResult: true,
      searchLabel: 'Cari alamat...',
    });

    // 3. Tambahkan ke Peta
    map.addControl(searchControl);

    // 4. (Opsional) Event Listener saat lokasi ditemukan
    const handleShowLocation = (result: any) => {
      if (onResult) {
        onResult(result);
        console.log("Lokasi ditemukan:", result);
      }
    };

    map.on('geosearch/showlocation', handleShowLocation);

    // 5. Cleanup (Hapus control saat component di-unmount)
    return () => {
      map.removeControl(searchControl);
      map.off('geosearch/showlocation', handleShowLocation);
    };
  }, [map, onResult]);

  return null; // Component ini tidak merender UI React, tapi nempel di Leaflet
};

export default SearchControl;
