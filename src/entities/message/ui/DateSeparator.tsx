import React from 'react';

const DateSeparator: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex justify-center date-separator" data-date={label}>
    <div className="px-3 py-1 bg-accent rounded-full text-sm text-accent-foreground">{label}</div>
  </div>
);

export default DateSeparator;
