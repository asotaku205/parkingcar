const API_URL = '/api/data';
const HISTORY_URL = '/api/history';
const UPDATE_INTERVAL = 1000;

const PARKING_RATES = {
    nonMember: {
        hourly: 5000,
        overnight: 10000,
        perDay: 10000,
    },
    member: {
        hourly: 3000,
        overnight: 7000,
        perDay: 7000,
    },
    freeThreshold: 1,
    overnightThreshold: 3,
    dayThreshold: 5
};
