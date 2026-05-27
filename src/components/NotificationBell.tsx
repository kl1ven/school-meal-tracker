import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import NotificationModal from './NotificationModal';
import './NotificationBell.css';

// Type definition for Notification
interface INotification {
  id: number;
  userId: number;
  type: 'reminder' | 'discrepancy' | 'confirmation' | 'new_request' | 'manager_edit' | 'actual_changed' | 'canteen_update' | 'test';
  title: string;
  message: string;
  isRead: number;
  link: string | null;
  createdAt: string;
}

interface NotificationBellProps {
  onViewAll?: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onViewAll }) => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<'granted' | 'denied' | 'default'>('default');
  const [selectedNotification, setSelectedNotification] = useState<INotification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const previousNotifications = useRef<INotification[]>([]);

  // Request browser notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission as 'granted' | 'denied' | 'default');
        });
      } else {
        setNotificationPermission(Notification.permission as 'granted' | 'denied' | 'default');
      }
    } else if ('Notification' in window) {
      setNotificationPermission(Notification.permission as 'granted' | 'denied' | 'default');
    }
  }, []);

  // Show browser notification for new unread notifications
  const showBrowserNotification = (notif: INotification) => {
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          const notification = new Notification(`📬 ${notif.title}`, {
            body: notif.message,
            icon: '/school.png',
            tag: `notification-${notif.id}`,
            badge: '/school.png',
          });
          console.log(`✅ Уведомление показано: ${notif.title}`, notif);
          
          // Auto-close notification after 5 seconds
          setTimeout(() => notification.close(), 5000);
        } else if (Notification.permission === 'default') {
          console.warn('Разрешение на уведомления не дано. Пожалуйста, разрешите уведомления в настройках браузера.');
        }
      } else {
        console.warn('Браузер не поддерживает уведомления');
      }
    } catch (error) {
      console.error('Ошибка при показе уведомления:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await api.fetchNotifications({ limit: 10, unreadOnly: false });
      const newNotifications = data.notifications as INotification[];
      
      console.log('📋 Уведомления загружены:', newNotifications.length, 'шт.');
      
      // Check for new unread notifications
      if (previousNotifications.current.length > 0) {
        const previousIds = new Set(previousNotifications.current.map(n => n.id));
        const newUnreadNotifs = newNotifications.filter(
          (n: INotification) => !n.isRead && !previousIds.has(n.id)
        );
        
        console.log('🆕 Новых непрочитанных уведомлений:', newUnreadNotifs.length, 'шт.');
        
        // Show browser notifications for new unread items
        newUnreadNotifs.forEach((notif: INotification) => {
          console.log(`📬 Отправка браузерного уведомления: "${notif.title}"`);
          showBrowserNotification(notif);
        });
      } else {
        console.log('📍 Первая загрузка уведомлений');
      }
      
      setNotifications(newNotifications);
      previousNotifications.current = newNotifications;
      const unread = newNotifications.filter((n: INotification) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('❌ Ошибка при загрузке уведомлений:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and set up polling interval (every 30 seconds)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    console.log('🔔 NotificationBell смонтирован. Разрешение на уведомления:', Notification.permission);
    
    // Initial fetch
    fetchNotifications();
    
    // Set up polling interval (every 30 seconds)
    const interval = setInterval(() => {
      console.log('⏰ Проверка уведомлений (автопрос)...');
      fetchNotifications();
    }, 30000);
    
    return () => {
      console.log('🔔 NotificationBell демонтирован');
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: INotification) => {
    setSelectedNotification(notification);
  };

  const handleMarkReadFromModal = (id: number) => {
    // Update the notification in the list
    setNotifications(
      notifications.map((n) =>
        n.id === id ? { ...n, isRead: 1 } : n
      )
    );
    setUnreadCount(Math.max(0, unreadCount - 1));
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(
        notifications.map((n) => ({ ...n, isRead: 1 }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getTypeLabel = (type: string): string => {
    const key = type.toLowerCase();
    const labels: Record<string, string> = {
      reminder: 'Напоминание',
      discrepancy: 'Расхождение',
      confirmation: 'Подтверждение',
      new_request: 'Новая заявка',
      manager_edit: 'Изменение менеджером',
      actual_changed: 'Изменение фактических',
      canteen_update: 'Обновление данных',
      test: 'Тест',
    };
    return labels[key] || type;
  };

  const handleBellClick = () => {
    console.log('🔔 Клик на колокольчик. Загрузка свежих уведомлений...');
    setIsOpen(!isOpen);
    // Immediately fetch fresh notifications when bell is clicked
    if (!isOpen) {
      fetchNotifications();
    }
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="bell-button"
        onClick={handleBellClick}
        title={notificationPermission === 'granted' ? 'Уведомления (браузерные уведомления включены)' : 'Уведомления'}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Уведомления</h3>
            {unreadCount > 0 && (
              <button
                className="mark-all-btn"
                onClick={handleMarkAllAsRead}
              >
                Прочитать все
              </button>
            )}
          </div>

          {notificationPermission !== 'granted' && (
            <div className="notification-permission-notice">
              💡 Браузерные уведомления отключены. Нажмите значок замка в адресной строке для активации.
            </div>
          )}

          <div className="notification-list">
            {isLoading ? (
              <div className="notification-loading">Загрузка...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">Нет уведомлений</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <div className={`notification-type ${notification.type.toLowerCase()}`}>
                      {getTypeLabel(notification.type)}
                    </div>
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    <div className="notification-date">
                      {new Date(notification.createdAt).toLocaleString('ru-RU', { timeZone: 'Asia/Yakutsk' })}
                    </div>
                  </div>
                  {!notification.isRead && (
                    <div className="notification-unread-dot"></div>
                  )}
                </div>
              ))
            )}
          </div>

          {onViewAll && (
            <div className="notification-footer">
              <button
                className="view-all-link"
                onClick={() => {
                  onViewAll();
                  setIsOpen(false);
                }}
                type="button"
              >
                Все уведомления →
              </button>
            </div>
          )}
        </div>
      )}

      {selectedNotification && (
        <NotificationModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onMarkRead={handleMarkReadFromModal}
        />
      )}
    </div>
  );
};

export default NotificationBell;
