// app.js - 2026 日本滑雪戰情室 核心邏輯
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const TRIP_ID = '2026_Japan';

class FirebaseService {
    constructor() {
        const firebaseConfig = {
            apiKey: "AIzaSyD-mC8R_WvYV_7f2H9u_QyT_XfR-fX_k",
            authDomain: "ski-dashboard-2026-c146e.firebaseapp.com",
            databaseURL: "https://ski-dashboard-2026-default-rtdb.firebaseio.com",
            projectId: "ski-dashboard-2026-c146e"
        };
        this.db = getDatabase(initializeApp(firebaseConfig));
    }
    listenToHotels(callback) { onValue(ref(this.db, `${TRIP_ID}/hotels`), (s) => callback(s.val() || {})); }
    listenToTimeline(callback) { onValue(ref(this.db, `${TRIP_ID}/timeline`), (s) => callback(s.val() || null)); }
    async submitVote(hotelId, change) { return await update(ref(this.db, `${TRIP_ID}/hotels/${hotelId}`), { totalVotes: increment(change) }); }
}

class UIManager {
    constructor() {
        this.elements = {
            loginScreen: document.getElementById('login-screen'), mainApp: document.getElementById('main-app'),
            greeting: document.getElementById('user-greeting'), tokenBalance: document.getElementById('token-balance'),
            hotelsContainer: document.getElementById('hotels-container'), timelineContainer: document.querySelector('#tab-timeline .border-l-2'),
            billDetails: document.getElementById('bill-details'), peopleCount: document.getElementById('people-count'), 
            chartDom: document.getElementById('voting-chart'), mapDom: document.getElementById('hotel-map')
        };
        this.chartInstance = null; 
        
        // 🌟 新增地圖實例
        this.mapInstance = null;
        this.mapMarkers = [];
    }

    transitionToApp(name) {
        this.elements.greeting.innerText = `嗨，${name}`; this.elements.loginScreen.style.opacity = '0';
        setTimeout(() => { this.elements.loginScreen.style.display = 'none'; this.elements.mainApp.classList.remove('hidden'); }, 300);
    }
    updateTokens(count) { this.elements.tokenBalance.innerText = count; }

