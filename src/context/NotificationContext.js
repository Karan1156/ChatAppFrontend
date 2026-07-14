import React, { createContext, useState, useContext, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dndMode, setDndMode] = useState(false);
  const [dndSchedule, setDndSchedule] = useState({ start: '22:00', end: '08:00' });
  const [mutedChats, setMutedChats] = useState([]);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setSoundEnabled(settings.soundEnabled ?? true);
      setDndMode(settings.dndMode ?? false);
      setDndSchedule(settings.dndSchedule ?? { start: '22:00', end: '08:00' });
      setMutedChats(settings.mutedChats ?? []);
    }
  }, []);

  const addNotification = (notification) => {
    // Check if chat is muted
    if (mutedChats.includes(notification.chat_id)) return;
    
    // Check DND mode
    if (dndMode && isInDndTime()) return;

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Play sound if enabled
    if (soundEnabled) {
      playNotificationSound();
    }

    // Show browser notification
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon
      });
    }
  };

  const isInDndTime = () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return currentTime >= dndSchedule.start && currentTime < dndSchedule.end;
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    } catch (e) {
      // Silently fail if audio can't play
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const toggleMuteChat = (chatId) => {
    setMutedChats(prev => {
      const newMuted = prev.includes(chatId) 
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId];
      
      // Save to localStorage
      const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
      settings.mutedChats = newMuted;
      localStorage.setItem('notificationSettings', JSON.stringify(settings));
      
      return newMuted;
    });
  };

  const updateSettings = (settings) => {
    if (settings.soundEnabled !== undefined) setSoundEnabled(settings.soundEnabled);
    if (settings.dndMode !== undefined) setDndMode(settings.dndMode);
    if (settings.dndSchedule) setDndSchedule(settings.dndSchedule);
    
    const currentSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
    const newSettings = { ...currentSettings, ...settings };
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  const value = {
    notifications,
    unreadCount,
    isPanelOpen,
    setIsPanelOpen,
    soundEnabled,
    dndMode,
    dndSchedule,
    mutedChats,
    addNotification,
    markAllAsRead,
    markAsRead,
    clearNotifications,
    toggleMuteChat,
    updateSettings,
    requestNotificationPermission
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};