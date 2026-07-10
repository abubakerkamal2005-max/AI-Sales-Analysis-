let charts = {};
window.allDataRecords = []; 
window.columnKeys = {};

async function uploadAndProcessData() {
    const fileInput = document.getElementById('salesFile');
    if (!fileInput.files[0]) { return alert("الرجاء تحديد ملف المبيعات أولاً!"); }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const response = await fetch("http://127.0.0.1:8000/generate_dashboard", { method: "POST", body: formData });
        if (!response.ok) throw new Error("فشل في تحليل الملف عبر السيرفر");

        const data = await response.json();
        if (data.status === "success") {
            window.allDataRecords = data.raw_records;
            window.columnKeys = data.mapped_columns;

            // إظهار العناصر المخفية وتنشيط واجهة المستخدم
            document.getElementById('scoreZone').classList.remove('hidden');
            document.getElementById('filterSection').classList.remove('hidden');
            document.getElementById('dashboardTabs').classList.remove('hidden');
            document.getElementById('mainDashboardView').classList.remove('hidden');
            document.getElementById('healthScore').innerText = data.kpis.health_score + "/100";

            // تعيين حدود النطاق الزمني بناءً على البيانات الفعالة المستلمة
            setupDateFiltersBounds();

            // تعبئة قوائم الفلاتر الجانبية ديناميكياً
            populateSelectOptions('filterCategory', data.filters_options.categories);
            populateSelectOptions('filterCity', data.filters_options.cities);
            populateSelectOptions('filterRep', data.filters_options.reps);

            // حقن البيانات ورسم المخططات أول مرة
            updateUIMetrics(data.kpis);
            buildAIInsights(data.insights);
            renderAllCharts(data.charts);
        }
    } catch (e) { alert(e.message); }
}

function setupDateFiltersBounds() {
    if (!window.columnKeys.date || window.allDataRecords.length === 0) return;
    
    const dateKey = window.columnKeys.date;
    const dates = window.allDataRecords.map(r => r[dateKey]).filter(Boolean).sort();
    
    if (dates.length > 0) {
        const startInput = document.getElementById('filterStartDate');
        const endInput = document.getElementById('filterEndDate');
        
        startInput.min = dates[0];
        startInput.max = dates[dates.length - 1];
        startInput.value = dates[0];
        
        endInput.min = dates[0];
        endInput.max = dates[dates.length - 1];
        endInput.value = dates[dates.length - 1];
    }
}

function updateUIMetrics(kpis) {
    document.getElementById('kpiRevenue').innerText = "$" + kpis.total_revenue.toLocaleString(undefined, {maximumFractionDigits:0});
    document.getElementById('kpiOrders').innerText = kpis.total_orders.toLocaleString();
    document.getElementById('kpiAov').innerText = "$" + kpis.aov.toLocaleString(undefined, {maximumFractionDigits:1});
    
    if (kpis.next_month_forecast) {
        document.getElementById('kpiUnits').innerText = "$" + kpis.next_month_forecast.toLocaleString(undefined, {maximumFractionDigits:0});
    } else {
        document.getElementById('kpiUnits').innerText = kpis.total_units > 0 ? kpis.total_units.toLocaleString() : "N/A";
    }
}

function buildAIInsights(insights) {
    const wrapper = document.getElementById('insightsWrapper');
    wrapper.innerHTML = "";
    insights.forEach(text => {
        const li = document.createElement('li');
        li.innerText = text;
        wrapper.appendChild(li);
    });
}

function populateSelectOptions(elementId, items) {
    const select = document.getElementById(elementId);
    select.innerHTML = `<option value="ALL">كل السجلات المتاحة</option>`;
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item; opt.innerText = item;
        select.appendChild(opt);
    });
}

// 🎛️ محرك الـ Cross-Filtering الفوري والربط الزمني الشامل
function runLocalCrossFiltering() {
    const selectedCat = document.getElementById('filterCategory').value;
    const selectedCity = document.getElementById('filterCity').value;
    const documentRep = document.getElementById('filterRep').value;
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;

    let filtered = [...window.allDataRecords];
    const sCol = window.columnKeys.sales;

    // 1. التصفية بناءً على النطاق الزمني المختار
    if (window.columnKeys.date && startDate && endDate) {
        const dCol = window.columnKeys.date;
        filtered = filtered.filter(r => {
            const rowDate = r[dCol];
            return rowDate >= startDate && rowDate <= endDate;
        });
    }

    // 2. التصفية بناءً على القوائم الجانبية
    if (selectedCat !== "ALL") filtered = filtered.filter(r => String(r[window.columnKeys.category]) === selectedCat);
    if (selectedCity !== "ALL") filtered = filtered.filter(r => String(r[window.columnKeys.city]) === selectedCity);
    if (documentRep !== "ALL") filtered = filtered.filter(r => String(r[window.columnKeys.sales_rep]) === documentRep);

    const totalRev = filtered.reduce((sum, r) => sum + (Number(r[sCol]) || 0), 0);
    const totalOrders = filtered.length;
    const aov = totalOrders > 0 ? totalRev / totalOrders : 0;
    
    updateUIMetrics({ 
        total_revenue: totalRev, 
        total_orders: totalOrders, 
        aov: aov, 
        next_month_forecast: totalRev * 0.15 + (totalRev / max(1, totalOrders))
    });

    rebuildAggregatedCharts(filtered, sCol);
}

