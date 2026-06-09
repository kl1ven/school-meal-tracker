import ExcelJS from 'exceljs';
import { api } from '../services/api';
import { Class, MealRecord } from '../types';

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

export const CLASS_ORDER = [
  '1-а', '1-б', '1г-доп', '1-в', '2-а', '2-б', '3-а', '3-б', '4-а', '4-б',
  '5-а', '5-б', '6-а', '6-б', '7-а', '6в/7б', '8-а', '8-б', '8-в', '7в/8г',
  '9-а', '9-б', '9в/10б', '10-а', '11'
];

export const sortClasses = (classes: Class[]): Class[] => {
  return [...classes].sort((a, b) => {
    const orderA = typeof a.sort_order === 'number' ? a.sort_order : 0;
    const orderB = typeof b.sort_order === 'number' ? b.sort_order : 0;
    if (orderA && orderB) return orderA - orderB;
    if (orderA) return -1;
    if (orderB) return 1;
    const indexA = CLASS_ORDER.indexOf(a.name);
    const indexB = CLASS_ORDER.indexOf(b.name);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.name.localeCompare(b.name, 'ru');
  });
};

const formatDate = (year: number, month: number, day: number): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
};

const getGrade = (className: string): number => {
  const match = className.match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
};

const isWeekendByDateKey = (dateKey: string): boolean => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
};

const getValueForCell = (
  record: MealRecord | undefined,
  type: 'breakfast' | 'lunch',
  dateKey: string,
  holidays: string[],
): number | string => {
  if (isWeekendByDateKey(dateKey) || holidays.includes(dateKey)) {
    return 'в';
  }
  if (!record) return 0;
  return type === 'breakfast' ? record.breakfast_count : record.lunch_count;
};

