import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { formatNeryungriDate } from '../utils/dateHelpers';
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
  const [selectedNotification, setSelectedNotification] = useState<INotification | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await api.fetchNotifications({ limit: 10, unreadOnly: false });
      const newNotifications = data.notifications as INotification[];
      
      console.log(`📋 Автообновление: загружено ${newNotifications.length} уведомлений`);
      
      setNotifications(newNotifications);
      const unread = newNotifications.filter((n: INotification) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('❌ Ошибка при загрузке уведомлений:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up auto-update polling (every 30 seconds)
  useEffect(() => {
    console.log('🔔 NotificationBell смонтирован. Запуск полинга уведомлений...');
    
    // Initial fetch
    fetchNotifications();
    
    // Set up polling interval (every 30 seconds)
    intervalRef.current = setInterval(() => {
      console.log('⏰ Проверка уведомлений (автопрос каждые 30 сек)...');
      fetchNotifications();
    }, 30000);
    
    return () => {
      console.log('🔔 NotificationBell демонтирован. Остановка полинга.');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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

  const handleDeleteFromBell = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering notification click

    try {
      setIsDeleting(id);
      await api.deleteNotification(id);

      // Remove notification from list
      setNotifications(notifications.filter((n) => n.id !== id));

      // Update unread count if deleted notification was unread
      const deletedNotif = notifications.find((n) => n.id === id);
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }

      console.log(`✅ Уведомление ${id} удалено из колокольчика`);
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setIsDeleting(null);
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
        title="Уведомления"
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
                      {formatNeryungriDate(notification.createdAt)}
                    </div>
                  </div>
                  <div className="notification-actions">
                    <button
                      className="notification-delete-btn"
                      onClick={(e) => handleDeleteFromBell(notification.id, e)}
                      disabled={isDeleting === notification.id}
                      title="Удалить уведомление"
                    >
                      {isDeleting === notification.id ? '⏳' : '🗑️'}
                    </button>
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
