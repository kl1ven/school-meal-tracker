import React, { useState } from 'react';
import { api } from '../services/api';
import { formatNeryungriDate } from '../utils/dateHelpers';
import './NotificationModal.css';

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

interface NotificationModalProps {
  notification: INotification;
  onClose: () => void;
  onMarkRead?: (id: number) => void;
  userName?: string;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ notification, onClose, onMarkRead, userName }) => {
  const [isMarking, setIsMarking] = useState(false);
  const [error, setError] = useState('');

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

  const handleMarkRead = async () => {
    try {
      setIsMarking(true);
      setError('');
      await api.markNotificationRead(notification.id);
      if (onMarkRead) {
        onMarkRead(notification.id);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Ошибка при пометке');
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div className="modal-backdrop-notification" onClick={onClose}>
      <div className="modal-card-notification" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-notification">
          <h2>{notification.title}</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body-notification">
          <div className="notification-detail">
            <label className="detail-label">Тип:</label>
            <span className="type-badge" style={{ backgroundColor: getTypeColor(notification.type) }}>
              {getTypeLabel(notification.type)}
            </span>
          </div>

          <div className="notification-detail">
            <label className="detail-label">Дата и время:</label>
            <span>{formatNeryungriDate(notification.createdAt)}</span>
          </div>

          {userName && (
            <div className="notification-detail">
              <label className="detail-label">Получатель:</label>
              <span>{userName}</span>
            </div>
          )}

          <div className="notification-detail">
            <label className="detail-label">Статус:</label>
            <span className={`status-badge ${notification.isRead ? 'read' : 'unread'}`}>
              {notification.isRead ? 'Прочитано' : 'Не прочитано'}
            </span>
          </div>

          <div className="notification-detail-full">
            <label className="detail-label">Сообщение:</label>
            <div className="message-box">
              {notification.message}
            </div>
          </div>

          {error && (
            <div className="notification-error">{error}</div>
          )}
        </div>

        <div className="modal-footer-notification">
          {!notification.isRead && (
            <button
              className="btn-mark-read"
              onClick={handleMarkRead}
              disabled={isMarking}
            >
              {isMarking ? 'Пометка...' : 'Отметить прочитанным'}
            </button>
          )}
          <button className="btn-close-modal" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