export async function exportToExcel(month: number, year: number): Promise<void> {
  try {
    const classes = sortClasses(await api.fetchClasses());
    const records = await api.fetchMonthRecords(month, year);
    const holidayItems = await api.fetchHolidays(month, year);
    const holidays = holidayItems.filter((item) => !item.is_working).map((item) => item.date);
    const dayCount = new Date(year, month, 0).getDate();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'School Meal Tracker ExcelJS';
    workbook.lastModifiedBy = 'School Meal Tracker ExcelJS';
    const worksheet = workbook.addWorksheet('Питание');

    const INDEX_COL = 1;
    const NAME_COL = 2;
    const MEAL_COL = 3;
    const FIRST_DAY_COL = 4;
    const TOTAL_COL = FIRST_DAY_COL + dayCount;
    const NOTE_COL = TOTAL_COL + 1;
    const HEADER_ROW = 7; // заголовки теперь в строке 7 (было 8)

    worksheet.columns = [
      { width: 4 },
      { width: 20 },
      { width: 11 },
      ...Array.from({ length: dayCount }, () => ({ width: 5 })),
      { width: 14 },
      { width: 26.57 },
    ];

    const recordsByClassAndDate: Record<number, Record<string, MealRecord>> = {};
    classes.forEach((c) => { recordsByClassAndDate[c.id] = {}; });
    records.forEach((record) => {
      if (!recordsByClassAndDate[record.class_id]) recordsByClassAndDate[record.class_id] = {};
      recordsByClassAndDate[record.class_id][record.date] = record;
    });

    const classes1to4 = classes.filter((c) => getGrade(c.name) >= 1 && getGrade(c.name) <= 4);
    const classes5to11 = classes.filter((c) => getGrade(c.name) >= 5);

    const groupTotals: Record<'1-4' | '5-11', { breakfast: number[]; lunch: number[] }> = {
      '1-4': { breakfast: Array(dayCount).fill(0), lunch: Array(dayCount).fill(0) },
      '5-11': { breakfast: Array(dayCount).fill(0), lunch: Array(dayCount).fill(0) },
    };

    const makeEmptyRow = (): Array<string | number | null> => Array.from({ length: NOTE_COL }, () => null);
    const setRowValues = (rowNumber: number, values: Array<string | number | null>) => {
      const row = worksheet.getRow(rowNumber);
      values.forEach((value, index) => {
        row.getCell(index + 1).value = value;
      });
      return row;
    };

// Одна пустая строка
    setRowValues(1, makeEmptyRow());

    // Строка 2: УТВЕРЖДАЮ: в последней колонке (NOTE_COL)
    const approveRow = makeEmptyRow();
    approveRow[NOTE_COL - 1] = 'УТВЕРЖДАЮ:';
    setRowValues(2, approveRow);
    worksheet.getRow(2).getCell(NOTE_COL).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(2).getCell(NOTE_COL).font = { name: 'Times New Roman', size: 10 };

    // Строка 3: директор в последней колонке
    const directorRow = makeEmptyRow();
    directorRow[NOTE_COL - 1] = 'директор МОУ СКШИ г. Нерюнгри';
    setRowValues(3, directorRow);
    worksheet.getRow(3).getCell(NOTE_COL).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(3).getCell(NOTE_COL).font = { name: 'Times New Roman', size: 10 };

    // Строка 4: подпись в последней колонке
    const signRow = makeEmptyRow();
    signRow[NOTE_COL - 1] = '_________________Семенкова Н.В.';
    setRowValues(4, signRow);
    worksheet.getRow(4).getCell(NOTE_COL).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(4).getCell(NOTE_COL).font = { name: 'Times New Roman', size: 10 };

    // Строка 5: название табеля (объединено по всей ширине)
    const titleRow = makeEmptyRow();
    titleRow[INDEX_COL - 1] = `Табель учета питания за ${MONTHS[month]} ${year} г.`;
    setRowValues(5, titleRow);
    worksheet.mergeCells(5, INDEX_COL, 5, NOTE_COL);
    worksheet.getRow(5).getCell(INDEX_COL).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(5).getCell(INDEX_COL).font = { name: 'Times New Roman', size: 10 };

    // Пустые строки 6 и 7
    setRowValues(6, makeEmptyRow());
    setRowValues(7, makeEmptyRow());

    // Заголовки (строка 7, было 8)
    const headerValues = makeEmptyRow();
    headerValues[INDEX_COL - 1] = '№';
    headerValues[NAME_COL - 1] = 'Ф.И.О.';
    for (let day = 1; day <= dayCount; day++) {
      headerValues[FIRST_DAY_COL + day - 2] = day;
    }
    headerValues[TOTAL_COL - 1] = 'Кол-во приемов';
    headerValues[NOTE_COL - 1] = 'примечание';
    setRowValues(HEADER_ROW, headerValues);
    for (let col = INDEX_COL; col <= NOTE_COL; col++) {
      const cell = worksheet.getRow(HEADER_ROW).getCell(col);
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (col >= FIRST_DAY_COL && col < TOTAL_COL) {
        cell.font = { name: 'Calibri', size: 10, bold: true };
      } else {
        cell.font = { name: 'Times New Roman', size: 10, bold: true };
      }
    }
    worksheet.getRow(HEADER_ROW).getCell(NOTE_COL).font = { name: 'Calibri', size: 11, bold: true };
    
    
    let currentRow = HEADER_ROW + 1;
    const summaryRows = new Set<number>();
    const weekendColumnIndexes = new Set<number>();

    const isHolidayOrWeekend = Array.from({ length: dayCount }, (_, i) => {
      const dateKey = formatDate(year, month, i + 1);
      return isWeekendByDateKey(dateKey) || holidays.includes(dateKey);
    });

    for (let day = 1; day <= dayCount; day++) {
      if (isHolidayOrWeekend[day - 1]) {
        weekendColumnIndexes.add(FIRST_DAY_COL + day - 1);
      }
    }

    const addClassRows = (classItem: Class, classNumber: number) => {
      const breakfastValues = makeEmptyRow();
      const lunchValues = makeEmptyRow();

      breakfastValues[INDEX_COL - 1] = classNumber;
      breakfastValues[NAME_COL - 1] = `${classItem.name} класс`;
      breakfastValues[MEAL_COL - 1] = 'завтрак';
      lunchValues[MEAL_COL - 1] = 'обед';

      for (let day = 1; day <= dayCount; day++) {
        const dateKey = formatDate(year, month, day);
        const record = recordsByClassAndDate[classItem.id]?.[dateKey];
        const breakfastVal = getValueForCell(record, 'breakfast', dateKey, holidays);
        const lunchVal = getValueForCell(record, 'lunch', dateKey, holidays);

        breakfastValues[FIRST_DAY_COL + day - 2] = breakfastVal;
        lunchValues[FIRST_DAY_COL + day - 2] = lunchVal;

        const groupKey = getGrade(classItem.name) <= 4 ? '1-4' : '5-11';
        if (typeof breakfastVal === 'number') groupTotals[groupKey].breakfast[day - 1] += breakfastVal;
        if (typeof lunchVal === 'number') groupTotals[groupKey].lunch[day - 1] += lunchVal;
      }

      breakfastValues[TOTAL_COL - 1] = breakfastValues
        .slice(FIRST_DAY_COL - 1, TOTAL_COL - 1)
        .reduce<number>((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
      lunchValues[TOTAL_COL - 1] = lunchValues
        .slice(FIRST_DAY_COL - 1, TOTAL_COL - 1)
        .reduce<number>((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);

      setRowValues(currentRow, breakfastValues);
      setRowValues(currentRow + 1, lunchValues);
      worksheet.mergeCells(currentRow, INDEX_COL, currentRow + 1, INDEX_COL);
      worksheet.mergeCells(currentRow, NAME_COL, currentRow + 1, NAME_COL);

      for (let row = currentRow; row <= currentRow + 1; row++) {
        for (let col = INDEX_COL; col <= NOTE_COL; col++) {
          const cell = worksheet.getRow(row).getCell(col);
          const val = cell.value;
          if (typeof val === 'number') {
            cell.font = { name: 'Calibri', size: 10 };
          } else {
            cell.font = { name: 'Times New Roman', size: 10 };
          }
          // внутри цикла по col
          if (col === INDEX_COL || col === NAME_COL) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        }
      }
      currentRow += 2;
    };

    const addSummaryRows = (title: string, breakfastTotals: number[], lunchTotals: number[], note = '') => {
      const breakfastValues = makeEmptyRow();
      const lunchValues = makeEmptyRow();

      breakfastValues[NAME_COL - 1] = title;
      breakfastValues[MEAL_COL - 1] = 'завтрак';
      lunchValues[MEAL_COL - 1] = 'обед';

      for (let i = 0; i < dayCount; i++) {
        if (isHolidayOrWeekend[i]) {
          breakfastValues[FIRST_DAY_COL + i - 1] = 'в';
          lunchValues[FIRST_DAY_COL + i - 1] = 'в';
        } else {
          breakfastValues[FIRST_DAY_COL + i - 1] = breakfastTotals[i] ?? 0;
          lunchValues[FIRST_DAY_COL + i - 1] = lunchTotals[i] ?? 0;
        }
      }

      breakfastValues[TOTAL_COL - 1] = breakfastTotals.reduce((s, v) => s + v, 0);
      lunchValues[TOTAL_COL - 1] = lunchTotals.reduce((s, v) => s + v, 0);
      breakfastValues[NOTE_COL - 1] = note;

      setRowValues(currentRow, breakfastValues);
      setRowValues(currentRow + 1, lunchValues);

      for (let row = currentRow; row <= currentRow + 1; row++) {
        for (let col = INDEX_COL; col <= NOTE_COL; col++) {
          const cell = worksheet.getRow(row).getCell(col);
          const val = cell.value;
          if (col === INDEX_COL || col === NAME_COL || col === MEAL_COL) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
          if (typeof val === 'number') {
            cell.font = { name: 'Calibri', size: 10 };
          } else {
            cell.font = { name: 'Times New Roman', size: 10 };
          }
        }
      }

      summaryRows.add(currentRow);
      summaryRows.add(currentRow + 1);
      currentRow += 2;
    };

    let classNumber = 1;
    classes1to4.forEach((c) => addClassRows(c, classNumber++));
    addSummaryRows('Всего 1-4 классы', groupTotals['1-4'].breakfast, groupTotals['1-4'].lunch, 'Завтраков 1-4 классов');

    classes5to11.forEach((c) => addClassRows(c, classNumber++));
    addSummaryRows('Всего 5-11 классы', groupTotals['5-11'].breakfast, groupTotals['5-11'].lunch);

    const schoolBreakfastTotals = groupTotals['1-4'].breakfast.map((v, i) => v + groupTotals['5-11'].breakfast[i]);
    const schoolLunchTotals = groupTotals['1-4'].lunch.map((v, i) => v + groupTotals['5-11'].lunch[i]);
    addSummaryRows('Всего по школе', schoolBreakfastTotals, schoolLunchTotals);

    const lastDataRow = currentRow - 1;

    // Пустая строка после таблицы
    setRowValues(currentRow, makeEmptyRow());
    currentRow++;

    // Подпись "Табель составила: ..."
    const footerRow = makeEmptyRow();
    footerRow[MEAL_COL - 1] = 'Табель составила:                        Каткевич Е.А.';
    setRowValues(currentRow, footerRow);
    worksheet.mergeCells(currentRow, MEAL_COL, currentRow, NOTE_COL);
    for (let col = MEAL_COL; col <= NOTE_COL; col++) {
      const cell = worksheet.getRow(currentRow).getCell(col);
      cell.border = { top: { style: 'thin', color: { argb: 'FF000000' } } };
      cell.font = { name: 'Times New Roman', size: 10 };
    }
    const footerRowNumber = currentRow;

    const thinBorder = { style: 'thin' as const, color: { argb: 'FF000000' } };
    const weekendFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFF00' } };
    const summaryFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE6B8B7' } };

    const tableStartRow = HEADER_ROW;
    const tableEndRow = lastDataRow;

    for (let rowNumber = 1; rowNumber <= footerRowNumber; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      for (let colNumber = INDEX_COL; colNumber <= NOTE_COL; colNumber++) {
        const cell = row.getCell(colNumber);
        const value = cell.value;

        if (rowNumber >= tableStartRow && rowNumber <= tableEndRow) {
          cell.border = {
            top: rowNumber === tableStartRow ? thinBorder : thinBorder,
            bottom: rowNumber === tableEndRow ? thinBorder : thinBorder,
            left: colNumber === INDEX_COL ? thinBorder : thinBorder,
            right: colNumber === NOTE_COL ? thinBorder : thinBorder,
          };
        }

        if (value === 'в') {
          cell.fill = weekendFill;
        }
        else if (summaryRows.has(rowNumber)) {
          cell.fill = summaryFill;
        }
      }
    }

    // Жёлтая заливка для ячеек дней, которые являются выходными или праздниками
    for (let day = 1; day <= dayCount; day++) {
      if (isHolidayOrWeekend[day - 1]) {
        const colNum = FIRST_DAY_COL + day - 1;
        const cell = worksheet.getRow(HEADER_ROW).getCell(colNum);
        cell.fill = weekendFill;
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `табель_питания_${MONTHS[month]}_${year}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Ошибка при экспорте в Excel:', error);
    alert('Не удалось сформировать отчёт. Подробности в консоли (F12)');
  }
}