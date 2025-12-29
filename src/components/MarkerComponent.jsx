import React from 'react';
import { Marker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';

const MarkerComponent = ({ item, onClick  }) => {
    // console.log("Item", item)
    const getColor = (status) => {
        switch (status) {
            case 'OK': return 'green';
            case 'Warning': return 'yellow';
            case 'NOT OK': return 'red';
            case 'No Data': return 'grey';
            default: return 'blue';
        }
    };

    const icon = new L.Icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(`
            <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 10.9 12.5 28.5 12.5 28.5S25 23.4 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${getColor(item.status)}"/>
                <circle cx="12.5" cy="12.5" r="5" fill="white"/>
            </svg>
        `)}`,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    });

    return (
        <Marker position={[item.n_lat, item.n_lng]} icon={icon} eventHandlers={{
                click: () => onClick(item),
            }}>

            {/* 🟢 Tooltip muncul saat hover */}
            <Tooltip direction="top" offset={[0, -30]}>
                <b>Nama:</b> {item.n_station}<br />
                <b>Project:</b> {item.n_project_name}<br />
                <b>Status:</b> {item.status}
            </Tooltip>

            {/* 🟡 Popup saat di klik (jika masih ingin menampilkan) */}
            {/* <Popup>
                <b>Nama:</b> {item.n_device_name}<br />
                <b>Status:</b> {item.status}<br />
                <b>Device Type:</b> {item.n_device_type_name}<br />
                <b>Project:</b> {item.n_project_name}
            </Popup> */}

        </Marker>
    );
};

export default MarkerComponent;
