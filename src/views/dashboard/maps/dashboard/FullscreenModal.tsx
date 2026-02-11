'use client'

import React from "react";

// --- TYPES & INTERFACES ---

// Tipe untuk data sensor/metrics (voltage, temp, dll)
interface SensorData {
  [key: string]: string | number | undefined; // Index signature agar bisa diakses dynamic string
}

// Tipe untuk object Item utama
export interface DeviceItem {
  n_project_desc?: string;
  n_device_name?: string;
  c_device?: string;
  c_station?: string;
  data?: SensorData; // Object 'data' di dalam item
}

interface FullscreenModalProps {
  item: DeviceItem | null; // Item bisa null jika belum dipilih
  open: boolean;
  loading: boolean;
  onClose: () => void;
}

// Struktur konfigurasi mapping label ke key
interface DataMapping {
  [label: string]: string;
}

const FullscreenModal: React.FC<FullscreenModalProps> = ({
  item,
  open,
  loading,
  onClose
}) => {

  if (!open) return null;

  // Konfigurasi grouping data
  const listShowDetailData: DataMapping[] = [
    {
      "Voltage AC": "voltageac",
      "Temperature": "temperature",
      "Humidity": "humidity",
      "Status": "status"
    },
    {
      "voltage 1 Channel 1": "voltage10",
      "voltage 2 Channel 1": "voltage11",
      "voltage 3 Channel 1": "voltage12",
      "current 1 Channel 1": "current10",
      "current 2 Channel 1": "current11",
      "current 3 Channel 1": "current12",
    },
    {
      "voltage 1 Channel 2": "voltage20",
      "voltage 2 Channel 2": "voltage21",
      "voltage 3 Channel 2": "voltage22",
      "current 1 Channel 2": "current20",
      "current 2 Channel 2": "current21",
      "current 3 Channel 2": "current22",
    }
  ];

  return (
    <div className="fixed inset-0  bg-opacity-20 flex justify-center items-center z-9999">
      <div className="bg-white text-black w-11/12 md:w-1/2 h-fit max-h-[90vh] rounded-xl p-5 overflow-auto relative shadow-2xl">

        {/* Tombol Close */}
        <button
          className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors"
          onClick={onClose}
        >
          Close
        </button>

        <h2 className="text-2xl font-bold mb-4">Detail Device</h2>

        {/* Header Info - Menggunakan Optional Chaining (?.) agar tidak crash jika item null */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex flex-col">
            <div className="text-sm md:text-xl font-bold text-gray-600">PROJECT</div>
            <div className="text-lg md:text-2xl">{item?.n_project_desc || "-"}</div>
          </div>
          <div className="flex flex-col">
            <div className="text-sm md:text-xl font-bold text-gray-600">DEVICE NAME</div>
            <div className="text-lg md:text-2xl">{item?.n_device_name || "-"}</div>
          </div>
          <div className="flex flex-col">
            <div className="text-sm md:text-xl font-bold text-gray-600">DEVICE CODE</div>
            <div className="text-lg md:text-2xl">{item?.c_device || "-"}</div>
          </div>
          <div className="flex flex-col">
            <div className="text-sm md:text-xl font-bold text-gray-600">STATION CODE</div>
            <div className="text-lg md:text-2xl">{item?.c_station || "-"}</div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-40">
            <div className="text-lg font-semibold animate-pulse">Loading data...</div>
          </div>
        )}

        {/* Content State */}
        {!loading && item?.data && (
          <div>
            {listShowDetailData.map((group, i) => (
              <div key={i} className="flex flex-col justify-center items-center mb-6">

                {/* Garis Separator per Group */}
                {i > 0 && <div className="w-[80%] border-b border-gray-300 my-4" />}

                <div className="flex flex-wrap justify-center gap-4">
                  {Object.entries(group).map(([label, dataKey]) => (
                    <div
                      key={label}
                      className="border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow h-fit w-fit bg-gray-50 min-w-40"
                    >
                      <h2 className="text-sm md:text-lg font-semibold mb-2 text-gray-700">
                        {label}
                      </h2>

                      <div className="w-full border-b border-gray-200 mb-3" />

                      {/* Value Access */}
                      <div className="text-xl md:text-2xl font-mono text-blue-600">
                        {/* Mengakses data secara aman */}
                        {item.data && item.data[dataKey] !== undefined
                          ? item.data[dataKey]
                          : "N/A"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State jika tidak loading tapi data kosong */}
        {!loading && item && !item.data && (
          <div className="text-center py-10 text-gray-500">No sensor data available.</div>
        )}

      </div>
    </div>
  );
};

export default FullscreenModal;
