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

function updateStats(data) {
    document.getElementById('totalSlots').textContent = data.totalSlots;
    document.getElementById('availableSlots').textContent = data.availableSlots;
    document.getElementById('occupiedSlots').textContent = data.occupiedSlots;
    document.getElementById('totalRevenue').textContent = todayRevenue.toLocaleString('vi-VN');
    
    document.getElementById('quickOccupied').textContent = data.occupiedSlots;
    document.getElementById('quickRevenue').textContent = todayRevenue.toLocaleString('vi-VN') + ' đ';
    
    if (data.time && data.date) {
        arduinoTime = parseArduinoTime(data.time, data.date);
    }
    
    document.getElementById('currentTime').innerHTML = `<i class="far fa-clock"></i> <span>${data.time || '--:--:--'}</span>`;
    document.getElementById('currentDate').innerHTML = `<i class="far fa-calendar"></i> <span>${data.date || '--/--/----'}</span>`;
    
    if (data.lastUpdate) {
        const lastUpdate = new Date(data.lastUpdate * 1000);
        const timeStr = formatTime(Math.floor(lastUpdate.getTime() / 1000));
        document.getElementById('lastUpdate').textContent = timeStr;
    }
}

function updateActiveVehicles(vehicles) {
    const container = document.getElementById('activeVehicles');
    const countElement = document.getElementById('activeCount');
    
    countElement.textContent = vehicles.length;
    
    if (vehicles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p><i class="fas fa-inbox"></i> Chưa có xe đang đỗ</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = vehicles.map(vehicle => {
        const timeIn = formatTime(vehicle.timeIn);
        const isMember = isMemberCard(vehicle.uid);
        const memberBadge = isMember 
            ? '<span class="badge badge-member"><i class="fas fa-star"></i> Thành viên</span>'
            : '<span class="badge badge-guest"><i class="fas fa-user"></i> Khách</span>';
        
        return `
            <div class="vehicle-item">
                <div class="vehicle-header">
                    <div class="vehicle-uid"><i class="fas fa-id-card"></i> ${vehicle.uid}</div>
                    <div class="vehicle-badges">${memberBadge}</div>
                </div>
                <div class="vehicle-time-info">
                    <span class="vehicle-time-in"><i class="fas fa-sign-in-alt"></i> Giờ vào: ${timeIn}</span>
                </div>
            </div>
        `;
    }).join('');
}

function updateParkingGrid(totalSlots, occupiedSlots) {
    const grid = document.getElementById('parkingGrid');
    grid.innerHTML = '';
    
    for (let i = 1; i <= totalSlots; i++) {
        const isOccupied = i <= occupiedSlots;
        const slot = document.createElement('div');
        slot.className = `parking-slot ${isOccupied ? 'occupied' : 'available'}`;
        slot.innerHTML = `
            <div class="slot-number">Chỗ ${i}</div>
            <div class="slot-icon"><i class="fas ${isOccupied ? 'fa-car' : 'fa-square'}"></i></div>
            <div class="slot-status ${isOccupied ? 'occupied' : 'available'}">
                ${isOccupied ? 'Đang đỗ' : 'Trống'}
            </div>
        `;
        grid.appendChild(slot);
    }
}

function updateHistory(history) {
    const tbody = document.getElementById('historyTableBody');
    
    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-history"><i class="fas fa-inbox"></i> Chưa có hoạt động nào</td></tr>';
        return;
    }
    
    // Use arduinoTime if available, otherwise use current date
    let currentDate;
    if (arduinoTime) {
        const date = new Date(arduinoTime * 1000);
        currentDate = date.toLocaleDateString('vi-VN');
    } else {
        currentDate = new Date().toLocaleDateString('vi-VN');
    }
    
    if (currentDate !== todayDate) {
        todayDate = currentDate;
        todayRevenue = 0;
        resetRevenueStats();
    }
    
    todayRevenue = 0;
    resetRevenueStats();
    
    // Calculate today's start timestamp using arduinoTime
    let today;
    if (arduinoTime) {
        const date = new Date(arduinoTime * 1000);
        today = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    } else {
        today = new Date().setHours(0, 0, 0, 0);
    }
    
    tbody.innerHTML = history.slice(0, 20).map(event => {
        const eventDate = new Date(event.timestamp * 1000);
        const time = formatTime(event.timestamp);
        
        const eventType = event.event === 'ENTRY' ? 'entry' : 'exit';
        const eventLabel = event.event === 'ENTRY' ? '<i class="fas fa-sign-in-alt"></i> Xe vào' : '<i class="fas fa-sign-out-alt"></i> Xe ra';
        
        let duration = '-';
        if (event.event === 'EXIT' && event.duration !== undefined) {
            duration = formatDuration(event.duration);
            
            if (eventDate >= today) {
                revenueStats.todayExit++;
                revenueStats.totalDuration += event.duration;
                
                const category = categorizeFee(event.duration, event.fee);
                
                // Check if member card (3 thẻ thành viên: 13 B1, F0 50, B4 FF)
                const isMember = isMemberCard(event.uid);
                
                if (isMember) {
                    revenueStats.memberCount++;
                } else {
                    revenueStats.nonMemberCount++;
                }
                
                if (category === 'free') {
                    revenueStats.freeCount++;
                } else if (category === 'hourly') {
                    revenueStats.hourlyCount++;
                    revenueStats.hourlyRevenue += event.fee;
                } else if (category === 'overnight') {
                    revenueStats.overnightCount++;
                    revenueStats.overnightRevenue += event.fee;
                } else if (category === 'multiDay') {
                    revenueStats.multiDayCount++;
                    revenueStats.multiDayRevenue += event.fee;
                }
                
                if (event.fee > 0) {
                    revenueStats.paidTransactions++;
                }
            }
        }
        
        if (event.event === 'ENTRY' && eventDate >= today) {
            revenueStats.todayEntry++;
        }
        
        if (eventDate >= today && event.fee > 0) {
            todayRevenue += event.fee;
        }
        
        const fee = event.fee > 0 ? `${event.fee.toLocaleString('vi-VN')} VNĐ` : '-';
        
        return `
            <tr>
                <td>${time}</td>
                <td><span class="event-badge ${eventType}">${eventLabel}</span></td>
                <td><span class="uid-code">${event.uid}</span></td>
                <td>${duration}</td>
                <td><span class="fee-amount">${fee}</span></td>
            </tr>
        `;
    }).join('');
    
    updateRevenueTab();
}

