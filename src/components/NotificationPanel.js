import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import {
  FaBell,
  FaCheckDouble,
  FaTimes,
  FaVolumeUp,
  FaMoon,
  FaSun,
  FaClock,
  FaSlidersH,
  FaUser,
  FaComment
} from 'react-icons/fa';
import './NotificationPanel.css';

const NotificationPanel = () => {
  const {
    notifications,
    unreadCount,
    isPanelOpen,
    setIsPanelOpen,
    soundEnabled,
    dndMode,
    dndSchedule,
    mutedChats,
    markAllAsRead,
    clearNotifications,
    toggleMuteChat,
    updateSettings,
    requestNotificationPermission
  } = useNotification();

  const [showSettings, setShowSettings] = useState(false);
  const [tempDndSchedule, setTempDndSchedule] = useState(dndSchedule);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <FaComment className="notification-icon message" />;
      case 'mention':
        return <FaUser className="notification-icon mention" />;
      default:
        return <FaBell className="notification-icon default" />;
    }
  };

  const handleDndSave = () => {
    updateSettings({ 
      dndSchedule: tempDndSchedule,
      dndMode: dndMode 
    });
    setShowSettings(false);
  };

  if (!isPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="notification-backdrop" onClick={() => setIsPanelOpen(false)} />
      
      {/* Panel */}
      <div className="notification-panel">
        <div className="notification-header">
          <div className="d-flex align-items-center gap-2">
            <FaBell className="text-primary" />
            <h5 className="mb-0">Notifications</h5>
            {unreadCount > 0 && (
              <span className="badge bg-primary rounded-pill">{unreadCount}</span>
            )}
          </div>
          <div className="d-flex gap-2">
            {notifications.length > 0 && (
              <>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                >
                  <FaCheckDouble />
                </button>
                <button 
                  className="btn btn-sm btn-outline-danger"
                  onClick={clearNotifications}
                  title="Clear all"
                >
                  <FaTimes />
                </button>
              </>
            )}
            <button 
              className={`btn btn-sm ${showSettings ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <FaSlidersH />
            </button>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setIsPanelOpen(false)}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="notification-settings">
            <div className="settings-item">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <FaVolumeUp className="me-2" />
                  <span>Sound</span>
                </div>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                  />
                </div>
              </div>
            </div>

            <div className="settings-item">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  {dndMode ? <FaMoon className="me-2" /> : <FaSun className="me-2" />}
                  <span>Do Not Disturb</span>
                </div>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={dndMode}
                    onChange={(e) => updateSettings({ dndMode: e.target.checked })}
                  />
                </div>
              </div>
            </div>

            {dndMode && (
              <div className="settings-item">
                <div className="d-flex align-items-center gap-3">
                  <FaClock className="me-2" />
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="time"
                      className="form-control form-control-sm"
                      value={tempDndSchedule.start}
                      onChange={(e) => setTempDndSchedule({
                        ...tempDndSchedule,
                        start: e.target.value
                      })}
                    />
                    <span>to</span>
                    <input
                      type="time"
                      className="form-control form-control-sm"
                      value={tempDndSchedule.end}
                      onChange={(e) => setTempDndSchedule({
                        ...tempDndSchedule,
                        end: e.target.value
                      })}
                    />
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={handleDndSave}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="settings-item">
              <button
                className="btn btn-sm btn-outline-primary w-100"
                onClick={requestNotificationPermission}
              >
                Enable Browser Notifications
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="notification-list">
          {notifications.length === 0 ? (
            <div className="text-center text-muted py-5">
              <FaBell size={48} className="mb-3 opacity-25" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => notification.onClick?.()}
              >
                <div className="notification-icon-wrapper">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <div className="d-flex justify-content-between align-items-start">
                    <strong className="notification-title">{notification.title}</strong>
                    <small className="text-muted">{formatTime(notification.timestamp)}</small>
                  </div>
                  <p className="notification-body">{notification.body}</p>
                  {notification.chat_id && (
                    <button
                      className="btn btn-sm btn-outline-secondary mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMuteChat(notification.chat_id);
                      }}
                    >
                      {mutedChats.includes(notification.chat_id) ? 'Unmute' : 'Mute'} Chat
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;