// GB故障处理平台 - 核心逻辑

// 数据存储
let faults = JSON.parse(localStorage.getItem('gb_faults')) || [];
let currentFilter = 'all';
let searchQuery = '';

// 初始化
function init() {
    renderFaultList();
}

// 生成唯一ID
function generateId() {
    return 'GB' + Date.now().toString(36).toUpperCase();
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 获取状态样式
function getStatusClass(status) {
    const map = {
        '处理中': 'status-processing',
        '待厂家': 'status-waiting',
        '已闭环': 'status-closed'
    };
    return map[status] || 'status-processing';
}

// 获取故障类型样式
function getTypeClass(type) {
    const map = {
        'GPU': 'type-gpu',
        '网卡': 'type-network',
        '电源': 'type-power',
        '内存': 'type-memory',
        '硬盘': 'type-disk',
        '主板': 'type-motherboard',
        '其他': 'type-other'
    };
    return map[type] || 'type-other';
}

// 渲染故障列表
function renderFaultList() {
    const listEl = document.getElementById('faultList');
    let filtered = [...faults];
    
    // 状态筛选
    if (currentFilter !== 'all') {
        filtered = filtered.filter(f => f.status === currentFilter);
    }
    
    // 搜索筛选
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(f => 
            (f.id && f.id.toLowerCase().includes(q)) ||
            (f.cabinetSN && f.cabinetSN.toLowerCase().includes(q)) ||
            (f.faultType && f.faultType.toLowerCase().includes(q)) ||
            (f.faultDetail && f.faultDetail.toLowerCase().includes(q)) ||
            (f.cabinetLocation && f.cabinetLocation.toLowerCase().includes(q))
        );
    }
    
    // 按时间倒序
    filtered.sort((a, b) => new Date(b.customerTime) - new Date(a.customerTime));
    
    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="icon">📋</div>
                <h3>暂无故障记录</h3>
                <p>点击右上角"+ 新增故障"添加第一条记录</p>
            </div>
        `;
        return;
    }
    
    listEl.innerHTML = filtered.map(fault => `
        <div class="fault-card ${getStatusClass(fault.status)}" onclick="showDetail('${fault.id}')">
            <div class="fault-header">
                <span class="fault-id">${fault.id}</span>
                <span class="fault-status ${getStatusClass(fault.status)}">${fault.status}</span>
            </div>
            <span class="fault-type ${getTypeClass(fault.faultType)}">${fault.faultType}</span>
            <div class="fault-location">${fault.cabinetLocation} ${fault.physicalLocation ? '- ' + fault.physicalLocation : ''}</div>
            <div class="fault-detail">${fault.faultDetail || '暂无详情'}</div>
            <div class="fault-footer">
                <span>报修: ${formatDate(fault.customerTime)}</span>
                <div class="fault-actions" onclick="event.stopPropagation()">
                    <button onclick="editFault('${fault.id}')">编辑</button>
                    <button onclick="deleteFault('${fault.id}')">删除</button>
                </div>
            </div>
        </div>
    `).join('');
}

// 筛选状态
function filterByStatus(status) {
    currentFilter = status;
    document.querySelectorAll('.filter-tabs .tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent === (status === 'all' ? '全部' : status)) {
            tab.classList.add('active');
        }
    });
    renderFaultList();
}

// 搜索
function searchFaults() {
    searchQuery = document.getElementById('searchInput').value.trim();
    renderFaultList();
}

// 打开新增弹窗
function openAddModal() {
    document.getElementById('faultForm').reset();
    document.getElementById('faultId').value = '';
    document.getElementById('modalTitle').textContent = '新增故障单';
    document.getElementById('modal').classList.add('active');
}

// 关闭弹窗
function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

// 保存故障
function saveFault(e) {
    e.preventDefault();
    
    const id = document.getElementById('faultId').value || generateId();
    const isEdit = !!document.getElementById('faultId').value;
    
    const fault = {
        id: id,
        customerTime: document.getElementById('customerTime').value,
        vendorTime: document.getElementById('vendorTime').value,
        cabinetLocation: document.getElementById('cabinetLocation').value,
        physicalLocation: document.getElementById('physicalLocation').value,
        cabinetSN: document.getElementById('cabinetSN').value,
        traySN: document.getElementById('traySN').value,
        gpuSN: document.getElementById('gpuSN').value,
        faultType: document.getElementById('faultType').value,
        faultDetail: document.getElementById('faultDetail').value,
        faultProgress: document.getElementById('faultProgress').value,
        status: document.getElementById('status').value,
        closeTime: document.getElementById('closeTime').value,
        createTime: isEdit ? (faults.find(f => f.id === id)?.createTime || new Date().toISOString()) : new Date().toISOString(),
        updateTime: new Date().toISOString()
    };
    
    if (isEdit) {
        const idx = faults.findIndex(f => f.id === id);
        if (idx !== -1) faults[idx] = fault;
    } else {
        faults.push(fault);
    }
    
    saveToStorage();
    closeModal();
    renderFaultList();
}

// 编辑故障
function editFault(id) {
    const fault = faults.find(f => f.id === id);
    if (!fault) return;
    
    document.getElementById('faultId').value = fault.id;
    document.getElementById('customerTime').value = fault.customerTime || '';
    document.getElementById('vendorTime').value = fault.vendorTime || '';
    document.getElementById('cabinetLocation').value = fault.cabinetLocation || '';
    document.getElementById('physicalLocation').value = fault.physicalLocation || '';
    document.getElementById('cabinetSN').value = fault.cabinetSN || '';
    document.getElementById('traySN').value = fault.traySN || '';
    document.getElementById('gpuSN').value = fault.gpuSN || '';
    document.getElementById('faultType').value = fault.faultType || 'GPU';
    document.getElementById('faultDetail').value = fault.faultDetail || '';
    document.getElementById('faultProgress').value = fault.faultProgress || '';
    document.getElementById('status').value = fault.status || '处理中';
    document.getElementById('closeTime').value = fault.closeTime || '';
    
    document.getElementById('modalTitle').textContent = '编辑故障单';
    document.getElementById('modal').classList.add('active');
}

// 删除故障
function deleteFault(id) {
    if (!confirm('确定要删除这条故障记录吗？')) return;
    faults = faults.filter(f => f.id !== id);
    saveToStorage();
    renderFaultList();
}

// 显示详情
function showDetail(id) {
    const fault = faults.find(f => f.id === id);
    if (!fault) return;
    
    document.getElementById('detailContent').innerHTML = `
        <div class="detail-section">
            <div class="detail-row">
                <span class="detail-label">故障单号</span>
                <span class="detail-value">${fault.id}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">处理状态</span>
                <span class="detail-value" style="color: ${fault.status === '已闭环' ? '#34a853' : fault.status === '待厂家' ? '#fbbc04' : '#1a73e8'}">${fault.status}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">故障类型</span>
                <span class="detail-value">${fault.faultType}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">客户报修时间</span>
                <span class="detail-value">${formatDate(fault.customerTime)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">向厂家报修时间</span>
                <span class="detail-value">${formatDate(fault.vendorTime)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">机房机柜位置</span>
                <span class="detail-value">${fault.cabinetLocation || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">物理位置</span>
                <span class="detail-value">${fault.physicalLocation || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">机柜SN</span>
                <span class="detail-value">${fault.cabinetSN || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">托盘SN</span>
                <span class="detail-value">${fault.traySN || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">GPU SN</span>
                <span class="detail-value">${fault.gpuSN || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">闭环时间</span>
                <span class="detail-value">${formatDate(fault.closeTime)}</span>
            </div>
        </div>
        <div class="detail-section">
            <h3>故障详情</h3>
            <div>${fault.faultDetail || '暂无详情'}</div>
        </div>
        <div class="detail-section">
            <h3>处理进展</h3>
            <div>${fault.faultProgress || '暂无进展'}</div>
        </div>
        <div class="form-actions">
            <button class="btn-secondary" onclick="closeDetailModal()">关闭</button>
            <button class="btn-primary" onclick="closeDetailModal(); editFault('${fault.id}')">编辑</button>
        </div>
    `;
    document.getElementById('detailModal').classList.add('active');
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
}

// 统计
function showStats() {
    const total = faults.length;
    const processing = faults.filter(f => f.status === '处理中').length;
    const waiting = faults.filter(f => f.status === '待厂家').length;
    const closed = faults.filter(f => f.status === '已闭环').length;
    
    // 按类型统计
    const typeCount = {};
    faults.forEach(f => {
        typeCount[f.faultType] = (typeCount[f.faultType] || 0) + 1;
    });
    const maxType = Math.max(...Object.values(typeCount), 1);
    
    document.getElementById('statsContent').innerHTML = `
        <div class="stats-grid">
            <div class="stats-card">
                <div class="number">${total}</div>
                <div class="label">故障总数</div>
            </div>
            <div class="stats-card">
                <div class="number" style="color: #1a73e8">${processing}</div>
                <div class="label">处理中</div>
            </div>
            <div class="stats-card">
                <div class="number" style="color: #fbbc04">${waiting}</div>
                <div class="label">待厂家</div>
            </div>
            <div class="stats-card">
                <div class="number" style="color: #34a853">${closed}</div>
                <div class="label">已闭环</div>
            </div>
        </div>
        <div class="stats-chart">
            <h3>故障类型分布</h3>
            ${Object.entries(typeCount).sort((a,b) => b[1] - a[1]).map(([type, count]) => `
                <div class="chart-bar">
                    <span class="chart-label">${type}</span>
                    <div class="chart-progress">
                        <div class="chart-fill" style="width: ${(count/maxType*100).toFixed(1)}%"></div>
                    </div>
                    <span class="chart-count">${count}</span>
                </div>
            `).join('')}
        </div>
    `;
    document.getElementById('statsModal').classList.add('active');
}

function closeStatsModal() {
    document.getElementById('statsModal').classList.remove('active');
}

// 导出Excel
function exportData() {
    if (faults.length === 0) {
        alert('暂无数据可导出');
        return;
    }
    
    const data = faults.map(f => ({
        '客户报修时间': f.customerTime || '',
        '向厂家报修时间': f.vendorTime || '',
        '机房机柜位置': f.cabinetLocation || '',
        '物理位置': f.physicalLocation || '',
        '机柜SN': f.cabinetSN || '',
        '托盘SN': f.traySN || '',
        'GPU SN': f.gpuSN || '',
        '故障类型': f.faultType || '',
        '故障详情': f.faultDetail || '',
        '故障处理进展': f.faultProgress || '',
        '处理状态': f.status || '',
        '闭环时间': f.closeTime || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '故障台账');
    
    // 设置列宽
    const colWidths = {
        'A': 18, 'B': 18, 'C': 14, 'D': 10, 'E': 18,
        'F': 18, 'G': 18, 'H': 10, 'I': 40, 'J': 40,
        'K': 10, 'L': 18
    };
    ws['!cols'] = Object.entries(colWidths).map(([col, width]) => ({ wch: width }));
    
    XLSX.writeFile(wb, `GB故障台账_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// 导入Excel
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet);
            
            if (jsonData.length === 0) {
                alert('文件中没有数据');
                return;
            }
            
            // 转换数据格式
            const imported = jsonData.map(row => ({
                id: generateId(),
                customerTime: row['客户报修时间'] || row['客户报修时间 '] || '',
                vendorTime: row['向厂家报修时间'] || row['向厂家报修时间 '] || '',
                cabinetLocation: row['机房机柜位置'] || row['机房机柜位置 '] || '',
                physicalLocation: row['物理位置'] || row['物理位置 '] || '',
                cabinetSN: row['机柜SN'] || row['机柜SN '] || '',
                traySN: row['托盘SN'] || row['托盘SN '] || '',
                gpuSN: row['GPU SN'] || row['GPU SN '] || '',
                faultType: row['故障类型'] || row['故障类型 '] || '其他',
                faultDetail: row['故障详情'] || row['故障详情 '] || '',
                faultProgress: row['故障处理进展'] || row['故障处理进展 '] || '',
                status: row['处理状态'] || row['处理状态 '] || '处理中',
                closeTime: row['闭环时间'] || row['闭环时间 '] || '',
                createTime: new Date().toISOString(),
                updateTime: new Date().toISOString()
            }));
            
            faults = [...imported, ...faults];
            saveToStorage();
            renderFaultList();
            alert(`成功导入 ${imported.length} 条记录`);
        } catch (err) {
            alert('导入失败：' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

// 保存到本地存储
function saveToStorage() {
    localStorage.setItem('gb_faults', JSON.stringify(faults));
}

// 点击弹窗外部关闭
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// 初始化
init();
