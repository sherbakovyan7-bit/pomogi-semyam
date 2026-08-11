export const colors = {
  brand: '#E85D75',
  brandDark: '#C9495F',
  bg: '#F8F9FB',
  card: '#FFFFFF',
  border: '#E6E8EE',
  text: '#212529',
  muted: '#6C757D',
  success: '#198754',
  danger: '#DC3545',
  warning: '#FFC107',
  info: '#0D6EFD',
};

export const URGENCY = {
  critical: { label: 'Критично', color: colors.danger },
  high: { label: 'Высокая', color: colors.warning },
  medium: { label: 'Средняя', color: colors.info },
  low: { label: 'Не срочно', color: colors.muted },
};

export const CATEGORIES = [
  'Детские вещи',
  'Одежда',
  'Продукты',
  'Медицина',
  'Лекарства',
  'Оплата обучения',
  'Транспорт',
  'Другое',
];