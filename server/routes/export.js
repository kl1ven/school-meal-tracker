const express = require('express');
const XLSX = require('xlsx');
const { allAsync } = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

const MONTHS = [
  '',
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

const CLASS_ORDER = [
  '1-а', '1-б', '1г-доп', '1-в', '2-а', '2-б', '3-а', '3-б', '4-а', '4-б',
  '5-а', '5-б', '6-а', '6-б', '7-а', '6в/7б', '8-а', '8-б', '8-в', '7в/8г',
  '9-а', '9-б', '9в/10б', '10-а', '11',
];

router.use(authenticateToken);

function getGrade(className) {
  const match = className.match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
}

function sortClasses(classes) {
  return [...classes].sort((a, b) => {
    const indexA = CLASS_ORDER.indexOf(a.name);
    const indexB = CLASS_ORDER.indexOf(b.name);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.name.localeCompare(b.name, 'ru');
  });
}

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

router.get('/canteen-print', async (req, res) => {
  try {
    const date = String(req.query.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Не указана корректная дата.' });
    }

    const classes = sortClasses(await allAsync('SELECT id, name, parallel FROM classes', []));
    const records = await allAsync('SELECT class_id, breakfast_count, lunch_count FROM meal_records WHERE date = ?', [date]);
    const recordMap = new Map(records.map((item) => [Number(item.class_id), item]));

    const rows = classes.map((item) => {
      const record = recordMap.get(item.id);
      return {
        className: item.name,
        breakfast: Number(record?.breakfast_count ?? 0),
        lunch: Number(record?.lunch_count ?? 0),
      };
    });

    const totalBreakfast = rows.reduce((sum, item) => sum + item.breakfast, 0);
    const totalLunch = rows.reduce((sum, item) => sum + item.lunch, 0);
    const rowsHtml = rows.map((item) => `
      <tr>
        <td>${escapeHtml(item.className)}</td>
        <td>${item.breakfast}</td>
        <td>${item.lunch}</td>
      </tr>
    `).join('');

    const html = `
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

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error generating canteen print HTML:', error);
    res.status(500).json({ message: 'Ошибка при подготовке печатной формы.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (!month || !year) {
      return res.status(400).json({ message: 'Не указан месяц или год.' });
    }

    const classes = sortClasses(await allAsync('SELECT id, name, parallel FROM classes', []));
    const records = await allAsync(
      'SELECT * FROM meal_records WHERE strftime("%Y", date) = ? AND strftime("%m", date) = ?',
      [String(year), String(month).padStart(2, '0')],
    );
    const holidayRows = await allAsync(
      'SELECT date, is_working FROM holiday_calendar WHERE strftime("%Y", date) = ? AND strftime("%m", date) = ?',
      [String(year), String(month).padStart(2, '0')],
    );

    const holidays = holidayRows.filter((item) => item.is_working === 0).map((item) => item.date);
    const dayCount = new Date(year, month, 0).getDate();

    const INDEX_COL = 0;
    const NAME_COL = 1;
    const MEAL_COL = 2;
    const FIRST_DAY_COL = 3;
    const TOTAL_COL = FIRST_DAY_COL + dayCount;
    const NOTE_COL = TOTAL_COL + 1;
    const TOTAL_COLS = NOTE_COL + 1;
    const HEADER_ROW_INDEX = 6;

    const makeEmptyRow = () => Array(TOTAL_COLS).fill(null);
    const recordsByClassAndDate = {};
    classes.forEach((item) => {
      recordsByClassAndDate[item.id] = {};
    });
    records.forEach((record) => {
      if (!recordsByClassAndDate[record.class_id]) {
        recordsByClassAndDate[record.class_id] = {};
      }
      recordsByClassAndDate[record.class_id][record.date] = record;
    });

    const worksheetData = [];
    const merges = [];
    const summaryRowIndexes = new Set();

    const approveRow = makeEmptyRow();
    approveRow[0] = 'УТВЕРЖДАЮ:';
    worksheetData.push(approveRow);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } });

    const directorRow = makeEmptyRow();
    directorRow[NOTE_COL] = 'директор МОУ СКШИ г. Нерюнгри';
    worksheetData.push(directorRow);

    const signRow = makeEmptyRow();
    signRow[NOTE_COL] = '_________________Семенкова Н.В.';
    worksheetData.push(signRow);

    const titleRow = makeEmptyRow();
    titleRow[0] = `Табель учета питания за ${MONTHS[month]} ${year} г.`;
    worksheetData.push(titleRow);
    merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } });

    worksheetData.push(makeEmptyRow());
    worksheetData.push(makeEmptyRow());

    const headerRow = makeEmptyRow();
    headerRow[INDEX_COL] = '№';
    headerRow[NAME_COL] = 'Ф.И.О.';
    for (let day = 1; day <= dayCount; day += 1) {
      headerRow[FIRST_DAY_COL + day - 1] = day;
    }
    headerRow[TOTAL_COL] = 'Кол-во приемов';
    headerRow[NOTE_COL] = 'примечание';
    worksheetData.push(headerRow);

    const classes1to4 = classes.filter((item) => {
      const grade = getGrade(item.name);
      return grade >= 1 && grade <= 4;
    });
    const classes5to11 = classes.filter((item) => getGrade(item.name) >= 5);

    const groupTotals = {
      '1-4': { breakfast: Array(dayCount).fill(0), lunch: Array(dayCount).fill(0) },
      '5-11': { breakfast: Array(dayCount).fill(0), lunch: Array(dayCount).fill(0) },
    };

    const addClassRows = (classItem, classNumber) => {
      const startRowIndex = worksheetData.length;
      const breakfastRow = makeEmptyRow();
      const lunchRow = makeEmptyRow();
      breakfastRow[INDEX_COL] = classNumber;
      breakfastRow[NAME_COL] = classItem.name;
      breakfastRow[MEAL_COL] = 'завтрак';
      lunchRow[MEAL_COL] = 'обед';

      for (let day = 1; day <= dayCount; day += 1) {
        const currentDate = new Date(year, month - 1, day);
        const dateKey = formatDate(year, month, day);
        const record = recordsByClassAndDate[classItem.id]?.[dateKey];
        const weekendOrHoliday = isWeekend(currentDate) || holidays.includes(dateKey);

        const breakfastValue = weekendOrHoliday ? 'в' : (record ? record.breakfast_count : 0);
        const lunchValue = weekendOrHoliday ? 'в' : (record ? record.lunch_count : 0);

        breakfastRow[FIRST_DAY_COL + day - 1] = breakfastValue;
        lunchRow[FIRST_DAY_COL + day - 1] = lunchValue;

        const groupKey = getGrade(classItem.name) <= 4 ? '1-4' : '5-11';
        if (typeof breakfastValue === 'number') groupTotals[groupKey].breakfast[day - 1] += breakfastValue;
        if (typeof lunchValue === 'number') groupTotals[groupKey].lunch[day - 1] += lunchValue;
      }

      breakfastRow[TOTAL_COL] = breakfastRow.slice(FIRST_DAY_COL, TOTAL_COL).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
      lunchRow[TOTAL_COL] = lunchRow.slice(FIRST_DAY_COL, TOTAL_COL).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);

      worksheetData.push(breakfastRow);
      worksheetData.push(lunchRow);
      merges.push({ s: { r: startRowIndex, c: INDEX_COL }, e: { r: startRowIndex + 1, c: INDEX_COL } });
      merges.push({ s: { r: startRowIndex, c: NAME_COL }, e: { r: startRowIndex + 1, c: NAME_COL } });
    };

    const addSummaryRows = (title, breakfastTotals, lunchTotals, note = '') => {
      const rowIndex = worksheetData.length;
      const breakfastRow = makeEmptyRow();
      const lunchRow = makeEmptyRow();
      breakfastRow[NAME_COL] = title;
      breakfastRow[MEAL_COL] = 'завтрак';
      lunchRow[MEAL_COL] = 'обед';

      for (let i = 0; i < dayCount; i += 1) {
        breakfastRow[FIRST_DAY_COL + i] = breakfastTotals[i] ?? 0;
        lunchRow[FIRST_DAY_COL + i] = lunchTotals[i] ?? 0;
      }

      breakfastRow[TOTAL_COL] = breakfastTotals.reduce((sum, value) => sum + value, 0);
      lunchRow[TOTAL_COL] = lunchTotals.reduce((sum, value) => sum + value, 0);
      breakfastRow[NOTE_COL] = note;

      worksheetData.push(breakfastRow);
      worksheetData.push(lunchRow);
      summaryRowIndexes.add(rowIndex);
      summaryRowIndexes.add(rowIndex + 1);
    };

    let classNumber = 1;
    classes1to4.forEach((item) => {
      addClassRows(item, classNumber);
      classNumber += 1;
    });

    addSummaryRows('Всего 1-4 классы', groupTotals['1-4'].breakfast, groupTotals['1-4'].lunch, 'Завтраков 1-4 классов');

    classes5to11.forEach((item) => {
      addClassRows(item, classNumber);
      classNumber += 1;
    });

    addSummaryRows('Всего 5-11 классы', groupTotals['5-11'].breakfast, groupTotals['5-11'].lunch);

    const schoolBreakfast = groupTotals['1-4'].breakfast.map((value, index) => value + groupTotals['5-11'].breakfast[index]);
    const schoolLunch = groupTotals['1-4'].lunch.map((value, index) => value + groupTotals['5-11'].lunch[index]);
    addSummaryRows('Всего по школе', schoolBreakfast, schoolLunch);

    worksheetData.push(makeEmptyRow());
    const footerRow = makeEmptyRow();
    footerRow[0] = 'Табель составила:  Каткевич Е.А.';
    worksheetData.push(footerRow);

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();

    worksheet['!cols'] = [
      { wch: 4 },
      { wch: 20 },
      { wch: 11 },
      ...Array.from({ length: dayCount }, () => ({ wch: 5 })),
      { wch: 14 },
      { wch: 12 },
    ];
    worksheet['!merges'] = merges;

    const thin = { style: 'thin', color: { rgb: '000000' } };
    const thick = { style: 'thick', color: { rgb: '000000' } };
    const tableStartRow = HEADER_ROW_INDEX;
    const tableEndRow = worksheetData.length - 3;

    for (let row = 0; row < worksheetData.length; row += 1) {
      for (let col = 0; col < TOTAL_COLS; col += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        const rawValue = worksheetData[row]?.[col];
        const cell = worksheet[address] || { t: typeof rawValue === 'number' ? 'n' : 's', v: rawValue ?? '' };
        cell.s = cell.s || {};

        if (row >= tableStartRow && row <= tableEndRow) {
          cell.s.border = {
            top: row === tableStartRow ? thick : thin,
            bottom: row === tableEndRow ? thick : thin,
            left: col === INDEX_COL ? thick : thin,
            right: col === NOTE_COL ? thick : thin,
          };
        }

        if (row === 0) {
          cell.s.alignment = { horizontal: 'left', vertical: 'center' };
        } else if (row === 1 || row === 2) {
          cell.s.alignment = col === NOTE_COL ? { horizontal: 'right', vertical: 'center' } : { horizontal: 'left', vertical: 'center' };
        } else if (row === 3 || row === HEADER_ROW_INDEX) {
          cell.s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
        } else if (row === worksheetData.length - 1) {
          cell.s.alignment = { horizontal: 'left', vertical: 'center' };
        } else if (row >= tableStartRow && row <= tableEndRow) {
          if (summaryRowIndexes.has(row)) {
            cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'F2F2F2' } };
          }
          if (typeof rawValue === 'number' || rawValue === 'в' || col === INDEX_COL || col === MEAL_COL || (col >= FIRST_DAY_COL && col <= TOTAL_COL)) {
            cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          } else if (col === NAME_COL) {
            cell.s.alignment = { horizontal: summaryRowIndexes.has(row) ? 'left' : 'center', vertical: 'center' };
          }
        }

        worksheet[address] = cell;
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Питание');

    const fileName = `табель_питания_${MONTHS[month]}_${year}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer', cellStyles: true });
    res.send(buffer);
  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).json({ message: 'Ошибка при генерации отчета.' });
  }
});

module.exports = router;
