'use client'

import React from 'react';

import { Polyline, Tooltip } from "react-leaflet";

import type { LatLngExpression } from 'leaflet';

import type { jalur } from './MapComponent';


interface LineComponentProps {
  item: jalur;
}

const LineComponent: React.FC<LineComponentProps> = ({ item }) => {
  return (
    <Polyline
      pathOptions={{ color: item.color }}
      positions={item.lines as LatLngExpression[]}
    >
      {/* sticky: Tooltip mengikuti mouse saat hover di garis
        permanent: false (default), hanya muncul saat hover
      */}
      <Tooltip sticky direction="top" offset={[0, -10]}>
        <span className="font-semibold text-sm">
          {item.desc}
        </span>
      </Tooltip>
    </Polyline>
  );
};

export default LineComponent;
