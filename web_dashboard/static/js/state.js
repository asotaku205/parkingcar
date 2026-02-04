let totalRevenue = 0;
let todayRevenue = 0;
let todayDate = new Date().toLocaleDateString('vi-VN');
let arduinoTime = null;

let revenueStats = {
    todayEntry: 0,
    todayExit: 0,
    freeCount: 0,
    hourlyCount: 0,
    hourlyRevenue: 0,
    overnightCount: 0,
    overnightRevenue: 0,
    multiDayCount: 0,
    multiDayRevenue: 0,
    memberCount: 0,
    nonMemberCount: 0,
    totalDuration: 0,
    paidTransactions: 0
};

function resetRevenueStats() {
    revenueStats = {
        todayEntry: 0,
        todayExit: 0,
        freeCount: 0,
        hourlyCount: 0,
        hourlyRevenue: 0,
        overnightCount: 0,
        overnightRevenue: 0,
        multiDayCount: 0,
        multiDayRevenue: 0,
        memberCount: 0,
        nonMemberCount: 0,
        totalDuration: 0,
        paidTransactions: 0
    };
}