function updateRevenueTab() {
    document.getElementById('revToday').textContent = todayRevenue.toLocaleString('vi-VN') + ' đ';
    document.getElementById('totalEntryToday').textContent = revenueStats.todayEntry;
    document.getElementById('totalExitToday').textContent = revenueStats.todayExit;
    
    const avgDuration = revenueStats.todayExit > 0 
        ? Math.round(revenueStats.totalDuration / revenueStats.todayExit) 
        : 0;
    document.getElementById('avgDuration').textContent = formatDuration(avgDuration);
    
    document.getElementById('freeParkingCount').textContent = revenueStats.freeCount;
    document.getElementById('firstHourCount').textContent = revenueStats.hourlyCount;
    document.getElementById('firstHourRevenue').textContent = revenueStats.hourlyRevenue.toLocaleString('vi-VN') + ' đ';
    document.getElementById('additionalHourCount').textContent = revenueStats.overnightCount + revenueStats.multiDayCount;
    document.getElementById('additionalHourRevenue').textContent = (revenueStats.overnightRevenue + revenueStats.multiDayRevenue).toLocaleString('vi-VN') + ' đ';
    
    document.getElementById('memberCount').textContent = revenueStats.memberCount;
    document.getElementById('nonMemberCount').textContent = revenueStats.nonMemberCount;
    
    const totalTransactions = revenueStats.freeCount + revenueStats.hourlyCount + revenueStats.overnightCount + revenueStats.multiDayCount;
    document.getElementById('totalTransactions').textContent = totalTransactions;
    document.getElementById('totalRevenueBreakdown').textContent = todayRevenue.toLocaleString('vi-VN') + ' đ';
    
    if (totalTransactions > 0) {
        const freePercent = Math.round((revenueStats.freeCount / totalTransactions) * 100);
        const hourlyPercent = Math.round((revenueStats.hourlyCount / totalTransactions) * 100);
        const longPercent = Math.round(((revenueStats.overnightCount + revenueStats.multiDayCount) / totalTransactions) * 100);
        
        document.getElementById('freePercentage').textContent = freePercent + '%';
        document.getElementById('firstHourPercentage').textContent = hourlyPercent + '%';
        document.getElementById('additionalPercentage').textContent = longPercent + '%';
        
        document.getElementById('freeBar').style.width = freePercent + '%';
        document.getElementById('firstHourBar').style.width = hourlyPercent + '%';
        document.getElementById('additionalBar').style.width = longPercent + '%';
    } else {
        document.getElementById('freePercentage').textContent = '0%';
        document.getElementById('firstHourPercentage').textContent = '0%';
        document.getElementById('additionalPercentage').textContent = '0%';
        
        document.getElementById('freeBar').style.width = '0%';
        document.getElementById('firstHourBar').style.width = '0%';
        document.getElementById('additionalBar').style.width = '0%';
    }
}

function setupTabs() {
    try {
        console.log('=== Setting up tabs ===');
        
        // Sidebar navigation
        const navItems = document.querySelectorAll('.nav-item');
        const tabContents = document.querySelectorAll('.tab-content');
        
        console.log('Nav items found:', navItems.length);
        console.log('Tab contents found:', tabContents.length);
        
        if (navItems.length === 0) {
            console.error('ERROR: No nav items found!');
            return;
        }
        
        if (tabContents.length === 0) {
            console.error('ERROR: No tab contents found!');
            return;
        }
        
        navItems.forEach((item, index) => {
            const tabName = item.getAttribute('data-tab');
            console.log(`Adding listener to nav item ${index}: ${tabName}`);
            
            item.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('=== Tab clicked:', tabName, '===');
                
                // Update active nav item
                navItems.forEach(nav => {
                    nav.classList.remove('active');
                });
                item.classList.add('active');
                console.log('Nav item activated');
                
                // Update active tab content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                });
                
                const targetTab = document.getElementById(`${tabName}-tab`);
                if (targetTab) {
                    targetTab.classList.add('active');
                    console.log('Tab content activated:', tabName);
                } else {
                    console.error('ERROR: Tab not found:', `${tabName}-tab`);
                }
                
                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) {
                        sidebar.classList.remove('active');
                    }
                }
            });
        });
        
        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        
        if (menuToggle && sidebar) {
            console.log('Setting up mobile menu toggle');
            menuToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                sidebar.classList.toggle('active');
                console.log('Sidebar toggled');
            });
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768 && sidebar) {
                const menuToggle = document.getElementById('menuToggle');
                if (!sidebar.contains(e.target) && (!menuToggle || !menuToggle.contains(e.target))) {
                    sidebar.classList.remove('active');
                }
            }
        });
        
        console.log('=== Tabs setup complete ===');
    } catch (error) {
        console.error('ERROR in setupTabs:', error);
    }
}
