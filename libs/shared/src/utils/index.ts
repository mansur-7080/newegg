// Utility functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
  }).format(amount);
};

export const formatUZSPrice = (amount: number): string => {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('uz-UZ').format(date);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

export const uzbekRegions = [
  'Toshkent',
  'Samarqand',
  'Buxoro',
  'Andijon',
  'Farg\'ona',
  'Namangan',
  'Qashqadaryo',
  'Surxondaryo',
  'Sirdaryo',
  'Jizzax',
  'Navoiy',
  'Xorazm',
  'Qoraqalpog\'iston',
];

export const isValidUzbekPhoneNumber = (phone: string): boolean => {
  const uzbekPhoneRegex = /^\+998[0-9]{9}$/;
  return uzbekPhoneRegex.test(phone);
};

export const normalizeUzbekText = (text: string): string => {
  return text
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/"/g, '"');
};