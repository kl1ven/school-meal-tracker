import { api } from '../services/api';
import { Class, MealRecord } from '../types';

type PrintableMealRow = {
  className: string;
  breakfast: number;
  lunch: number;
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildPrintHtml = (date: string, rows: PrintableMealRow[]) => {
  const totalBreakfast = rows.reduce((sum, item) => sum + item.breakfast, 0);
  const totalLunch = rows.reduce((sum, item) => sum + item.lunch, 0);
  const rowsHtml = rows.map((item) => `
    <tr>
      <td>${escapeHtml(item.className)}</td>
      <td>${item.breakfast}</td>
      <td>${item.lunch}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <title>Распечатка для столовой</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          h1 { text-align: center; margin-bottom: 8px; }
          .date { text-align: center; margin-bottom: 20px; font-size: 16px; }
          .hint { text-align: center; color: #64748b; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #111827; padding: 8px; text-align: center; }
          th { background: #f2f2f2; }
          .sign { margin-top: 32px; display: flex; justify-content: space-between; gap: 16px; }
          .actions { margin-top: 16px; text-align: center; }
          .close-btn { border: none; background: #2563eb; color: #fff; border-radius: 8px; padding: 10px 16px; cursor: pointer; }
          @media print {
            body { margin: 12px; }
            .actions, .hint { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Распечатка для столовой</h1>
        <div class="date">Дата: ${escapeHtml(new Date(date).toLocaleDateString('ru-RU'))}</div>
        <div class="hint">После печати окно можно закрыть вручную, если браузер не закроет его автоматически.</div>
        <table>
          <thead>
            <tr>
              <th>Класс</th>
              <th>Завтрак</th>
              <th>Обед</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr>
              <td><strong>Итого</strong></td>
              <td><strong>${totalBreakfast}</strong></td>
              <td><strong>${totalLunch}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="sign">
          <span>Ответственный за питание: __________________</span>
          <span>Столовая: __________________</span>
        </div>
        <div class="actions">
          <button class="close-btn" onclick="window.close()">Закрыть</button>
        </div>
        <script>
          window.onload = () => {
            window.print();
            window.onafterprint = () => {
              try { window.close(); } catch (e) {}
            };
          };
        </script>
      </body>
    </html>
  `;
};

const sortClasses = (items: Class[]) => [...items].sort((a, b) => {
  const gradeA = parseInt(a.name, 10) || 0;
  const gradeB = parseInt(b.name, 10) || 0;
  if (gradeA !== gradeB) return gradeA - gradeB;
  return a.name.localeCompare(b.name, 'ru');
});

const buildFallbackRows = async (date: string): Promise<PrintableMealRow[]> => {
  const [records, classes] = await Promise.all([api.fetchRecordsByDate(date), api.fetchClasses()]);
  const recordMap = new Map<number, MealRecord>(records.map((item) => [Number(item.class_id), item]));

  return sortClasses(classes).map((item) => {
    const record = recordMap.get(item.id);
    return {
      className: item.name,
      breakfast: Number(record?.breakfast_count ?? 0),
      lunch: Number(record?.lunch_count ?? 0),
    };
  });
};

export const printMealReport = async (date: string): Promise<void> => {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    throw new Error('Разрешите всплывающее окно для печати отчёта.');
  }

  try {
    let html: string;

    try {
      html = await api.fetchCanteenPrintHtml(date);
    } catch {
      const rows = await buildFallbackRows(date);
      html = buildPrintHtml(date, rows);
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } catch (error) {
    printWindow.close();
    throw error;
  }
};
