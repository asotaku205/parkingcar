function init() {
    console.log('Arduino Parking Dashboard Initialized');
    
    // Setup tabs first
    setTimeout(() => {
        console.log('Calling setupTabs...');
        setupTabs();
    }, 100);
    
    fetchData();
    setInterval(fetchData, UPDATE_INTERVAL);
    
    setInterval(() => {
        if (!arduinoTime) {
            const now = new Date();
            const timeStr = String(now.getHours()).padStart(2, '0') + ':' + 
                          String(now.getMinutes()).padStart(2, '0') + ':' + 
                          String(now.getSeconds()).padStart(2, '0');
            const dateStr = String(now.getDate()).padStart(2, '0') + '/' + 
                          String(now.getMonth() + 1).padStart(2, '0') + '/' + 
                          now.getFullYear();
            document.getElementById('currentTime').innerHTML = `<i class="far fa-clock"></i> <span>${timeStr}</span>`;
            document.getElementById('currentDate').innerHTML = `<i class="far fa-calendar"></i> <span>${dateStr}</span>`;
        }
    }, 1000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        fetchData();
    }
});
