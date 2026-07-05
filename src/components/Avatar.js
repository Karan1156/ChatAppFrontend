import React from 'react';
import { Image } from 'react-bootstrap';

const Avatar = ({ 
  user, 
  size = 40, 
  className = '', 
  style = {},
  onClick = null 
}) => {
  const getRandomColor = (username) => {
    if (!username) return '#6c757d';
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85929E', '#73C6B6'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const renderStickFigure = () => {
    return (
      <svg
        viewBox="0 0 100 100"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: getRandomColor(user?.username),
          borderRadius: '50%',
        }}
      >
        {/* Head */}
        <circle cx="50" cy="30" r="20" fill="white" stroke="#333" strokeWidth="2" />
        {/* Body */}
        <line x1="50" y1="50" x2="50" y2="75" stroke="#333" strokeWidth="3" />
        {/* Left Arm */}
        <line x1="50" y1="55" x2="25" y2="70" stroke="#333" strokeWidth="3" />
        {/* Right Arm */}
        <line x1="50" y1="55" x2="75" y2="70" stroke="#333" strokeWidth="3" />
        {/* Left Leg */}
        <line x1="50" y1="75" x2="30" y2="95" stroke="#333" strokeWidth="3" />
        {/* Right Leg */}
        <line x1="50" y1="75" x2="70" y2="95" stroke="#333" strokeWidth="3" />
        {/* Eyes */}
        <circle cx="42" cy="25" r="3" fill="#333" />
        <circle cx="58" cy="25" r="3" fill="#333" />
        {/* Smile */}
        <path d="M 40 35 Q 50 42 60 35" stroke="#333" strokeWidth="2" fill="none" />
      </svg>
    );
  };

  // If user has profile picture, show it
  if (user?.profile_picture_url) {
    return (
      <Image
        src={user.profile_picture_url}
        alt={user?.username || 'User'}
        roundedCircle
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          ...style
        }}
        onClick={onClick}
      />
    );
  }

  // If no profile picture, show initials or stick figure
  return (
    <div
      className={`d-flex align-items-center justify-content-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: getRandomColor(user?.username),
        color: 'white',
        fontWeight: 'bold',
        fontSize: size * 0.4,
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onClick={onClick}
    >
      {renderStickFigure()}
    </div>
  );
};

export default Avatar;