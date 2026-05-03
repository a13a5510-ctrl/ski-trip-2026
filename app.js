// app.js - 2026 日本滑雪戰情室 核心邏輯
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const TRIP_ID = '2026_Japan';
const LIFF_ID = '2009966916-2eO8R7Jn'; 

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
            appHeader: document.getElementById('app-header'), // 🌟 Req 3
            greeting: document.getElementById('user-greeting'), avatar: document.getElementById('user-avatar'),
            tokenBalance: document.getElementById('token-balance'), hotelsContainer: document.getElementById('hotels-container'), 
            timelineContainer: document.querySelector('#tab-timeline .border-l-2'), timelineSubtitle: document.getElementById('timeline-subtitle'),
            billDetails: document.getElementById('bill-details'), peopleCount: document.getElementById('people-count'), 
            chartDom: document.getElementById('voting-chart')
        };
        this.chartInstance = null; 
    }

    transitionToApp(profile) {
        this.elements.greeting.innerText = `${profile.displayName}`; 
        if (profile.pictureUrl) { this.elements.avatar.src = profile.pictureUrl; this.elements.avatar.classList.remove('hidden'); }
        this.elements.loginScreen.style.opacity = '0';
        setTimeout(() => { this.elements.loginScreen.style.display = 'none'; this.elements.mainApp.classList.remove('hidden'); }, 300);
    }
    updateTokens(count) { this.elements.tokenBalance.innerText = count; }

    // 🌟 Req 1: 圖表收合魔法
    toggleChart() {
        const container = document.getElementById('chart-container');
        const icon = document.getElementById('chart-toggle-icon');
        if (container.classList.contains('hidden')) {
            container.classList.remove('hidden');
            icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
            if (this.chartInstance) setTimeout(() => this.chartInstance.resize(), 100);
        } else {
            container.classList.add('hidden');
            icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        }
    }

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
                        <p class="text-xs text-gray-500 mb-3"><i class="fa-solid fa-location-dot mr-1"></i>${hotel.distance || '優質住宿'}</p>
                        
                        <button onclick="window.viewSpecificTimeline('${id}', '${hotel.name}')" class="w-full mb-3 bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400 py-2 rounded-lg text-sm font-bold border border-blue-100 dark:border-gray-600 hover:bg-blue-100 transition active:scale-95"><i class="fa-regular fa-eye mr-1"></i> 觀看此住宿專屬行程</button>

                        <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-xl"><span class="text-sm font-medium pl-2">投入籌碼：</span><div class="flex items-center space-x-3"><button onclick="window.app.handleVote('${id}', -1)" class="w-8 h-8 rounded-full bg-white dark:bg-gray-600 border active:scale-90">-</button><span class="font-bold text-blue-600 text-lg w-4 text-center">${myCount}</span><button onclick="window.app.handleVote('${id}', 1)" class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 active:scale-90">+</button></div></div>
                    </div>
                </div>`;
        });
        if(html === '') html = '<div class="text-center py-10 text-gray-400">目前尚無開放投票的住宿</div>';
        this.elements.hotelsContainer.innerHTML = html;
    }

    renderTimeline(itinerary, hotelName) {
        // 顯示目前過濾的飯店名稱
        this.elements.timelineSubtitle.innerText = hotelName === 'all' ? '(整合版)' : `(${hotelName})`;
        
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
        if(html === '') html = '<div class="text-center py-10 text-gray-400">此住宿目前尚無專屬行程</div>';
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

    switchTab(tabId) {
        ['voting', 'timeline', 'bill'].forEach(id => document.getElementById(`tab-${id}`).classList.add('hidden'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => { 
            btn.classList.toggle('text-blue-600', btn.dataset.tab === tabId); 
            btn.classList.toggle('text-gray-400', btn.dataset.tab !== tabId); 
        });
        
        // 🌟 Req 3: 隱藏非首頁的 Header，騰出更多空間給行程和帳單
        this.elements.appHeader.style.display = (tabId === 'voting') ? 'block' : 'none';

        if (tabId === 'voting') {
            if (this.chartInstance && !document.getElementById('chart-container').classList.contains('hidden')) {
                setTimeout(() => this.chartInstance.resize(), 100);
            }
        }
    }
}

class SkiApp {
    constructor() {
        this.state = {
            lineProfile: null, 
            tokens: parseInt(localStorage.getItem('ski_tokens')) || 10,
            myVotes: JSON.parse(localStorage.getItem('ski_my_votes')) || {},
            topHotel: null, currency: 'TWD', peopleCount: 4, currentBillData: null,
            
            // 🌟 Req 4: 狀態庫新增紀錄
            rawTimelineData: null,
            selectedHotelIdForTimeline: 'all',
            selectedHotelNameForTimeline: 'all'
        };
        this.service = new FirebaseService();
        this.ui = new UIManager();
        this.initLiff();
    }

    async initLiff() {
        const loadingText = document.getElementById('liff-loading');
        const loginBtn = document.getElementById('liff-login-btn');
        const savedProfile = JSON.parse(localStorage.getItem('ski_line_profile'));
        if (!navigator.onLine && savedProfile) { this.handleLineLogin(savedProfile); return; }

        try {
            await liff.init({ liffId: LIFF_ID });
            if (liff.isLoggedIn()) {
                const profile = await liff.getProfile();
                localStorage.setItem('ski_line_profile', JSON.stringify(profile));
                this.handleLineLogin(profile);
            } else {
                loadingText.classList.add('hidden'); loginBtn.classList.remove('hidden');
            }
        } catch (err) {
            loadingText.innerText = "連線異常，請重新整理";
            if (savedProfile) this.handleLineLogin(savedProfile);
        }
    }

    loginWithLine() { if (!liff.isLoggedIn()) liff.login(); }

    handleLineLogin(profile) {
        this.state.lineProfile = profile;
        this.ui.transitionToApp(profile); this.ui.updateTokens(this.state.tokens);
        const offHotels = JSON.parse(localStorage.getItem('ski_offline_hotels')); if (offHotels) this.processHotelData(offHotels);
        const offTimeline = JSON.parse(localStorage.getItem('ski_offline_timeline')); if (offTimeline) this.processTimelineData(offTimeline);

        this.service.listenToHotels((data) => { localStorage.setItem('ski_offline_hotels', JSON.stringify(data)); this.processHotelData(data); });
        this.service.listenToTimeline((data) => { localStorage.setItem('ski_offline_timeline', JSON.stringify(data || {})); this.processTimelineData(data); });
    }

    processHotelData(data) {
        this.ui.renderHotels(data, this.state.myVotes); 
        this.ui.renderChart(data); 
        let maxVotes = -1; this.state.topHotel = null; 
        Object.entries(data).forEach(([id, hotel]) => {
            hotel.id = id; // 綁定 ID 以便後續讀取
            if (hotel.is_deleted) return;
            const votes = hotel.totalVotes || 0;
            if (votes > maxVotes) { maxVotes = votes; this.state.topHotel = hotel; }
        });
        
        // 如果目前沒有點擊特定的飯店行程，預設追蹤最高票的飯店
        if (this.state.selectedHotelIdForTimeline === 'all' && this.state.topHotel) {
            this.state.selectedHotelNameForTimeline = this.state.topHotel.name;
        }

        this.triggerBillUpdate();
    }

    // 🌟 Req 4: 點擊按鈕時觸發的過濾陣法
    viewSpecificTimeline(hotelId, hotelName) {
        this.state.selectedHotelIdForTimeline = hotelId;
        this.state.selectedHotelNameForTimeline = hotelName;
        this.processTimelineData(this.state.rawTimelineData); // 重新過濾渲染
        this.ui.switchTab('timeline'); // 自動跳轉頁籤
    }

    processTimelineData(data) {
        this.state.rawTimelineData = data; // 存下原始資料
        if (!data || Object.keys(data).length === 0) { this.ui.elements.timelineContainer.innerHTML = '<div class="text-gray-400 text-center py-10"><i class="fa-solid fa-person-digging text-3xl mb-3 block"></i>管理員尚在安排行程中...</div>'; return; }
        
        const targetHotelId = this.state.selectedHotelIdForTimeline;
        const daysMap = {};
        
        Object.values(data).forEach(ev => {
            // 🌟 核心過濾邏輯：只抓「沒有綁定(舊資料)」、「綁定為all共用」、「綁定符合目前點擊的飯店」
            if (ev.hotelId && ev.hotelId !== 'all' && ev.hotelId !== targetHotelId) return;

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
        
        this.ui.renderTimeline(itinerary, this.state.selectedHotelNameForTimeline);
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
        const userName = this.state.lineProfile ? this.state.lineProfile.displayName : '雪友';
        navigator.clipboard.writeText(`【${userName}的滑雪帳單 (共 ${this.state.peopleCount} 人分攤)】\n✈️ 機票：${f(b.flightAA)}\n🎫 纜車：${f(b.liftAA)}\n🚌 包車：${f(b.transportAA)}\n🏨 住宿(${b.hotelName})：${f(b.hotelAA)}\n💰 每人應付：${f(b.totalAA)}\n\n🏦 請匯款至：(代碼 808) 1234-567-890123\n🙏 期待一起滑雪！`).then(() => Swal.fire('成功', '動態帳單已複製', 'success'));
    }
}

const app = new SkiApp(); window.app = app; 
window.loginWithLine = () => app.loginWithLine(); 
window.switchTab = (id) => app.ui.switchTab(id); 
window.toggleChart = () => app.ui.toggleChart();
window.viewSpecificTimeline = (id, name) => app.viewSpecificTimeline(id, name);
window.copyBillMessage = () => app.copyBillMessage();
window.toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    document.getElementById('theme-icon').classList.toggle('fa-moon'); document.getElementById('theme-icon').classList.toggle('fa-sun');
    if (app.ui.chartInstance) app.processHotelData(JSON.parse(localStorage.getItem('ski_offline_hotels')));
};
