export const parseUtcDate = (date: string | Date): Date => {
  if (typeof date === 'string') {
    const trimmed = date.trim();
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
    const normalized = trimmed.includes(' ') ? trimmed.replace(' ', 'T') : trimmed;
    return new Date(hasTimezone ? normalized : `${normalized}Z`);
  }
  return date;
};

export const formatDate = (date: string | Date, language: 'en' | 'ru') => {
  const dateObj = parseUtcDate(date);
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', options).format(dateObj);
};

export const formatDateOnly = (date: string | Date, language: 'en' | 'ru') => {
  const dateObj = parseUtcDate(date);

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', options).format(dateObj);
};

export const formatDateLabel = (date: string | Date, language: 'en' | 'ru', today: Date, yesterday: Date): string => {
  const dateObj = parseUtcDate(date);
  
  if (dateObj.toDateString() === today.toDateString()) {
    return language === 'ru' ? 'Сегодня' : 'Today';
  }
  
  if (dateObj.toDateString() === yesterday.toDateString()) {
    return language === 'ru' ? 'Вчера' : 'Yesterday';
  }
  
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: dateObj.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  };
  
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', options).format(dateObj);
};

export const formatTime = (date: string | Date, language: 'en' | 'ru'): string => {
  const dateObj = parseUtcDate(date);
  return dateObj.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};