    renderChart(data) {
        if (!this.elements.chartDom) return;
        const isDark = document.documentElement.classList.contains('dark'); const textColor = isDark ? '#e5e7eb' : '#374151';
        if (!this.chartInstance) { this.chartInstance = echarts.init(this.elements.chartDom); window.addEventListener('resize', () => this.chartInstance.resize()); }
        const chartData = Object.values(data).filter(h => !h.is_deleted).map(h => ({ name: h.name, value: h.totalVotes || 0 })).sort((a, b) => a.value - b.value);
        this.chartInstance.setOption({
            backgroundColor: 'transparent', grid: { top: 10, bottom: 20, left: 10, right: 30, containLabel: true },
            xAxis: { type: 'value', show: false },
            yAxis: { type: 'category', data: chartData.map(d => d.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: textColor, width: 100, overflow: 'truncate' } },
            series: [{ type: 'bar', data: chartData.map(d => d.value), label: { show: true, position: 'right', color: '#3b82f6', fontWeight: 'bold' }, itemStyle: { color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#60a5fa' }]), borderRadius: [0, 4, 4, 0] }, barWidth: '50%', realtimeSort: true }],
            animationDuration: 500, animationEasing: 'cubicOut'
        });
    }

    // 🌟 畫出戰略地圖 (終極防禦版：解決灰色破圖問題)
    renderMap(data) {
        if (!this.elements.mapDom) return;
        
        // 1. 初始化地圖
        if (!this.mapInstance) {
            this.mapInstance = L.map('hotel-map').setView([43.06, 141.35], 6);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(this.mapInstance);
        }

        // 2. 清除舊圖釘
        this.mapMarkers.forEach(m => this.mapInstance.removeLayer(m));
        this.mapMarkers = [];

        // 3. 收集座標
        const bounds = [];
        Object.values(data).forEach(hotel => {
            if (hotel.is_deleted || !hotel.lat || !hotel.lng) return;
            const marker = L.marker([hotel.lat, hotel.lng]).addTo(this.mapInstance);
            marker.bindPopup(`<b class="text-blue-600">${hotel.name}</b><br>¥${hotel.price.toLocaleString()}`);
            this.mapMarkers.push(marker);
            bounds.push([hotel.lat, hotel.lng]);
        });

        // 🛡️ 終極時空防禦陣法：
        // 等待 400 毫秒，確保前端的「登入淡出動畫」已經完全結束，
        // 容器有了真實大小後，再叫地圖重新計算並縮放！
        setTimeout(() => {
            this.mapInstance.invalidateSize();
            if (bounds.length > 0) {
                this.mapInstance.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
            }
        }, 400);
    }

    renderHotels(data, myVotes) {
        let html = '';
        Object.entries(data).forEach(([id, hotel]) => {
            if (hotel.is_deleted) return;
            const votes = hotel.totalVotes || 0; const myCount = myVotes[id] || 0;
            html += `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-4">
                    <div class="h-44 relative bg-cover bg-center" style="background-image: url('${hotel.image}');"><div class="absolute bottom-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">總計 ${votes} 票</div></div>
                    <div class="p-4">
                        <div class="flex justify-between items-start mb-1"><h3 class="font-bold text-lg dark:text-white">${hotel.name}</h3><span class="text-red-500 font-bold">¥${hotel.price.toLocaleString()}</span></div>
                        <p class="text-xs text-gray-500 mb-4"><i class="fa-solid fa-location-dot mr-1"></i>${hotel.distance || '優質住宿'}</p>
                        <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-xl"><span class="text-sm font-medium pl-2">投入籌碼：</span><div class="flex items-center space-x-3"><button onclick="window.app.handleVote('${id}', -1)" class="w-8 h-8 rounded-full bg-white dark:bg-gray-600 border active:scale-90">-</button><span class="font-bold text-blue-600 text-lg w-4 text-center">${myCount}</span><button onclick="window.app.handleVote('${id}', 1)" class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 active:scale-90">+</button></div></div>
                    </div>
                </div>`;
        });
        if(html === '') html = '<div class="text-center py-10 text-gray-400">目前尚無開放投票的住宿</div>';
        this.elements.hotelsContainer.innerHTML = html;
    }

    renderTimeline(itinerary) {
        let html = '';
        itinerary.forEach(day => {
            let events = day.events.map(ev => `
                <div class="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-3 flex items-center transition hover:shadow-md">
                    <div class="w-10 h-10 rounded-lg ${ev.bg} ${ev.color} flex justify-center items-center mr-3 flex-shrink-0"><i class="fa-solid ${ev.icon}"></i></div>
                    <div class="flex-1"><div class="font-bold text-sm">${ev.title}</div><div class="text-xs text-gray-500 flex justify-between mt-0.5"><span>${ev.desc}</span><span class="font-bold">${ev.time}</span></div></div>
                </div>
            `).join('');
            html += `<div class="relative pl-6 mb-8"><div class="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-gray-50 dark:border-gray-900 shadow"></div><h3 class="font-bold text-blue-600 dark:text-blue-400 mb-1 text-lg">Day ${day.day} 行程</h3><p class="text-xs text-gray-400 mb-3">${day.date}</p>${events}</div>`;
        });
        this.elements.timelineContainer.innerHTML = html;
    }

    renderDynamicBill(topHotel, appState) {
        if (!this.elements.billDetails) return null;
        const rates = { JPY: 1, TWD: 0.21, HKD: 0.05 }; const symbols = { JPY: '¥', TWD: 'NT$', HKD: 'HK$' };
        const rate = rates[appState.currency]; const sym = symbols[appState.currency]; const p = appState.peopleCount;
        const baseFlight = 75000; const baseLift = 20000; const baseTransport = 60000; const baseHotel = topHotel ? topHotel.price * 4 : 0; 
        const flightAA = baseFlight; const liftAA = baseLift; const transportAA = Math.round(baseTransport / p); const hotelAA = Math.round(baseHotel / p);
        const totalAA = flightAA + liftAA + transportAA + hotelAA;
        const format = (val) => `${sym} ` + Math.round(val * rate).toLocaleString();

        this.elements.billDetails.innerHTML = `
            <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">✈️</span> 機票</div><span class="font-medium dark:text-gray-200">${format(flightAA)}</span></div>
            <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">🎫</span> 纜車</div><span class="font-medium dark:text-gray-200">${format(liftAA)}</span></div>
            <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">🚌</span> 包車 (均攤)</div><span class="font-medium dark:text-gray-200">${format(transportAA)}</span></div>
            <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">🏨</span> 住宿 (均攤) <p class="text-[10px] text-blue-500 ml-1 truncate w-24">${topHotel ? topHotel.name : '未定'}</p></div><span class="font-medium dark:text-gray-200">${format(hotelAA)}</span></div>
            <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"><div class="flex items-center text-gray-800 dark:text-white font-bold"><span class="w-8 text-center mr-1">💰</span> 每人應付總計</div><span class="font-black text-blue-600 dark:text-blue-400 text-xl">${format(totalAA)}</span></div>
        `;
        this.elements.peopleCount.innerText = p;
        document.querySelectorAll('.curr-btn').forEach(btn => { btn.className = btn.dataset.curr === appState.currency ? `curr-btn px-3 py-1.5 rounded-md text-xs font-bold transition-colors bg-blue-600 text-white` : `curr-btn px-3 py-1.5 rounded-md text-xs font-bold transition-colors bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300`; });
        return { flightAA, liftAA, transportAA, hotelAA, totalAA, rate, sym, hotelName: topHotel ? topHotel.name : '未定' };
    }

    // 在 UIManager 裡面替換這個函數
    switchTab(tabId) {
        ['voting', 'timeline', 'bill'].forEach(id => document.getElementById(`tab-${id}`).classList.add('hidden'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.toggle('text-blue-600', btn.dataset.tab === tabId); btn.classList.toggle('text-gray-400', btn.dataset.tab !== tabId); });
        
        // 🌟 強化版：確保切換回投票頁時，地圖與圖表不會破版
        if (tabId === 'voting') {
            if (this.chartInstance) {
                setTimeout(() => this.chartInstance.resize(), 100);
            }
            if (this.mapInstance) {
                // 強制 Leaflet 重新計算容器大小
                setTimeout(() => this.mapInstance.invalidateSize(), 100);
            }
        }
    }
}

class SkiApp {
    constructor() {
        this.state = {
            nickname: localStorage.getItem('ski_username') || "",
            tokens: parseInt(localStorage.getItem('ski_tokens')) || 10,
            myVotes: JSON.parse(localStorage.getItem('ski_my_votes')) || {},
            topHotel: null, currency: 'TWD', peopleCount: 4, currentBillData: null 
        };
        this.service = new FirebaseService();
        this.ui = new UIManager();
        window.addEventListener('DOMContentLoaded', () => { if (this.state.nickname) { document.getElementById('nickname-input').value = this.state.nickname; this.login(); } });
    }

    login() {
        const input = document.getElementById('nickname-input').value.trim();
        if (!input) return Swal.fire('徒兒！', '請輸入暱稱', 'warning');
        
        this.state.nickname = input; localStorage.setItem('ski_username', input);
        this.ui.transitionToApp(input); this.ui.updateTokens(this.state.tokens);
        
        const offHotels = JSON.parse(localStorage.getItem('ski_offline_hotels')); if (offHotels) this.processHotelData(offHotels);
        const offTimeline = JSON.parse(localStorage.getItem('ski_offline_timeline')); if (offTimeline) this.processTimelineData(offTimeline);

        this.service.listenToHotels((data) => { localStorage.setItem('ski_offline_hotels', JSON.stringify(data)); this.processHotelData(data); });
        this.service.listenToTimeline((data) => { localStorage.setItem('ski_offline_timeline', JSON.stringify(data || {})); this.processTimelineData(data); });
    }

    processHotelData(data) {
        this.ui.renderHotels(data, this.state.myVotes); 
        this.ui.renderChart(data); 
        this.ui.renderMap(data); // 🌟 啟動地圖渲染魔法
        
        let maxVotes = -1; this.state.topHotel = null; 
        Object.values(data).forEach(hotel => {
            if (hotel.is_deleted) return;
            const votes = hotel.totalVotes || 0;
            if (votes > maxVotes) { maxVotes = votes; this.state.topHotel = hotel; }
        });
        this.triggerBillUpdate();
    }

    processTimelineData(data) {
        if (!data || Object.keys(data).length === 0) { this.ui.elements.timelineContainer.innerHTML = '<div class="text-gray-400 text-center py-10"><i class="fa-solid fa-person-digging text-3xl mb-3 block"></i>管理員尚在安排行程中...</div>'; return; }
        const daysMap = {};
        Object.values(data).forEach(ev => {
            if (!daysMap[ev.day]) daysMap[ev.day] = { day: ev.day, date: ev.date, events: [] };
            let color = 'text-blue-500'; let bg = 'bg-blue-100 dark:bg-blue-900/30';
            if(ev.icon === 'fa-bus') { color = 'text-green-500'; bg = 'bg-green-100 dark:bg-green-900/30'; }
            else if(ev.icon === 'fa-hotel') { color = 'text-purple-500'; bg = 'bg-purple-100 dark:bg-purple-900/30'; }
            else if(ev.icon === 'fa-person-snowboarding') { color = 'text-orange-500'; bg = 'bg-orange-100 dark:bg-orange-900/30'; }
            else if(ev.icon === 'fa-utensils') { color = 'text-yellow-600'; bg = 'bg-yellow-100 dark:bg-yellow-900/30'; }
            else if(ev.icon === 'fa-flag') { color = 'text-red-500'; bg = 'bg-red-100 dark:bg-red-900/30'; }
            daysMap[ev.day].events.push({ ...ev, color, bg });
        });
        const itinerary = Object.values(daysMap).sort((a, b) => a.day - b.day);
        itinerary.forEach(dayObj => dayObj.events.sort((a, b) => a.time.localeCompare(b.time)));
        this.ui.renderTimeline(itinerary);
    }

    setCurrency(curr) { this.state.currency = curr; this.triggerBillUpdate(); }
    changePeople(delta) { const newCount = this.state.peopleCount + delta; if (newCount >= 1 && newCount <= 20) { this.state.peopleCount = newCount; this.triggerBillUpdate(); } }
    triggerBillUpdate() { this.state.currentBillData = this.ui.renderDynamicBill(this.state.topHotel, this.state); }

    async handleVote(id, change) {
        if (!navigator.onLine) return Swal.fire('極地狀態', '目前處於離線狀態，無法進行投票喔！', 'warning');
        const currentVal = this.state.myVotes[id] || 0;
        if (change < 0 && currentVal === 0) return;
        if (change > 0 && this.state.tokens <= 0) return Swal.fire('籌碼耗盡', '你的雪花幣已用完', 'info');

        this.state.myVotes[id] = currentVal + change; this.state.tokens -= change;
        localStorage.setItem('ski_tokens', this.state.tokens); localStorage.setItem('ski_my_votes', JSON.stringify(this.state.myVotes));
        this.ui.updateTokens(this.state.tokens);
        try { await this.service.submitVote(id, change); } catch (err) { this.state.myVotes[id] = currentVal; this.state.tokens += change; this.ui.updateTokens(this.state.tokens); Swal.fire('斷線', '投票失敗請重試', 'error'); }
    }

    copyBillMessage() {
        if (!this.state.currentBillData) return;
        const b = this.state.currentBillData; const f = (val) => `${b.sym} ` + Math.round(val * b.rate).toLocaleString();
        navigator.clipboard.writeText(`【${this.state.nickname}的滑雪帳單 (共 ${this.state.peopleCount} 人分攤)】\n✈️ 機票：${f(b.flightAA)}\n🎫 纜車：${f(b.liftAA)}\n🚌 包車：${f(b.transportAA)}\n🏨 住宿(${b.hotelName})：${f(b.hotelAA)}\n💰 每人應付：${f(b.totalAA)}\n\n🏦 請匯款至：(代碼 808) 1234-567-890123\n🙏 期待一起滑雪！`).then(() => Swal.fire('成功', '動態帳單已複製', 'success'));
    }
}

const app = new SkiApp(); window.app = app; 
window.login = () => app.login(); window.switchTab = (id) => app.ui.switchTab(id); window.copyBillMessage = () => app.copyBillMessage();
window.toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    document.getElementById('theme-icon').classList.toggle('fa-moon'); document.getElementById('theme-icon').classList.toggle('fa-sun');
    if (app.ui.chartInstance) app.processHotelData(JSON.parse(localStorage.getItem('ski_offline_hotels')));
};
