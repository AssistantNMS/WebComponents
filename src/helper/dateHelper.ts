import dayjs from 'dayjs';

export const defaultFormat = (date: Date) => {
    return dayjs(date).format('YYYY-MM-DD');
}


export const percentageProgress = (startDate: Date, endDate: Date): number => {
    const startDateMilli = dayjs(startDate).valueOf();
    const currDateMilli = dayjs(new Date()).valueOf();
    const endDateMilli = dayjs(endDate).valueOf();

    if (currDateMilli > endDateMilli) {
        return 100;
    }

    // if (startDateMilli < endDateMilli) {
    //     return 0;
    // }

    const progressMilli = currDateMilli - startDateMilli;
    const goalMilli = endDateMilli - startDateMilli;
    const percentage = (progressMilli / goalMilli) * 100;

    return Math.round(percentage);
}

export const getHoursLeft = (startDate: Date, endDate: Date): number => {
    const startDateMilli = dayjs(startDate).valueOf();
    const currDateMilli = dayjs(new Date()).valueOf();
    const endDateMilli = dayjs(endDate).valueOf();

    if (currDateMilli > endDateMilli) {
        return 0;
    }

    // if (startDateMilli < endDateMilli) {
    //     return 0;
    // }

    const diffMilli = currDateMilli - startDateMilli;

    return diffMilli / 360000;
}

export const getRelativeTimeLeft = (startDate: Date, endDate: Date) => {
    const rtf = new Intl.RelativeTimeFormat("en", {
        localeMatcher: "best fit", // other values: "lookup"
        numeric: "always", // other values: "auto"
        style: "long", // other values: "short" or "narrow"
    });

    const hours = getHoursLeft(startDate, endDate);
    if (hours === 0) return 'Completed';
    if (hours < 10) return rtf.format(hours, 'hours');

    const days = hours / 24;
    if (days < 10) return rtf.format(days, 'days');

    const months = days / 30;
    if (months < 10) return rtf.format(months, 'months');

    const years = months / 12;
    if (years < 10) return rtf.format(years, 'years');

    return 'Unknown';
}