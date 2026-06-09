import React, { useEffect, useState } from 'react';
import { Class } from '../types';
import { api } from '../services/api';
import { sortClasses } from '../utils/excelExport';

interface ClassOrderManagerProps {
  classes: Class[];
  onSaveSuccess: () => Promise<void>;
  onMessage: (message: string) => void;
}

const compareClasses = (a: Class, b: Class) => {
  const orderA = typeof a.sort_order === 'number' ? a.sort_order : 0;
  const orderB = typeof b.sort_order === 'number' ? b.sort_order : 0;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  return a.name.localeCompare(b.name, 'ru');
};

const ClassOrderManager: React.FC<ClassOrderManagerProps> = ({ classes, onSaveSuccess, onMessage }) => {
  const [orderedClasses, setOrderedClasses] = useState<Class[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOrderedClasses(sortClasses(classes));
  }, [classes]);

  const moveItem = (fromId: number, toId: number) => {
    const currentIndex = orderedClasses.findIndex((item) => item.id === fromId);
    const targetIndex = orderedClasses.findIndex((item) => item.id === toId);
    if (currentIndex === -1 || targetIndex === -1) {
      return;
    }

    const next = [...orderedClasses];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);

    setOrderedClasses(next.map((item, index) => ({
      ...item,
      sort_order: index + 1,
    })));
  };

  const handleDragStart = (event: React.DragEvent<HTMLTableRowElement>, id: number) => {
    event.dataTransfer.setData('text/plain', String(id));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event: React.DragEvent<HTMLTableRowElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLTableRowElement>, targetId: number) => {
    event.preventDefault();
    const draggedId = Number(event.dataTransfer.getData('text/plain'));
    if (!Number.isNaN(draggedId)) {
      moveItem(draggedId, targetId);
    }
  };

  const handleSortOrderChange = (classId: number, value: string) => {
    const numeric = Math.max(0, Number(value) || 0);
    setOrderedClasses((prev) => prev.map((item) => (item.id === classId ? { ...item, sort_order: numeric } : item)));
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    onMessage('');
    try {
      const classIds = orderedClasses.map((item) => item.id);
      await api.reorderClasses(classIds);
      await onSaveSuccess();
      onMessage('Порядок классов сохранён.');
    } catch (err) {
      onMessage((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const displayClasses = [...orderedClasses].sort(compareClasses);

  return (
    <section className="dashboard-section">
      <h2>Порядок классов</h2>
      <p className="dashboard-description">Перетащите строки или отредактируйте поле "Порядок" вручную, затем нажмите «Сохранить порядок».</p>
      <div className="table-wrapper">
        <table className="class-order-table">
          <thead>
            <tr>
              <th>Порядок</th>
              <th>Класс</th>
              <th>Параллель</th>
            </tr>
          </thead>
          <tbody>
            {displayClasses.map((classItem) => (
              <tr
                key={classItem.id}
                className="draggable-row"
                draggable
                onDragStart={(event) => handleDragStart(event, classItem.id)}
                onDragOver={handleDragOver}
                onDrop={(event) => handleDrop(event, classItem.id)}
              >
                <td data-label="Порядок" className="order-cell">
                  <span className="drag-handle" aria-hidden="true">≡</span>
                  <input
                    type="number"
                    min="1"
                    value={classItem.sort_order ?? 0}
                    onChange={(event) => handleSortOrderChange(classItem.id, event.target.value)}
                  />
                </td>
                <td data-label="Класс">{classItem.name}</td>
                <td data-label="Параллель">{classItem.parallel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="button-row margin-top-medium">
        <button type="button" className="secondary-button" onClick={handleSaveOrder} disabled={isSaving || orderedClasses.length === 0}>
          {isSaving ? 'Сохраняем порядок...' : 'Сохранить порядок'}
        </button>
      </div>
    </section>
  );
};

export default ClassOrderManager;
