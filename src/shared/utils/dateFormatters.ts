const createUTCDate = (date: string | Date): Date => {
  if (typeof date === 'string') {
    return new Date(date.endsWith('Z') ? date : date + 'Z');
  } else {
    return date;
  }
};

export const formatDate = (date: string | Date, language: 'en' | 'ru') => {
  const dateObj = createUTCDate(date);
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', options).format(dateObj);
};

export const formatDateLabel = (date: string | Date, language: 'en' | 'ru', today: Date, yesterday: Date): string => {
  const dateObj = createUTCDate(date);
  
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
  const dateObj = createUTCDate(date);
  return dateObj.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};
