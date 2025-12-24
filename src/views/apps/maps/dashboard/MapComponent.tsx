'use client'

import React, { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';

import MarkerClusterGroup from 'react-leaflet-cluster';

// @ts-ignore
import 'leaflet/dist/leaflet.css';

// @ts-ignore
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'

// @ts-ignore
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'

import axios from 'axios';

import L from 'leaflet';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});



import MarkerComponent from './MarkerComponent';
import LineComponent from './LineComponent';
import FullscreenModal from './FullscreenModal';
import SearchControl from './SearchControl';
import MapWithPlane from './MapWithPlane';
import BoundsHandler from './BoundsHandler';

const MeasureControl = dynamic(() => import('./MeasureControl'), { ssr: false });

export type DeviceDetail = {
  c_project: string;
  n_project_name: string;
  n_project_desc: string;
  c_device: string;
  n_device_name: string;
  c_device_type: string;
  n_device_type_name: string;
  c_device_subtype: string;
  n_device_subtype_name: string;
  c_station: string;
  n_station: string;
  c_terminal: string;
  n_lat: string;
  n_lng: string;
  d_time_sensor: string; // ISO Date String
  created_at: string;    // ISO Date String
  status: "OK" | "WARNING" | "ERROR" | string; // Bisa dibuat spesifik jika statusnya pasti
};

export type coordinate = {
  c_project: number,
  n_project_name: number,
  n_project_desc: string,
  c_station: string,
  n_station: string,
  n_lat: string,
  n_lng: string,
  status: string
}

export type jalur = {
  lines?: number[][],
  desc?: string,
  color?: string,
  title?: string,
  status?: string,
}

const ZoomHandler = ({ onZoomChange }: { onZoomChange: (zoom: number) => void }) => {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom()); // Kirim level zoom terbaru ke parent
    },
  });

  return null;
};

