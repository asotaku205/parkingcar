// Export Excel Functions

// Helper function to format duration with detailed info
function formatDurationDetailed(minutes) {
    if (!minutes || minutes < 1) {
        return '< 1 phút';
    }
    
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;
    
    if (days > 0) {
        // Show detailed: "2 ngày 5 giờ 30 phút"
        let result = `${days} ngày`;
        if (hours > 0) result += ` ${hours} giờ`;
        if (mins > 0) result += ` ${mins} phút`;
        return result;
    } else if (hours > 0) {
        if (mins > 0) {
            return `${hours} giờ ${mins} phút`;
        }
        return `${hours} giờ`;
    } else {
        return `${minutes} phút`;
    }
}

// Export lịch sử hoạt động ra Excel
async function exportHistoryToExcel() {
    try {
        // Fetch history data
        const response = await fetch(HISTORY_URL);
        if (!response.ok) throw new Error('Failed to fetch history');
        const history = await response.json();
        
        if (history.length === 0) {
            alert('Chưa có dữ liệu để xuất!');
            return;
        }
        
        // Prepare data for Excel
        const excelData = history.map(event => {
            const eventDate = new Date(event.timestamp * 1000);
            const time = formatTime(event.timestamp);
            const date = formatDate(event.timestamp);
            const eventType = event.event === 'ENTRY' ? 'Xe vào' : 'Xe ra';
            const duration = event.event === 'EXIT' && event.duration !== undefined 
                ? formatDurationDetailed(event.duration) 
                : '-';
            const fee = event.fee > 0 ? event.fee : '-';
            const isMember = isMemberCard(event.uid) ? 'Thành viên' : 'Khách';
            
            return {
                'Ngày': date,
                'Giờ': time,
                'Loại': eventType,
                'Thẻ RFID': event.uid,
                'Loại thẻ': isMember,
                'Thời gian gửi': duration,
                'Phí (VNĐ)': fee
            };
        });
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 12 },  // Ngày
            { wch: 10 },  // Giờ
            { wch: 10 },  // Loại
            { wch: 18 },  // Thẻ RFID
            { wch: 12 },  // Loại thẻ
            { wch: 15 },  // Thời gian gửi
            { wch: 12 }   // Phí
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Lịch sử hoạt động');
        
        // Generate filename with current date
        const now = new Date();
        const filename = `LichSu_BaiDoXe_${now.getDate()}-${now.getMonth()+1}-${now.getFullYear()}.xlsx`;
        
        // Download file
        XLSX.writeFile(wb, filename);
        
        console.log('Exported history to Excel:', filename);
    } catch (error) {
        console.error('Error exporting history:', error);
        alert('Lỗi khi xuất file Excel! Vui lòng thử lại.');
    }
}

