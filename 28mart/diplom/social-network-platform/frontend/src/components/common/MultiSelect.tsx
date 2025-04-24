import React from 'react';
import { useTranslation } from 'react-i18next';

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder
}) => {
  const { t } = useTranslation();

  const handleOptionClick = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(item => item !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="relative">
      <div className="min-h-[42px] p-1 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
        <div className="flex flex-wrap gap-2 p-1">
          {value.length === 0 && (
            <span className="text-gray-500 dark:text-gray-400 px-2 py-1">
              {placeholder || t('formLabels.selectOptions')}
            </span>
          )}
          {value.map(item => (
            <span
              key={item}
              className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300"
            >
              {item}
              <button
                type="button"
                onClick={() => handleOptionClick(item)}
                className="ml-1 hover:text-primary-900 dark:hover:text-primary-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      
      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
        {options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => handleOptionClick(option)}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600
              ${value.includes(option) ? 'bg-primary-50 dark:bg-primary-900/50' : ''}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};