function max(a, b) { return a > b ? a : b; }

function rebuildAggregatedCharts(records, salesCol) {
    if (window.columnKeys.category) {
        let catMap = {};
        records.forEach(r => {
            let c = r[window.columnKeys.category];
            catMap[c] = (catMap[c] || 0) + (Number(r[salesCol]) || 0);
        });
        updateChartInstance('category_sales', Object.keys(catMap), Object.values(catMap));
    }
    
    if (window.columnKeys.date) {
        let trendMap = {};
        records.forEach(r => {
            let d = String(r[window.columnKeys.date]).substring(0, 7);
            trendMap[d] = (trendMap[d] || 0) + (Number(r[salesCol]) || 0);
        });
        let sortedMonths = Object.keys(trendMap).sort();
        let sortedValues = sortedMonths.map(m => trendMap[m]);
        updateChartInstance('time_trend', sortedMonths, sortedValues);
    }
}

function updateChartInstance(key, labels, values) {
    if (charts[key]) {
        charts[key].data.labels = labels;
        charts[key].data.datasets[0].data = values;
        charts[key].update();
    }
}

function renderAllCharts(chartData) {
    createChart('chartCategory', 'doughnut', chartData.category_sales, 'مبيعات الفئات', null, 'category_sales');
    createChart('chartTrend', document.getElementById('chartTypeToggle').value, chartData.time_trend, 'تدفق الأداء الإيرادي', '#10b981', 'time_trend');
    createChart('chartTopProducts', 'bar', chartData.top_products, 'أعلى المنتجات طلباً', '#f59e0b', 'top_products');
    createChart('chartBottomProducts', 'bar', chartData.bottom_products, 'أقل المنتجات طلباً', '#f43f5e', 'bottom_products');
}

function createChart(canvasId, type, data, label, color, globalKey) {
    if (!data || !data.labels) return;
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (charts[globalKey]) charts[globalKey].destroy();

    let config = {
        type: type,
        data: {
            labels: data.labels,
            datasets: [{
                label: label, data: data.values,
                backgroundColor: type === 'doughnut' ? ['#f59e0b', '#10b981', '#0ea5e9', '#6366f1', '#ec4899'] : (color || '#f59e0b'),
                borderColor: type === 'doughnut' ? '#090d16' : color, fill: type === 'line', tension: 0.2
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            onClick: (e, activeElements) => {
                if (activeElements.length > 0 && globalKey === 'category_sales') {
                    const elementIndex = activeElements[0].index;
                    const clickedCategory = charts[globalKey].data.labels[elementIndex];
                    const catSelect = document.getElementById('filterCategory');
                    if (catSelect) {
                        catSelect.value = clickedCategory;
                        runLocalCrossFiltering();
                    }
                }
            },
            plugins: { legend: { display: type==='doughnut', labels: { color:'#cbd5e1', font:{family:'Cairo', size:10} } } } 
        }
    };
    charts[globalKey] = new Chart(ctx, config);
}

function switchTab(activeBtnId, sectorIdToShow) {
    ['tabOverviewBtn', 'tabProductsBtn', 'tabInsightsBtn'].forEach(id => document.getElementById(id).classList.remove('tab-active'));
    ['sectorOverview', 'sectorProducts', 'sectorInsights'].forEach(id => document.getElementById(id).classList.add('hidden'));
    
    document.getElementById(activeBtnId).classList.add('tab-active');
    document.getElementById(sectorIdToShow).classList.remove('hidden');
}

// ربط المستمعات والأزرار للفلاتر والنطاق الزمني
document.getElementById('processBtn').addEventListener('click', uploadAndProcessData);
document.getElementById('filterCategory').addEventListener('change', runLocalCrossFiltering);
document.getElementById('filterCity').addEventListener('change', runLocalCrossFiltering);
document.getElementById('filterRep').addEventListener('change', runLocalCrossFiltering);
document.getElementById('filterStartDate').addEventListener('change', runLocalCrossFiltering);
document.getElementById('filterEndDate').addEventListener('change', runLocalCrossFiltering);

document.getElementById('tabOverviewBtn').addEventListener('click', () => switchTab('tabOverviewBtn', 'sectorOverview'));
document.getElementById('tabProductsBtn').addEventListener('click', () => switchTab('tabProductsBtn', 'sectorProducts'));
document.getElementById('tabInsightsBtn').addEventListener('click', () => switchTab('tabInsightsBtn', 'sectorInsights'));

document.getElementById('chartTypeToggle').addEventListener('change', (e) => {
    if(charts['time_trend']) {
        let labels = charts['time_trend'].data.labels;
        let values = charts['time_trend'].data.datasets[0].data;
        createChart('chartTrend', e.target.value, {labels, values}, 'تدفق الأداء الإيرادي', '#10b981', 'time_trend');
    }
});

document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    document.getElementById('filterCategory').value = "ALL";
    document.getElementById('filterCity').value = "ALL";
    document.getElementById('filterRep').value = "ALL";
    setupDateFiltersBounds(); // إعادة تعيين النطاق الزمني الافتراضي
    runLocalCrossFiltering();
});