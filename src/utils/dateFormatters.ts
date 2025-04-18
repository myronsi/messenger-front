
export const formatDate = (date: string | Date, language: 'en' | 'ru') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', options).format(dateObj);
};
