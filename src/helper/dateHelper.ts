import dayjs from 'dayjs';

export const defaultFormat = (date: Date) => {
    return dayjs(date).format('YYYY-MM-DD');
}