const MapComponent = () => {
  const MIN_ZOOM_TO_SHOW = 18;
  const [currentZoom, setCurrentZoom] = useState(10);

  const [data, setData] = useState<coordinate[]>([]);

  const [dataJalur] = useState<jalur[]>(
    [
      {
        title: "Harjamukti - Ciracas",
        desc: "Line DKA - Harjamukti",
        color: "lime",
        lines: [
          [-6.373988, 106.895623],
          [-6.354946, 106.891856],
          [-6.334946, 106.887856],
          [-6.323826, 106.886606],
        ]
      },
      {
        title: "Ciracas - Kp. Rambutan",
        desc: "Line DKA - Harjamukti",
        color: "lime",
        lines: [
          [-6.323826, 106.886606],
          [-6.318731, 106.886570],
          [-6.311635, 106.885168],
          [-6.309541, 106.884325],
        ]
      },
      {
        title: "Kp. Rambutan - Taman Mini",
        desc: "Line DKA - Harjamukti",
        color: "lime",
        lines: [
          [-6.309541, 106.884325],
          [-6.307641, 106.883859],
          [-6.302393, 106.884041],
          [-6.302295, 106.884019],
          [-6.302106, 106.883981],
          [-6.298743, 106.882981],
          [-6.292874, 106.880535],
        ]
      },
      {
        title: "Taman Mini - Cawang",
        desc: "Line DKA - Harjamukti",
        color: "lime",
        lines: [
          [-6.292874, 106.880535],
          [-6.276698, 106.873912],
          [-6.274155, 106.873156],
          [-6.272367, 106.872876],
          [-6.269932, 106.872850],
          [-6.267852, 106.873246],
          [-6.265467, 106.873348],
          [-6.264377, 106.873195],
          [-6.259798, 106.873399],
          [-6.259075, 106.873386],
          [-6.255983, 106.872658],
          [-6.254154, 106.872676],
          [-6.250334, 106.873921],
          [-6.249401, 106.875365],
          [-6.248899, 106.875798],
          [-6.248396, 106.875852],
          [-6.247858, 106.875780],
          [-6.247446, 106.875527],
          [-6.246961, 106.874823],
          [-6.246225, 106.872386],
        ]
      },
      {
        title: "Cawang - Ciliwung",
        desc: "Line DKA - Harjamukti",
        color: "lime",
        lines: [
          [-6.246225, 106.872386],
          [-6.244183, 106.866715],
          [-6.243735, 106.865506],
          [-6.243510, 106.864577],
          [-6.243477, 106.864131],
        ]
      },
      {
        title: "Ciliwung - Cikoko",
        desc: "Line DKA - Harjamukti",
        color: "lime",
        lines: [
          [-6.243477, 106.864131],
          [-6.243376, 106.861924],
          [-6.243476, 106.857102],
        ]
      },
      {
        title: "Cikoko - Pancoran Bank BJB",
        desc: "Line DKA - Harjamukti",
        color: "lime",
        lines: [
          [-6.243476, 106.857102],
          [-6.243523, 106.851108],
          [-6.243682, 106.846508],
          [-6.243644, 106.843937],
          [-6.243644, 106.843595],
          [-6.243622, 106.843350],
          [-6.243463, 106.842746],
          [-6.242996, 106.841524],
          [-6.242127, 106.838469],
        ]
      },
      {
        title: "Pancoran Bank BJB - Kuningan",
        desc: "Line DKA - Harjamukti",
        color: "lime",
        lines: [
          [-6.242127, 106.838469],
          [-6.240971, 106.833682],
          [-6.240534, 106.832523],
          [-6.240278, 106.832105],
          [-6.239553, 106.831107],
          [-6.238710, 106.829809],
          [-6.237675, 106.828124],
          [-6.237355, 106.827856],
          [-6.237014, 106.827840],
          [-6.236828, 106.827845],
          [-6.236604, 106.827845],
          [-6.236374, 106.827824],
          [-6.236076, 106.827824],
          [-6.235836, 106.827931],
          [-6.235505, 106.828162],
          [-6.234928, 106.828755],
          [-6.234789, 106.828921],
          [-6.234597, 106.829307],
          [-6.234181, 106.830273],
          [-6.234043, 106.830514],
          [-6.233744, 106.830970],
          [-6.233424, 106.831335],
          [-6.233056, 106.831764],
          [-6.232717, 106.832068],
          [-6.232212, 106.832447],
          [-6.231767, 106.832667],
          [-6.231141, 106.832917],
          [-6.230432, 106.833130],
          [-6.229708, 106.833236],
          [-6.229051, 106.833213],
          [-6.228881, 106.833195],
        ]
      },
      {
        title: "Kuningan - Rasuna Said",
        desc: "Line DKA - Harjamukti",
        color: "lime",
        lines: [
          [-6.228881, 106.833195],
          [-6.223787, 106.832827],
          [-6.223563, 106.832763],
          [-6.221753, 106.832281],

        ]
      },
      {
        title: "Rasuna Said - Setiabudi",
        desc: "Line DKA - Harjamukti",
        color: "lime",
        lines: [
          [-6.221753, 106.832281],
          [-6.220278, 106.831829],
          [-6.219265, 106.831422],
          [-6.217825, 106.831015],
          [-6.216829, 106.830798],
          [-6.215968, 106.830690],
          [-6.213645, 106.830464],
          [-6.212219, 106.830410],
          [-6.210713, 106.830435],
          [-6.210180, 106.830382],
          [-6.209652, 106.830306],
          [-6.209277, 106.830231],
        ]
      },
      {
        title: "Setiabudi - Dukuh Atas",
        desc: "Line DKA - Harjamukti",
        color: "lime",
        lines: [
          [-6.209277, 106.830231],
          [-6.208543, 106.830076],
          [-6.208111, 106.829904],
          [-6.206959, 106.829389],
          [-6.206511, 106.829094],
          [-6.205946, 106.828547],
          [-6.205423, 106.828145],
          [-6.205268, 106.827951],
          [-6.205199, 106.827705],
          [-6.205162, 106.827383],
          [-6.204980, 106.826525],
          [-6.204846, 106.825605],
        ]
      },
    ]);

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/pages/monit/station');

        console.log("Response", response.data)
        setData(response.data.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    // Auto-refresh every 60 seconds
    // const interval = setInterval(fetchData, 60000);
    // return () => clearInterval(interval);
  }, []);

  const handleOpenDetail = async (item: any) => {
    setLoading(true)
    setIsOpen(true)
    console.log("Handle", item)

    try {
      const response = await axios.post('/api/v1/output/detail-device', {
        c_device: item.c_device,
        c_project: item.c_project
      });


      // console.log("Response", response.data)
      setSelectedItem(response.data.data);
      setLoading(false)
    } catch (err) {
      console.error("Error fetching:", err);
      setSelectedItem({ error: "Failed to load device data" });
    }
  }

  const handleSearchResult = (result: any) => {
    console.log("Data Lokasi:", result.location);

    // result.location.x = lng
    // result.location.y = lat
    // result.location.label = Alamat
  };

  // State untuk menyimpan Array Koordinat hasil ukur
  const [, setMeasuredPath] = useState<{ lat: number; lng: number }[]>([]);

  // Callback saat user membuat garis ukur
  const handleMeasureUpdate = (coords: { lat: number; lng: number }[]) => {
    setMeasuredPath(coords);
  };


  const [dataFilter, setDataFilter] = useState<coordinate[]>([]);

  const handleBoundsChange = (newBounds: L.LatLngBounds) => {
    const filtered = data.filter((item) => {
      const point = L.latLng(Number(item.n_lat), Number(item.n_lng));

      return newBounds.contains(point);
    });

    setDataFilter(filtered);
  };

  const [dataAlat, setdataAlat] = useState<DeviceDetail[]>([]);

  console.log(dataAlat);


  useEffect(() => {
    if (MIN_ZOOM_TO_SHOW <= currentZoom) {
      const fetchData = async () => {
        try {
          const response = await axios.post('http://localhost:3000/api/pages/monit/alat', {
            c_station: dataFilter.find((item) => item.c_station)?.c_station
          });

          console.log("Response", response.data)

          if (response.data.code) {
            throw new Error("Error Data")
          }

          setdataAlat(response.data.data)
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };

      fetchData();
    }

  }, [dataFilter, currentZoom])

  return (
    <div className="w-full h-full min-h-[400px] relative z-0">
      <MapContainer
        center={[-6.2088, 106.8456]}
        style={{ height: "100%", width: "100%" }}
        zoom={10}
        className="map-container"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {data?.map((item, index) => (
          <MarkerComponent key={index} item={item}
            onClick={() => { setSelectedItem(item), handleOpenDetail(item) }}
          />
        ))}

        {
          dataJalur.map((item, index) => (
            <LineComponent key={index} item={item}
            />
          ))
        }


        {/* FULL SCREEN MODAL */}
        <FullscreenModal
          item={selectedItem}
          open={isOpen}
          loading={loading}
          onClose={() => setIsOpen(false)}
        />

        <ZoomHandler onZoomChange={(zoom) => setCurrentZoom(zoom)} />
        {currentZoom >= MIN_ZOOM_TO_SHOW && (
          <MarkerClusterGroup chunkedLoading>
            {dataAlat.map((m, idx) => (
              <Marker key={idx} position={[Number(m.n_lat || 0), Number(m.n_lng || 0)]}>
                <Popup>{m.n_device_name}</Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}
        <BoundsHandler onBoundsChange={handleBoundsChange} />
        <SearchControl onResult={handleSearchResult} />
        <MapWithPlane />
        <MeasureControl onPathChange={handleMeasureUpdate} />
      </MapContainer>
    </div>
  );

};

export default MapComponent;
