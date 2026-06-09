/**
 * Форматирование дат в часовом поясе Нерюнгри (UTC+9 / Asia/Yakutsk)
 */

/**
 * Преобразует дату в строку в часовом поясе Нерюнгри (UTC+9)
 * @param dateString ISO строка даты или Date объект
 * @returns Отформатированная дата с временем: "09.06.2026, 14:30:45"
 */
export const formatNeryungriDate = (dateString: string | Date): string => {
  try {
    let date: Date;
    
    if (typeof dateString === 'string') {
      // Если строка не содержит 'T' или 'Z', это SQLite формат (YYYY-MM-DD HH:MM:SS)
      // Добавляем 'Z' чтобы браузер интерпретировал как UTC
      const cleanStr = dateString.trim();
      if (!cleanStr.includes('T') && !cleanStr.includes('Z')) {
        // Это дата без указания часового пояса, добавляем Z (UTC)
        date = new Date(cleanStr + 'Z');
      } else {
        date = new Date(cleanStr);
      }
    } else {
      date = dateString;
    }
    
    if (isNaN(date.getTime())) {
      return 'Неверная дата';
    }
    
    const formatted = date.toLocaleString('ru-RU', {
      timeZone: 'Asia/Yakutsk',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    
    console.log(`📅 formatNeryungriDate: input=${dateString}, output=${formatted}`);
    
    return formatted;
  } catch (error) {
    console.error('Ошибка форматирования даты:', error);
    return 'Ошибка даты';
  }
};

/**
 * Преобразует дату в короткую строку (только дата) в часовом поясе Нерюнгри
 * @param dateString ISO строка даты или Date объект
 * @returns Отформатированная дата: "09.06.2026"
 */
export const formatNeryungriDateShort = (dateString: string | Date): string => {
  try {
    let date: Date;
    
    if (typeof dateString === 'string') {
      const cleanStr = dateString.trim();
      if (!cleanStr.includes('T') && !cleanStr.includes('Z')) {
        date = new Date(cleanStr + 'Z');
      } else {
        date = new Date(cleanStr);
      }
    } else {
      date = dateString;
    }
    
    if (isNaN(date.getTime())) {
      return 'Неверная дата';
    }
    
    return new Date(date).toLocaleString('ru-RU', {
      timeZone: 'Asia/Yakutsk',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (error) {
    console.error('Ошибка форматирования даты:', error);
    return 'Ошибка даты';
  }
};

/**
 * Преобразует дату в строку с временем (без секунд) в часовом поясе Нерюнгри
 * @param dateString ISO строка даты или Date объект
 * @returns Отформатированная дата с временем: "09.06.2026, 14:30"
 */
export const formatNeryungriDateTime = (dateString: string | Date): string => {
  try {
    let date: Date;
    
    if (typeof dateString === 'string') {
      const cleanStr = dateString.trim();
      if (!cleanStr.includes('T') && !cleanStr.includes('Z')) {
        date = new Date(cleanStr + 'Z');
      } else {
        date = new Date(cleanStr);
      }
    } else {
      date = dateString;
    }
    
    if (isNaN(date.getTime())) {
      return 'Неверная дата';
    }
    
    return new Date(date).toLocaleString('ru-RU', {
      timeZone: 'Asia/Yakutsk',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Ошибка форматирования даты:', error);
    return 'Ошибка даты';
  }
};
