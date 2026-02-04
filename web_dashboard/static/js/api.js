async function fetchData() {
    try {
        const dataResponse = await fetch(API_URL);
        if (!dataResponse.ok) throw new Error('Failed to fetch data');
        const data = await dataResponse.json();
        
        updateConnectionStatus(true);
        updateStats(data);
        updateActiveVehicles(data.activeVehicles || []);
        updateParkingGrid(data.totalSlots, data.occupiedSlots);
        
        const historyResponse = await fetch(HISTORY_URL);
        if (historyResponse.ok) {
            const history = await historyResponse.json();
            updateHistory(history);
            totalRevenue = history.reduce((sum, event) => sum + (event.fee || 0), 0);
        }
        
    } catch (error) {
        console.error('Error fetching data:', error);
        updateConnectionStatus(false);
    }
}
