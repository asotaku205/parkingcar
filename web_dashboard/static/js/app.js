// Arduino Parking System Dashboard - JavaScript

// Config
const API_URL = '/api/data';
const HISTORY_URL = '/api/history';
const UPDATE_INTERVAL = 1000; // Cap nhat moi 1 giay

// State
let totalRevenue = 0;

// Format time
function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('vi-VN');
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('vi-VN');
}

function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes} phút`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}p`;
}

// Update connection status
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    const dot = statusElement.querySelector('.status-dot');
    const text = statusElement.querySelector('.status-text');
    
    if (connected) {
        dot.className = 'status-dot connected';
        text.textContent = 'Đã kết nối';
    } else {
        dot.className = 'status-dot disconnected';
        text.textContent = 'Mất kết nối';
    }
}

// Update stats
function updateStats(data) {
    document.getElementById('totalSlots').textContent = data.totalSlots;
    document.getElementById('availableSlots').textContent = data.availableSlots;
    document.getElementById('occupiedSlots').textContent = data.occupiedSlots;
    document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString('vi-VN');
    
    // Update time
    document.getElementById('currentTime').textContent = data.time || '--:--:--';
    document.getElementById('currentDate').textContent = data.date || '--/--/----';
    
    // Update last update
    if (data.lastUpdate) {
        const lastUpdate = new Date(data.lastUpdate * 1000);
        document.getElementById('lastUpdate').textContent = lastUpdate.toLocaleTimeString('vi-VN');
    }
}

// Update active vehicles
function updateActiveVehicles(vehicles) {
    const container = document.getElementById('activeVehicles');
    const countElement = document.getElementById('activeCount');
    
    countElement.textContent = vehicles.length;
    
    if (vehicles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🅿️</div>
                <p>Chưa có xe đang đỗ</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = vehicles.map(vehicle => {
        const timeIn = formatTime(vehicle.timeIn);
        const duration = formatDuration(vehicle.duration);
        
        return `
            <div class="vehicle-item">
                <div class="vehicle-uid">🚙 ${vehicle.uid}</div>
                <div class="vehicle-time">
                    <span>⏰ ${timeIn}</span>
                    <span class="vehicle-duration">${duration}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Update parking grid
function updateParkingGrid(totalSlots, occupiedSlots) {
    const grid = document.getElementById('parkingGrid');
    grid.innerHTML = '';
    
    for (let i = 1; i <= totalSlots; i++) {
        const isOccupied = i <= occupiedSlots;
        const slot = document.createElement('div');
        slot.className = `parking-slot ${isOccupied ? 'occupied' : 'available'}`;
        slot.innerHTML = `
            <div class="slot-number">Chỗ ${i}</div>
            <div class="slot-icon">${isOccupied ? '🚙' : '🅿️'}</div>
            <div class="slot-status ${isOccupied ? 'occupied' : 'available'}">
                ${isOccupied ? 'Đang đỗ' : 'Trống'}
            </div>
        `;
        grid.appendChild(slot);
    }
}

// Update history table
function updateHistory(history) {
    const tbody = document.getElementById('historyTableBody');
    
    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-history">Chưa có hoạt động nào</td></tr>';
        return;
    }
    
    tbody.innerHTML = history.slice(0, 20).map(event => {
        const time = formatTime(event.timestamp);
        const eventType = event.event === 'ENTRY' ? 'entry' : 'exit';
        const eventLabel = event.event === 'ENTRY' ? 'Xe vào' : 'Xe ra';
        const fee = event.fee > 0 ? `${event.fee.toLocaleString('vi-VN')}` : '-';
        
        return `
            <tr>
                <td>${time}</td>
                <td><span class="event-badge ${eventType}">${eventLabel}</span></td>
                <td><span class="uid-code">${event.uid}</span></td>
                <td><span class="fee-amount">${fee}</span></td>
            </tr>
        `;
    }).join('');
}

// Fetch data from server
async function fetchData() {
    try {
        // Fetch main data
        const dataResponse = await fetch(API_URL);
        if (!dataResponse.ok) throw new Error('Failed to fetch data');
        const data = await dataResponse.json();
        
        updateConnectionStatus(true);
        updateStats(data);
        updateActiveVehicles(data.activeVehicles || []);
        updateParkingGrid(data.totalSlots, data.occupiedSlots);
        
        // Fetch history
        const historyResponse = await fetch(HISTORY_URL);
        if (historyResponse.ok) {
            const history = await historyResponse.json();
            updateHistory(history);
            
            // Calculate total revenue
            totalRevenue = history.reduce((sum, event) => sum + (event.fee || 0), 0);
        }
        
    } catch (error) {
        console.error('Error fetching data:', error);
        updateConnectionStatus(false);
    }
}

// Initialize
function init() {
    console.log('🚗 Arduino Parking Dashboard Initialized');
    
    // Initial fetch
    fetchData();
    
    // Auto update
    setInterval(fetchData, UPDATE_INTERVAL);
    
    // Show current time immediately
    setInterval(() => {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleTimeString('vi-VN');
        document.getElementById('currentDate').textContent = now.toLocaleDateString('vi-VN');
    }, 1000);
}

// Start when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Handle visibility change (pause when tab is hidden)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        fetchData(); // Refresh immediately when tab becomes visible
    }
});