// Export báo cáo doanh thu ra Excel
async function exportRevenueToExcel() {
    try {
        // Fetch history data
        const response = await fetch(HISTORY_URL);
        if (!response.ok) throw new Error('Failed to fetch history');
        const history = await response.json();
        
        if (history.length === 0) {
            alert('Chưa có dữ liệu để xuất!');
            return;
        }
        
        // Calculate statistics
        const today = new Date().setHours(0, 0, 0, 0);
        let stats = {
            totalRevenue: 0,
            todayRevenue: 0,
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
            totalDuration: 0
        };
        
        history.forEach(event => {
            const eventDate = new Date(event.timestamp * 1000);
            
            if (event.event === 'EXIT' && event.fee > 0) {
                stats.totalRevenue += event.fee;
                
                if (eventDate >= today) {
                    stats.todayRevenue += event.fee;
                    stats.todayExit++;
                    stats.totalDuration += event.duration || 0;
                    
                    const isMember = isMemberCard(event.uid);
                    if (isMember) {
                        stats.memberCount++;
                    } else {
                        stats.nonMemberCount++;
                    }
                    
                    const category = categorizeFee(event.duration, event.fee);
                    if (category === 'free') {
                        stats.freeCount++;
                    } else if (category === 'hourly') {
                        stats.hourlyCount++;
                        stats.hourlyRevenue += event.fee;
                    } else if (category === 'overnight') {
                        stats.overnightCount++;
                        stats.overnightRevenue += event.fee;
                    } else if (category === 'multiDay') {
                        stats.multiDayCount++;
                        stats.multiDayRevenue += event.fee;
                    }
                }
            }
            
            if (event.event === 'ENTRY' && eventDate >= today) {
                stats.todayEntry++;
            }
        });
        
        const avgDuration = stats.todayExit > 0 
            ? Math.round(stats.totalDuration / stats.todayExit) 
            : 0;
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Sheet 1: Tổng quan
        const summaryData = [
            ['BÁO CÁO DOANH THU BÃI ĐỖ XE'],
            ['Ngày xuất:', new Date().toLocaleDateString('vi-VN')],
            [''],
            ['TỔNG QUAN HÔM NAY'],
            ['Tổng lượt vào:', stats.todayEntry],
            ['Tổng lượt ra:', stats.todayExit],
            ['Doanh thu hôm nay:', stats.todayRevenue.toLocaleString('vi-VN') + ' đ'],
            ['Thời gian gửi trung bình:', formatDurationDetailed(avgDuration)],
            [''],
            ['PHÂN TÍCH PHÍ'],
            ['Loại phí', 'Số lượt', 'Tổng thu'],
            ['Miễn phí (≤ 1 phút)', stats.freeCount, '0 đ'],
            ['Vé lượt (> 1 phút)', stats.hourlyCount, stats.hourlyRevenue.toLocaleString('vi-VN') + ' đ'],
            ['Qua đêm', stats.overnightCount, stats.overnightRevenue.toLocaleString('vi-VN') + ' đ'],
            ['Nhiều ngày', stats.multiDayCount, stats.multiDayRevenue.toLocaleString('vi-VN') + ' đ'],
            ['TỔNG CỘNG', stats.todayExit, stats.todayRevenue.toLocaleString('vi-VN') + ' đ'],
            [''],
            ['THỐNG KÊ THEO LOẠI THẺ'],
            ['Thành viên:', stats.memberCount],
            ['Khách:', stats.nonMemberCount],
            [''],
            ['TỔNG DOANH THU TẤT CẢ'],
            ['Tổng doanh thu:', stats.totalRevenue.toLocaleString('vi-VN') + ' đ']
        ];
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng quan');
        
        // Sheet 2: Chi tiết lịch sử
        const historyData = history
            .filter(e => e.event === 'EXIT' && e.fee > 0)
            .map(event => {
                const eventDate = new Date(event.timestamp * 1000);
                const time = formatTime(event.timestamp);
                const date = formatDate(event.timestamp);
                const duration = formatDurationDetailed(event.duration || 0);
                const isMember = isMemberCard(event.uid) ? 'Thành viên' : 'Khách';
                
                return {
                    'Ngày': date,
                    'Giờ': time,
                    'Thẻ RFID': event.uid,
                    'Loại thẻ': isMember,
                    'Thời gian gửi': duration,
                    'Phí (VNĐ)': event.fee
                };
            });
        
        const wsHistory = XLSX.utils.json_to_sheet(historyData);
        wsHistory['!cols'] = [
            { wch: 12 },
            { wch: 10 },
            { wch: 18 },
            { wch: 12 },
            { wch: 15 },
            { wch: 12 }
        ];
        XLSX.utils.book_append_sheet(wb, wsHistory, 'Chi tiết');
        
        // Generate filename
        const now = new Date();
        const filename = `BaoCao_DoanhThu_${now.getDate()}-${now.getMonth()+1}-${now.getFullYear()}.xlsx`;
        
        // Download file
        XLSX.writeFile(wb, filename);
        
        console.log('Exported revenue report to Excel:', filename);
    } catch (error) {
        console.error('Error exporting revenue report:', error);
        alert('Lỗi khi xuất báo cáo! Vui lòng thử lại.');
    }
}
