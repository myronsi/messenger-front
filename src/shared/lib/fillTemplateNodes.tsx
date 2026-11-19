import { Fragment, type ReactNode } from 'react';

export const fillTemplateNodes = (template: string, values: Record<string, ReactNode>) =>
  template.split(/(\{\w+\})/).map((part, index) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    const value = key && Object.prototype.hasOwnProperty.call(values, key) ? values[key] : part;
    return <Fragment key={index}>{value}</Fragment>;
  });
