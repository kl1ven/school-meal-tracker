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

// Порядок классов согласно образцу
const CLASS_ORDER = [
  '1-а', '1-б', '1г-доп', '1-в', '2-а', '2-б', '3-а', '3-б', '4-а', '4-б',
  '5-а', '5-б', '6-а', '6-б', '7-а', '6в/7б', '8-а', '8-б', '8-в', '7в/8г',
  '9-а', '9-б', '9в/10б', '10-а', '11'
];

const formatDate = (year: number, month: number, day: number): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
};

const getGrade = (className: string): number => {
  const match = className.match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
};

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const getValueForCell = (
  record: MealRecord | undefined,
  type: 'breakfast' | 'lunch',
  date: Date,
  holidays: string[],
): number | string => {
  const dateKey = formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  if (isWeekend(date) || holidays.includes(dateKey)) {
    return 'в';
  }

  if (!record) {
    return 0;
  }

  return type === 'breakfast' ? record.breakfast_count : record.lunch_count;
};

const sortClasses = (classes: Class[]): Class[] => {
  return classes.sort((a, b) => {
    const indexA = CLASS_ORDER.indexOf(a.name);
    const indexB = CLASS_ORDER.indexOf(b.name);
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
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
    console.info('[Excel export] Using ExcelJS generator from src/utils/excelExport.ts');
    const worksheet = workbook.addWorksheet('Питание');

    const INDEX_COL = 1;
    const NAME_COL = 2;
    const MEAL_COL = 3;
    const FIRST_DAY_COL = 4;
    const TOTAL_COL = FIRST_DAY_COL + dayCount;
    const NOTE_COL = TOTAL_COL + 1;
    const HEADER_ROW = 7;

    worksheet.columns = [
      { width: 4 },
      { width: 20 },
      { width: 11 },
      ...Array.from({ length: dayCount }, () => ({ width: 5 })),
      { width: 14 },
      { width: 12 },
    ];

    const recordsByClassAndDate: Record<number, Record<string, MealRecord>> = {};
    classes.forEach((item) => {
      recordsByClassAndDate[item.id] = {};
    });
    records.forEach((record) => {
      if (!recordsByClassAndDate[record.class_id]) {
        recordsByClassAndDate[record.class_id] = {};
      }
      recordsByClassAndDate[record.class_id][record.date] = record;
    });

    const classes1to4 = classes.filter((item) => {
      const grade = getGrade(item.name);
      return grade >= 1 && grade <= 4;
    });
    const classes5to11 = classes.filter((item) => getGrade(item.name) >= 5);

    const groupTotals: Record<'1-4' | '5-11', { breakfast: number[]; lunch: number[] }> = {
      '1-4': { breakfast: Array(dayCount).fill(0), lunch: Array(dayCount).fill(0) },
      '5-11': { breakfast: Array(dayCount).fill(0), lunch: Array(dayCount).fill(0) },
    };

    const makeRowValues = (): Array<string | number> => Array.from({ length: NOTE_COL }, () => '');

    const setRowValues = (rowNumber: number, values: Array<string | number>) => {
      const row = worksheet.getRow(rowNumber);
      values.forEach((value, index) => {
        row.getCell(index + 1).value = value;
      });
      return row;
    };

    setRowValues(1, (() => {
      const row = makeRowValues();
      row[0] = 'УТВЕРЖДАЮ:';
      return row;
    })());
    worksheet.mergeCells(1, INDEX_COL, 1, NOTE_COL);

    setRowValues(2, (() => {
      const row = makeRowValues();
      row[NOTE_COL - 1] = 'директор МОУ СКШИ г. Нерюнгри';
      return row;
    })());

    setRowValues(3, (() => {
      const row = makeRowValues();
      row[NOTE_COL - 1] = '_________________Семенкова Н.В.';
      return row;
    })());

    setRowValues(4, (() => {
      const row = makeRowValues();
      row[0] = `Табель учета питания за ${MONTHS[month]} ${year} г.`;
      return row;
    })());
    worksheet.mergeCells(4, INDEX_COL, 4, NOTE_COL);

    setRowValues(5, makeRowValues());
    setRowValues(6, makeRowValues());

    const weekendColumnIndexes = new Set<number>();

    const headerValues = makeRowValues();
    headerValues[INDEX_COL - 1] = '№';
    headerValues[NAME_COL - 1] = 'Ф.И.О.';
    for (let day = 1; day <= dayCount; day += 1) {
      headerValues[FIRST_DAY_COL + day - 2] = day;
      const currentDate = new Date(year, month - 1, day);
      const dateKey = formatDate(year, month, day);
      if (isWeekend(currentDate) || holidays.includes(dateKey)) {
        weekendColumnIndexes.add(FIRST_DAY_COL + day - 1);
      }
    }
    headerValues[TOTAL_COL - 1] = 'Кол-во приемов';
    headerValues[NOTE_COL - 1] = 'примечание';
    setRowValues(HEADER_ROW, headerValues);

    let currentRow = HEADER_ROW + 1;
    const summaryRows = new Set<number>();

    const addClassRows = (classItem: Class, classNumber: number) => {
      const breakfastValues = makeRowValues();
      const lunchValues = makeRowValues();

      breakfastValues[INDEX_COL - 1] = classNumber;
      breakfastValues[NAME_COL - 1] = classItem.name;
      breakfastValues[MEAL_COL - 1] = 'завтрак';
      lunchValues[MEAL_COL - 1] = 'обед';

      for (let day = 1; day <= dayCount; day += 1) {
        const currentDate = new Date(year, month - 1, day);
        const dateKey = formatDate(year, month, day);
        const record = recordsByClassAndDate[classItem.id]?.[dateKey];
        const breakfastValue = getValueForCell(record, 'breakfast', currentDate, holidays);
        const lunchValue = getValueForCell(record, 'lunch', currentDate, holidays);

        breakfastValues[FIRST_DAY_COL + day - 2] = breakfastValue;
        lunchValues[FIRST_DAY_COL + day - 2] = lunchValue;

        const groupKey: '1-4' | '5-11' = getGrade(classItem.name) <= 4 ? '1-4' : '5-11';
        if (typeof breakfastValue === 'number') groupTotals[groupKey].breakfast[day - 1] += breakfastValue;
        if (typeof lunchValue === 'number') groupTotals[groupKey].lunch[day - 1] += lunchValue;
      }

      breakfastValues[TOTAL_COL - 1] = breakfastValues.slice(FIRST_DAY_COL - 1, TOTAL_COL - 1).reduce<number>((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
      lunchValues[TOTAL_COL - 1] = lunchValues.slice(FIRST_DAY_COL - 1, TOTAL_COL - 1).reduce<number>((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);

      setRowValues(currentRow, breakfastValues);
      setRowValues(currentRow + 1, lunchValues);
      worksheet.mergeCells(currentRow, INDEX_COL, currentRow + 1, INDEX_COL);
      worksheet.mergeCells(currentRow, NAME_COL, currentRow + 1, NAME_COL);
      currentRow += 2;
    };

    const addSummaryRows = (title: string, breakfastTotals: number[], lunchTotals: number[], note = '') => {
      const breakfastValues = makeRowValues();
      const lunchValues = makeRowValues();

      breakfastValues[NAME_COL - 1] = title;
      breakfastValues[MEAL_COL - 1] = 'завтрак';
      lunchValues[MEAL_COL - 1] = 'обед';

      for (let i = 0; i < dayCount; i += 1) {
        breakfastValues[FIRST_DAY_COL + i - 1] = breakfastTotals[i] ?? 0;
        lunchValues[FIRST_DAY_COL + i - 1] = lunchTotals[i] ?? 0;
      }

      breakfastValues[TOTAL_COL - 1] = breakfastTotals.reduce((sum, value) => sum + value, 0);
      lunchValues[TOTAL_COL - 1] = lunchTotals.reduce((sum, value) => sum + value, 0);
      breakfastValues[NOTE_COL - 1] = note;

      setRowValues(currentRow, breakfastValues);
      setRowValues(currentRow + 1, lunchValues);
      summaryRows.add(currentRow);
      summaryRows.add(currentRow + 1);
      currentRow += 2;
    };

    let classNumber = 1;
    classes1to4.forEach((classItem) => {
      addClassRows(classItem, classNumber);
      classNumber += 1;
    });

    addSummaryRows('Всего 1-4 классы', groupTotals['1-4'].breakfast, groupTotals['1-4'].lunch, 'Завтраков 1-4 классов');

    classes5to11.forEach((classItem) => {
      addClassRows(classItem, classNumber);
      classNumber += 1;
    });

    addSummaryRows('Всего 5-11 классы', groupTotals['5-11'].breakfast, groupTotals['5-11'].lunch);

    const schoolBreakfastTotals = groupTotals['1-4'].breakfast.map((value, index) => value + groupTotals['5-11'].breakfast[index]);
    const schoolLunchTotals = groupTotals['1-4'].lunch.map((value, index) => value + groupTotals['5-11'].lunch[index]);
    addSummaryRows('Всего по школе', schoolBreakfastTotals, schoolLunchTotals);

    const footerRowNumber = currentRow + 1;
    setRowValues(currentRow, makeRowValues());
    const footerValues = makeRowValues();
    footerValues[0] = 'Табель составила:  Каткевич Е.А.';
    setRowValues(footerRowNumber, footerValues);

    const thinBorder = { style: 'thin' as const, color: { argb: 'FF000000' } };
    const thickBorder = { style: 'thick' as const, color: { argb: 'FF000000' } };
    const weekendFill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFFFF2CC' },
    };
    const tableStartRow = HEADER_ROW;
    const tableEndRow = currentRow - 1;

    for (let rowNumber = 1; rowNumber <= footerRowNumber; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      for (let colNumber = INDEX_COL; colNumber <= NOTE_COL; colNumber += 1) {
        const cell = row.getCell(colNumber);
        const value = cell.value;

        if (rowNumber >= tableStartRow && rowNumber <= tableEndRow) {
          cell.border = {
            top: rowNumber === tableStartRow ? thickBorder : thinBorder,
            bottom: rowNumber === tableEndRow ? thickBorder : thinBorder,
            left: colNumber === INDEX_COL ? thickBorder : thinBorder,
            right: colNumber === NOTE_COL ? thickBorder : thinBorder,
          };
        }

        if (rowNumber === 1) {
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (rowNumber === 2 || rowNumber === 3) {
          cell.alignment = { horizontal: colNumber === NOTE_COL ? 'right' : 'left', vertical: 'middle' };
        } else if (rowNumber === 4) {
          cell.font = { bold: true, size: 12 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (rowNumber === HEADER_ROW) {
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        } else if (rowNumber === footerRowNumber) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (rowNumber >= tableStartRow && rowNumber <= tableEndRow) {
          if (weekendColumnIndexes.has(colNumber) && colNumber >= FIRST_DAY_COL && colNumber < TOTAL_COL) {
            cell.fill = weekendFill;
          } else if (summaryRows.has(rowNumber)) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F2F2' },
            };
          }

          const isNumber = typeof value === 'number';
          const isWeekendMark = value === 'в';
          const isCenteredColumn = colNumber === INDEX_COL || colNumber === NAME_COL || colNumber === MEAL_COL || (colNumber >= FIRST_DAY_COL && colNumber <= TOTAL_COL);

          if (isNumber || isWeekendMark || isCenteredColumn) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
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