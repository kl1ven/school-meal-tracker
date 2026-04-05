import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import './UserManager.css';

interface UserManagerProps {
  classes: { id: string; name: string }[];
  onUsersChanged?: () => void | Promise<void>;
}

const UserManager: React.FC<UserManagerProps> = ({ classes, onUsersChanged }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'teacher' as 'teacher' | 'manager' | 'canteen',
    classId: '',
  });
  const [message, setMessage] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.fetchUsers();
      setUsers(data);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      role: 'teacher',
      classId: '',
    });
    setMessage('');
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      classId: user.classId || '',
    });
    setMessage('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.fullName.trim() || !formData.email.trim()) {
      setMessage('Заполните ФИО и email');
      return;
    }

    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      setMessage('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (formData.role === 'teacher' && !formData.classId) {
      setMessage('Выберите класс для классного руководителя');
      return;
    }

    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, formData);
      } else {
        await api.createUser(formData);
      }

      await loadUsers();
      await onUsersChanged?.();
      setShowModal(false);
      setMessage(editingUser ? 'Пользователь обновлён' : 'Пользователь добавлен');
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Удалить пользователя?')) return;

    try {
      await api.deleteUser(userId);
      await loadUsers();
      await onUsersChanged?.();
      setMessage('Пользователь удалён');
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const getClassName = (user: User) => {
    if (user.className) return user.className;
    if (!user.classId) return '-';
    const classItem = classes.find((c) => c.id === user.classId);
    return classItem ? classItem.name : 'Не назначен';
  };

  return (
    <div className="user-manager">
      <div className="user-manager-header">
        <h2>Управление пользователями</h2>
        <button className="add-user-button" onClick={handleAdd}>
          Добавить пользователя
        </button>
      </div>

      {message && <div className="message">{message}</div>}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Email</th>
              <th>Класс</th>
              <th>Роль</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? users.map((user) => (
              <tr key={user.id}>
                <td data-label="ФИО">{user.fullName}</td>
                <td data-label="Email">{user.email}</td>
                <td data-label="Класс">{getClassName(user)}</td>
                <td data-label="Роль">
                  {user.role === 'teacher'
                    ? 'Классный руководитель'
                    : user.role === 'canteen'
                      ? 'Столовая'
                      : 'Менеджер питания'}
                </td>
                <td data-label="Действия">
                  <div className="table-actions">
                    <button onClick={() => handleEdit(user)}>Редактировать</button>
                    <button onClick={() => handleDelete(user.id)} className="delete-button">
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5}>Пользователи не найдены.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'}</h3>

            <div className="form-group">
              <label>ФИО</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Иванов Иван Иванович"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="teacher@example.com"
                disabled={!!editingUser}
              />
            </div>

            <div className="form-group">
              <label>{editingUser ? 'Новый пароль (необязательно)' : 'Пароль'}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? 'Оставьте пустым, чтобы не менять' : 'Минимум 6 символов'}
              />
            </div>

            <div className="form-group">
              <label>Роль</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({
                  ...formData,
                  role: e.target.value as 'teacher' | 'manager' | 'canteen',
                  classId: e.target.value === 'teacher' ? formData.classId : '',
                })}
              >
                <option value="teacher">Классный руководитель</option>
                <option value="manager">Менеджер питания</option>
                <option value="canteen">Столовая</option>
              </select>
            </div>

            {formData.role === 'teacher' && (
              <div className="form-group">
                <label>Класс</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                >
                  <option value="">Выберите класс</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={handleSave}>Сохранить</button>
              <button onClick={() => setShowModal(false)} className="cancel-button">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;