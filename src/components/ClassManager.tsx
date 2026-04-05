import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Class, User } from '../types';
import './ClassManager.css';

const ClassManager: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [newClass, setNewClass] = useState({ name: '', parallel: 1, teacher_id: null as number | null });
  const [message, setMessage] = useState('');

  const loadClasses = async () => {
    try {
      const data = await api.fetchClasses();
      setClasses(data.sort((a, b) => {
        const gradeA = parseInt(a.name) || 0;
        const gradeB = parseInt(b.name) || 0;
        if (gradeA !== gradeB) return gradeA - gradeB;
        return a.name.localeCompare(b.name);
      }));
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const loadTeachers = async () => {
    try {
      const data = await api.fetchTeachers();
      setTeachers(data);
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  useEffect(() => {
    loadClasses();
    loadTeachers();
  }, []);

  const handleAdd = async () => {
    if (!newClass.name.trim()) {
      setMessage('Введите название класса');
      return;
    }
    try {
      await api.createClass(newClass.name, newClass.parallel, newClass.teacher_id);
      setNewClass({ name: '', parallel: 1, teacher_id: null });
      setMessage('Класс добавлен');
      loadClasses();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const handleEdit = (classItem: Class) => {
    setEditingClass(classItem);
  };

  const handleSaveEdit = async () => {
    if (!editingClass) return;
    try {
      await api.updateClass(editingClass.id, editingClass.name, editingClass.parallel, editingClass.teacher_id);
      setEditingClass(null);
      setMessage('Класс обновлен');
      loadClasses();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const handleDelete = async (classId: number) => {
    if (!window.confirm('Удалить класс и все связанные записи?')) return;
    try {
      await api.deleteClass(classId);
      setMessage('Класс удален');
      loadClasses();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  return (
    <div className="class-manager">
      <h2>Управление классами</h2>
      {message && <div className="message">{message}</div>}

      <div className="add-class-form">
        <h3>Добавить класс</h3>
        <input
          type="text"
          placeholder="Название класса"
          value={newClass.name}
          onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
        />
        <input
          type="number"
          placeholder="Параллель"
          value={newClass.parallel}
          onChange={(e) => setNewClass({ ...newClass, parallel: parseInt(e.target.value) || 1 })}
        />
        <select
          value={newClass.teacher_id ?? ''}
          onChange={(e) => setNewClass({ ...newClass, teacher_id: e.target.value ? parseInt(e.target.value) : null })}
        >
          <option value="">Выберите классного руководителя</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.fullName}
            </option>
          ))}
        </select>
        <button onClick={handleAdd}>Добавить</button>
      </div>

      <table className="classes-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Параллель</th>
            <th>Классный руководитель</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((classItem) => (
            <tr key={classItem.id}>
              <td data-label="Название">
                {editingClass?.id === classItem.id ? (
                  <input
                    value={editingClass.name}
                    onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  />
                ) : (
                  classItem.name
                )}
              </td>
              <td data-label="Параллель">
                {editingClass?.id === classItem.id ? (
                  <input
                    type="number"
                    value={editingClass.parallel}
                    onChange={(e) => setEditingClass({ ...editingClass, parallel: parseInt(e.target.value) || 1 })}
                  />
                ) : (
                  classItem.parallel
                )}
              </td>
              <td data-label="Классный руководитель">
                {editingClass?.id === classItem.id ? (
                  <select
                    value={editingClass.teacher_id ?? ''}
                    onChange={(e) => setEditingClass({ ...editingClass, teacher_id: e.target.value ? parseInt(e.target.value) : null })}
                  >
                    <option value="">Не выбран</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.fullName}
                      </option>
                    ))}
                  </select>
                ) : (
                  classItem.teacher_name || 'Не назначен'
                )}
              </td>
              <td data-label="Действия">
                <div className="table-actions">
                  {editingClass?.id === classItem.id ? (
                    <>
                      <button onClick={handleSaveEdit}>Сохранить</button>
                      <button onClick={() => setEditingClass(null)}>Отмена</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(classItem)}>Редактировать</button>
                      <button onClick={() => handleDelete(classItem.id)}>Удалить</button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClassManager;