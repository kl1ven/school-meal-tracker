import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatNeryungriDate } from '../utils/dateHelpers';
import NotificationModal from './NotificationModal';
import './NotificationList.css';

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

const NotificationList: React.FC = () => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'reminder' | 'discrepancy' | 'confirmation' | 'new_request' | 'canteen_update' | 'test'>('all');
  const [filterUnread, setFilterUnread] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<INotification | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const pageSize = 20;

  const fetchNotifications = React.useCallback(async (page: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.fetchNotifications({
        limit: pageSize,
        offset: page * pageSize,
        unreadOnly: filterUnread,
      });
      setNotifications(data.notifications as INotification[]);
      setTotalCount(data.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ошибка при загрузке уведомлений'
      );
    } finally {
      setIsLoading(false);
    }
  }, [filterUnread]);

  useEffect(() => {
    setCurrentPage(0);
  }, [filterType, filterUnread]);

  useEffect(() => {
    fetchNotifications(currentPage);
  }, [currentPage, filterUnread, fetchNotifications]);

  const handleMarkReadFromModal = (id: number) => {
    // Update the notification in the list
    setNotifications(
      notifications.map((n) =>
        n.id === id ? { ...n, isRead: 1 } : n
      )
    );
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(
        notifications.map((n) => ({ ...n, isRead: 1 }))
      );
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering row click

    const confirmed = window.confirm('Вы уверены, что хотите удалить это уведомление?');
    if (!confirmed) return;

    try {
      setIsDeleting(id);
      await api.deleteNotification(id);
      
      // Remove notification from list
      setNotifications(notifications.filter((n) => n.id !== id));
      setTotalCount(Math.max(0, totalCount - 1));
      
      // Show success message
      setSuccessMessage('Уведомление удалено');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      console.log(`✅ Уведомление ${id} удалено`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Не удалось удалить уведомление';
      setError(errorMsg);
      console.error('Error deleting notification:', err);
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

  const getTypeColor = (type: string): string => {
    const key = type.toLowerCase();
    const colors: Record<string, string> = {
      reminder: '#FFC107',
      discrepancy: '#F44336',
      confirmation: '#4CAF50',
      new_request: '#2196F3',
      manager_edit: '#7B1FA2',
      actual_changed: '#9C27B0',
      canteen_update: '#4CAF50',
      test: '#9C27B0',
    };
    return colors[key] || '#757575';
  };

  const filteredNotifications = filterType === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filterType);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="notification-list-container">
      <h1>Уведомления</h1>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="notification-controls">
        <div className="filters">
          <label>
            Тип:
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as typeof filterType)
              }
            >
              <option value="all">Все</option>
              <option value="reminder">Напоминание</option>
              <option value="discrepancy">Расхождение</option>
              <option value="confirmation">Подтверждение</option>
              <option value="new_request">Новая заявка</option>
              <option value="canteen_update">Обновление данных</option>
              <option value="test">Тест</option>
            </select>
          </label>

          <label>
            <input
              type="checkbox"
              checked={filterUnread}
              onChange={(e) => setFilterUnread(e.target.checked)}
            />
            Только непрочитанные
          </label>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
            Пометить всё как прочитанное
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="loading">Загрузка уведомлений...</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="empty-message">Нет уведомлений</div>
      ) : (
        <>
          <table className="notification-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Заголовок</th>
                <th>Сообщение</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotifications.map((notif) => (
                <tr
                  key={notif.id}
                  className={`notification-row ${!notif.isRead ? 'unread-row' : ''}`}
                  onClick={() => setSelectedNotification(notif)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="date-cell">
                    {formatNeryungriDate(notif.createdAt)}
                  </td>
                  <td className="type-cell">
                    <span
                      className="type-badge"
                      style={{ backgroundColor: getTypeColor(notif.type) }}
                    >
                      {getTypeLabel(notif.type)}
                    </span>
                  </td>
                  <td className="title-cell">{notif.title}</td>
                  <td className="message-cell">{notif.message}</td>
                  <td className="status-cell">
                    {notif.isRead ? (
                      <span className="status-badge read">Прочитано</span>
                    ) : (
                      <span className="status-badge unread">Новое</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDelete(notif.id, e)}
                      disabled={isDeleting === notif.id}
                      title="Удалить уведомление"
                    >
                      {isDeleting === notif.id ? '⏳' : '🗑️'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              ← Предыдущая
            </button>
            <span className="page-info">
              Страница {currentPage + 1} из {totalPages} (всего: {totalCount})
            </span>
            <button
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Следующая →
            </button>
          </div>
        </>
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

export default NotificationList;


