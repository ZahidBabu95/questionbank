export const toBengaliNumber = (num) => {
    const banglaDigits = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    return String(num).replace(/[0-9]/g, x => banglaDigits[x]);
};

export const formatDuration = (minutes, language = 'BENGALI') => {
    if (minutes === null || minutes === undefined || minutes === '') return '';
    const mins = parseInt(minutes, 10);
    if (isNaN(mins)) return minutes.toString();

    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    const isEnglish = language === 'ENGLISH';

    if (isEnglish) {
        if (hours > 0 && remainingMins > 0) {
            const hStr = hours === 1 ? 'Hour' : 'Hours';
            const mStr = remainingMins === 1 ? 'Minute' : 'Minutes';
            return `${hours} ${hStr} ${remainingMins} ${mStr}`;
        } else if (hours > 0) {
            const hStr = hours === 1 ? 'Hour' : 'Hours';
            return `${hours} ${hStr}`;
        } else {
            const mStr = remainingMins === 1 ? 'Minute' : 'Minutes';
            return `${remainingMins} ${mStr}`;
        }
    } else {
        if (hours > 0 && remainingMins > 0) {
            return `${toBengaliNumber(hours)} ঘণ্টা ${toBengaliNumber(remainingMins)} মিনিট`;
        } else if (hours > 0) {
            return `${toBengaliNumber(hours)} ঘণ্টা`;
        } else {
            return `${toBengaliNumber(remainingMins)} মিনিট`;
        }
    }
};

export const formatDurationString = (timeStr, language = 'BENGALI') => {
    if (timeStr === null || timeStr === undefined) return '';
    let str = timeStr.toString().trim();
    if (!str) return '';

    // Map Bengali digits to English digits for parsing
    const bnToEn = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
    const englishDigitsStr = str.replace(/[০-৯]/g, m => bnToEn[m]);

    // Check if it is a number optionally followed by minutes/min/মিনিট
    const minutesMatch = englishDigitsStr.match(/^\s*(\d+)\s*(মিনিট|minutes?|min|m)?\s*$/i);
    if (minutesMatch) {
        const mins = parseInt(minutesMatch[1], 10);
        return formatDuration(mins, language);
    }

    return timeStr;
};

export const parseDurationToMinutes = (timeStr) => {
    if (timeStr === null || timeStr === undefined) return null;
    let str = timeStr.toString().trim();
    if (!str) return null;

    // Map Bengali digits to English digits
    const bnToEn = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
    const englishDigitsStr = str.replace(/[০-৯]/g, m => bnToEn[m]);

    // 1. Try parsing a clean number or number followed by minutes: "150", "150 মিনিট", "150 minutes", "150 min", etc.
    const minutesMatch = englishDigitsStr.match(/^\s*(\d+)\s*(মিনিট|minutes?|min|m)?\s*$/i);
    if (minutesMatch) {
        return parseInt(minutesMatch[1], 10);
    }

    // 2. Try parsing hours and minutes: e.g. "2 ঘণ্টা 30 মিনিট", "2 hours 30 minutes", "2h 30m"
    const hoursPartMatch = englishDigitsStr.match(/(\d+)\s*(ঘণ্টা|hours?|hr?s?|h)/i);
    const minutesPartMatch = englishDigitsStr.match(/(\d+)\s*(মিনিট|minutes?|min|m)(?!.*(ঘণ্টা|hours?|hr?s?|h))/i) 
                          || englishDigitsStr.match(/(?:ঘণ্টা|hours?|hr?s?|h)\s*(\d+)/i)
                          || englishDigitsStr.match(/(\d+)\s*(?:মিনিট|minutes?|min|m)?\s*$/i);

    let totalMins = 0;
    let found = false;

    if (hoursPartMatch) {
        totalMins += parseInt(hoursPartMatch[1], 10) * 60;
        found = true;
    }
    
    if (minutesPartMatch) {
        const matchedMinVal = parseInt(minutesPartMatch[1], 10);
        const hoursVal = hoursPartMatch ? parseInt(hoursPartMatch[1], 10) : null;
        
        if (hoursVal === null || englishDigitsStr.indexOf(hoursPartMatch[1]) !== englishDigitsStr.lastIndexOf(minutesPartMatch[1])) {
            totalMins += matchedMinVal;
            found = true;
        }
    }

    if (found) return totalMins;

    const rawNumberMatch = englishDigitsStr.match(/^-?\d+$/);
    if (rawNumberMatch) {
        return parseInt(englishDigitsStr, 10);
    }

    return null;
};

export const parseMarksToNumber = (marksStr) => {
    if (marksStr === null || marksStr === undefined) return null;
    let str = marksStr.toString().trim();
    if (!str) return null;
    const bnToEn = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
    const englishDigitsStr = str.replace(/[০-৯]/g, m => bnToEn[m]);
    const match = englishDigitsStr.match(/(\d+(\.\d+)?)/);
    if (match) {
        const val = parseFloat(match[1]);
        return isNaN(val) ? null : val;
    }
    return null;
};

