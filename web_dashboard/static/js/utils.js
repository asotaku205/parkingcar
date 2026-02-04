function calculateFee(minutes, isMember = false) {
    if (minutes <= PARKING_RATES.freeThreshold) {
        return 0;
    }
    
    const rates = isMember ? PARKING_RATES.member : PARKING_RATES.nonMember;
    const days = Math.floor(minutes / PARKING_RATES.dayThreshold);
    
    if (minutes <= PARKING_RATES.overnightThreshold) {
        return rates.hourly;
    } else if (days === 0) {
        return rates.overnight;
    } else {
        return rates.overnight + (days * rates.perDay);
    }
}

function categorizeFee(minutes, fee) {
    if (minutes <= PARKING_RATES.freeThreshold) {
        return 'free';
    } else if (minutes <= PARKING_RATES.overnightThreshold) {
        return 'hourly';
    } else if (minutes < PARKING_RATES.dayThreshold) {
        return 'overnight';
    } else {
        return 'multiDay';
    }
}

function parseArduinoTime(timeStr, dateStr) {
    if (!timeStr || !dateStr) return null;
    
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    const [day, month, year] = dateStr.split('/').map(Number);
    
    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    return Math.floor(date.getTime() / 1000);
}

function calculateRealTimeDuration(timeIn) {
    if (!arduinoTime) return 0;
    
    const currentTime = arduinoTime;
    const duration = Math.floor((currentTime - timeIn) / 60);
    return Math.max(0, duration);
}

function formatTime(timestamp) {
    // RTC timestamp is already in GMT+7, so we use UTC methods
    const date = new Date(timestamp * 1000);
    
    // Use UTC methods since RTC gives us GMT+7 as Unix timestamp
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
    const result = `${hours}:${minutes}:${seconds}`;
    return result;
}

function formatDate(timestamp) {
    // RTC timestamp is already in GMT+7, so we use UTC methods
    const date = new Date(timestamp * 1000);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
}

function formatDateTime(timestamp) {
    return `${formatTime(timestamp)} ${formatDate(timestamp)}`;
}

function formatDuration(minutes) {
    if (minutes < 1) {
        return '< 1 phút';
    }
    if (minutes < 60) {
        return `${minutes} phút`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `${hours} giờ`;
    }
    return `${hours} giờ ${mins} phút`;
}

// Check if UID is a member card (3 thẻ thành viên: 13 B1, F0 50, B4 FF)
function isMemberCard(uid) {
    return uid && (uid.includes('13 B1') || uid.includes('F0 50') || uid.includes('B4 FF'));
}
