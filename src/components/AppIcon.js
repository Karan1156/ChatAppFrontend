import React from 'react';

const AppIcon = ({ size = 192, color = '#3178F6' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      <rect width="192" height="192" rx="32" fill={color} />
      <path
        d="M96 40C64.8 40 40 60.8 40 86c0 14.4 7.2 27.2 18.4 35.2L52 148l25.6-12.8c5.6 1.6 11.2 2.4 17.6 2.4 1.6 0 3.2 0 4.8-.8C108.8 152 132 152 152 142.4 158.4 136 162.4 127.2 162.4 118.4 163.2 92.8 143.2 68 112 64 106.4 62.4 100 61.6 94.4 61.6 93.6 50.4 85.6 40 76.8 40z"
        fill="white"
        opacity="0.9"
      />
      <circle cx="76" cy="86" r="8" fill={color} />
      <circle cx="108" cy="86" r="8" fill={color} />
      <circle cx="140" cy="86" r="8" fill={color} />
    </svg>
  );
};

export default AppIcon;