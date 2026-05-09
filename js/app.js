// js/app.js - 2026 日本滑雪戰情室 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update, increment, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const urlParams = new URLSearchParams(window.location.search);
const TRIP_ID = urlParams.get('id') || '2026_Japan';
const LIFF_ID = '2009966916-2eO8R7Jn'; 
const getStoreKey = (key) => `${TRIP_ID}_${key}`;

class FirebaseService {
    constructor() {
        const firebaseConfig = { apiKey: "AIzaSyD-mC8R_WvYV_7f2H9u_QyT_XfR-fX_k", authDomain: "ski-dashboard-2026-c146e.firebaseapp.com", databaseURL: "https://ski-dashboard-2026-default-rtdb.firebaseio.com", projectId: "ski-dashboard-2026-c146e" };
        this.db = getDatabase(initializeApp(firebaseConfig));
    }
    listenToHotels(callback) { onValue(ref(this.db, `${TRIP_ID}/hotels`), (s) => callback(s.val() || {})); }
    listenToTimeline(callback) { onValue(ref(this.db, `${TRIP_ID}/timeline`), (s) => callback(s.val() || null)); }
    listenToSettings(callback) { onValue(ref(this.db, `${TRIP_ID}/settings`), (s) => callback(s.val() || {})); }
    listenToCosts(callback) { onValue(ref(this.db, `${TRIP_ID}/costs`), (s) => callback(s.val() || {})); }
    async submitVote(hotelId, change) { return await update(ref(this.db, `${TRIP_ID}/hotels/${hotelId}`), { totalVotes: increment(change) }); }
}

class UIManager {
    constructor() {
        this.elements = {
            loginScreen: document.getElementById('login-screen'), mainApp: document.getElementById('main-app'),
            appHeader: document.getElementById('app-header'), greeting: document.getElementById('user-greeting'), avatar: document.getElementById('user-avatar'),
            tokenBalance: document.getElementById('token-balance'), hotelsContainer: document.getElementById('hotels-container'), 
            timelineContainer: document.querySelector('#tab-timeline .border-l-2'), timelineSubtitle: document.getElementById('timeline-subtitle'),
            billDetails: document.getElementById('bill-details'), peopleCount: document.getElementById('people-count'), chartDom: document.getElementById('voting-chart'),
            countdownBanner: document.getElementById('countdown-banner'), countdownText: document.getElementById('countdown-text'), countdownIcon: document.getElementById('countdown-icon')
        };
        this.chartInstance = null; 
    }

    applyThemeSettings(settings) {
        const eventName = settings.eventName || '專屬旅遊決策室';
        const eventIcon = settings.eventIcon || '✈️';
        const tokenName = settings.tokenName || '代幣';
        document.getElementById('ui-page-title').innerText = eventName; document.getElementById('ui-hero-title').innerText = eventName;
        document.getElementById('ui-hero-icon').innerText = eventIcon; document.querySelectorAll('.ui-token-name').forEach(el => el.innerText = tokenName);
    }

    transitionToApp(profile) {
        this.elements.greeting.innerText = `${profile.displayName}`; 
        if (profile.pictureUrl) { this.elements.avatar.src = profile.pictureUrl; this.elements.avatar.classList.remove('hidden'); }
        this.elements.loginScreen.style.opacity = '0';
        setTimeout(() => { this.elements.loginScreen.style.display = 'none'; this.elements.mainApp.classList.remove('hidden'); }, 300);
    }
    
    updateTokens(count) { this.elements.tokenBalance.innerText = count; }
    toggleChart() {
        const container = document.getElementById('chart-container'); const icon = document.getElementById('chart-toggle-icon');
        if (container.classList.contains('hidden')) { container.classList.remove('hidden'); icon.classList.replace('fa-chevron-down', 'fa-chevron-up'); if (this.chartInstance) setTimeout(() => this.chartInstance.resize(), 100); } 
        else { container.classList.add('hidden'); icon.classList.replace('fa-chevron-up', 'fa-chevron-down'); }
    }

    updateCountdownUI(isClosed, days, hours, mins, secs) {
        this.elements.countdownBanner.classList.remove('hidden');
        if (isClosed) {
            this.elements.countdownBanner.className = "shrink-0 bg-gray-800 text-yellow-400 text-center py-2 text-sm font-bold shadow-md z-10 flex justify-center items-center border-b-2 border-yellow-500";
            this.elements.countdownIcon.className = "fa-solid fa-crown text-lg mr-2";
            this.elements.countdownText.innerText = "🛑 投票已結束，王者已誕生！";
        } else {
            this.elements.countdownBanner.className = "shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-2 text-sm font-bold shadow-md z-10 flex justify-center items-center";
            this.elements.countdownIcon.className = "fa-solid fa-clock mr-2";
            this.elements.countdownText.innerText = `剩餘：${days}天 ${hours}時 ${mins}分 ${secs}秒`;
        }
    }

    renderChart(data, isClosed) { /* 保持不變 */ 
        if (!this.elements.chartDom) return;
        const isDark = document.documentElement.classList.contains('dark'); const textColor = isDark ? '#e5e7eb' : '#374151';
        if (!this.chartInstance) { this.chartInstance = echarts.init(this.elements.chartDom); window.addEventListener('resize', () => this.chartInstance.resize()); }
        const chartData = Object.values(data).filter(h => !h.is_deleted).map(h => ({ name: h.name, value: h.totalVotes || 0 })).sort((a, b) => a.value - b.value);
        const chartColor = isClosed ? ['#ca8a04', '#facc15'] : ['#3b82f6', '#60a5fa'];
        this.chartInstance.setOption({ backgroundColor: 'transparent', grid: { top: 10, bottom: 20, left: 10, right: 30, containLabel: true }, xAxis: { type: 'value', show: false }, yAxis: { type: 'category', data: chartData.map(d => d.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: textColor, width: 100, overflow: 'truncate' } }, series: [{ type: 'bar', data: chartData.map(d => d.value), label: { show: true, position: 'right', color: chartColor[0], fontWeight: 'bold' }, itemStyle: { color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [{ offset: 0, color: chartColor[0] }, { offset: 1, color: chartColor[1] }]), borderRadius: [0, 4, 4, 0] }, barWidth: '50%', realtimeSort: true }], animationDuration: 500, animationEasing: 'cubicOut' });
    }

    renderHotels(data, myVotes, isClosed, topHotelId) { /* 保持不變 */ 
        let html = '';
        Object.entries(data).forEach(([id, hotel]) => {
            if (hotel.is_deleted) return;
            const votes = hotel.totalVotes || 0; const myCount = myVotes[id] || 0;
            const isWinner = isClosed && id === topHotelId; 
            const borderClass = isWinner ? 'border-4 border-yellow-400 shadow-yellow-400/50 shadow-xl' : 'border border-gray-100 dark:border-gray-700 shadow-sm';
            const crownHtml = isWinner ? `<div class="absolute -top-4 -left-4 text-5xl drop-shadow-lg z-10 rotate-[-15deg]">👑</div>` : '';
            const voteBadge = isWinner ? `bg-yellow-500 text-gray-900` : `bg-blue-600 text-white`;
            const voteControlHtml = isClosed ? `<span class="font-bold text-gray-500 text-sm">已封盤 (籌碼: ${myCount})</span>` : `<div class="flex items-center space-x-3"><button onclick="window.app.handleVote('${id}', -1)" class="w-8 h-8 rounded-full bg-white dark:bg-gray-600 border active:scale-90">-</button><span class="font-bold text-blue-600 text-lg w-4 text-center">${myCount}</span><button onclick="window.app.handleVote('${id}', 1)" class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 active:scale-90">+</button></div>`;
            html += `<div class="bg-white dark:bg-gray-800 rounded-2xl relative ${borderClass} overflow-hidden mb-6 transition-all duration-500">${crownHtml}<div class="h-44 relative bg-cover bg-center" style="background-image: url('${hotel.image}');"><div class="absolute bottom-3 right-3 ${voteBadge} text-xs font-bold px-3 py-1 rounded-full shadow-lg">總計 ${votes} 票</div></div><div class="p-4"><div class="flex justify-between items-start mb-1"><h3 class="font-bold text-lg dark:text-white ${isWinner ? 'text-yellow-600 dark:text-yellow-400' : ''}">${hotel.name}</h3><span class="text-red-500 font-bold">¥${hotel.price.toLocaleString()}</span></div><p class="text-xs text-gray-500 mb-3"><i class="fa-solid fa-location-dot mr-1"></i>${hotel.distance || '優質選項'}</p><button onclick="window.viewSpecificTimeline('${id}', '${hotel.name}')" class="w-full mb-3 bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400 py-2 rounded-lg text-sm font-bold border border-blue-100 dark:border-gray-600 hover:bg-blue-100 transition active:scale-95"><i class="fa-regular fa-eye mr-1"></i> 觀看此方案專屬行程</button><div class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-xl"><span class="text-sm font-medium pl-2">投入籌碼：</span>${voteControlHtml}</div></div></div>`;
        });
        if(html === '') html = '<div class="text-center py-10 text-gray-400">目前尚無開放投票的方案</div>';
        this.elements.hotelsContainer.innerHTML = html;
    }

    renderTimeline(itinerary, hotelName) { /* 保持不變 */ 
        this.elements.timelineSubtitle.innerText = hotelName === 'all' ? '(整合版)' : `(${hotelName})`;
        let html = '';
        itinerary.forEach(day => {
            let events = day.events.map(ev => `<div class="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-3 flex items-center transition hover:shadow-md"><div class="w-10 h-10 rounded-lg ${ev.bg} ${ev.color} flex justify-center items-center mr-3 flex-shrink-0"><i class="fa-solid ${ev.icon}"></i></div><div class="flex-1"><div class="font-bold text-sm">${ev.title}</div><div class="text-xs text-gray-500 flex justify-between mt-0.5"><span>${ev.desc}</span><span class="font-bold">${ev.time}</span></div></div></div>`).join('');
            html += `<div class="relative pl-6 mb-8"><div class="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-gray-50 dark:border-gray-900 shadow"></div><h3 class="font-bold text-blue-600 dark:text-blue-400 mb-1 text-lg">Day ${day.day} 行程</h3><p class="text-xs text-gray-400 mb-3">${day.date}</p>${events}</div>`;
        });
        if(html === '') html = '<div class="text-center py-10 text-gray-400">此方案目前尚無專屬行程</div>';
        this.elements.timelineContainer.innerHTML = html;
    }

    renderDynamicBill(topHotel, appState, costsData) { /* 保持不變 */ 
        if (!this.elements.billDetails) return null;
        const rates = { JPY: 1, TWD: 0.21, HKD: 0.05 }; const symbols = { JPY: '¥', TWD: 'NT$', HKD: 'HK$' };
        const rate = rates[appState.currency]; const sym = symbols[appState.currency]; const p = appState.peopleCount;
        const format = (val) => `${sym} ` + Math.round(val * rate).toLocaleString();
        let totalAA = 0; let billHtml = ''; let textBill = []; 
        if (costsData) {
            Object.values(costsData).forEach(cost => {
                const myShare = cost.type === 'shared' ? Math.round(cost.amount / p) : parseInt(cost.amount);
                totalAA += myShare;
                const typeLabel = cost.type === 'shared' ? ' (均攤)' : ' (個人)';
                billHtml += `<div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">${cost.icon}</span> ${cost.name}<span class="text-[10px] text-gray-400 ml-1">${typeLabel}</span></div><span class="font-medium dark:text-gray-200">${format(myShare)}</span></div>`;
                textBill.push(`${cost.icon} ${cost.name}${typeLabel}：${format(myShare)}`);
            });
        }
        const nights = appState.hotelNights || 4;
        const baseHotel = topHotel ? topHotel.price * nights : 0; 
        const hotelAA = Math.round(baseHotel / p);
        totalAA += hotelAA;
        billHtml += `<div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">🏨</span> 住宿 (均攤 ${nights} 晚) <p class="text-[10px] text-blue-500 ml-1 truncate w-24">${topHotel ? topHotel.name : '未定'}</p></div><span class="font-medium dark:text-gray-200">${format(hotelAA)}</span></div>`;
        textBill.push(`🏨 住宿(${topHotel ? topHotel.name : '未定'})：${format(hotelAA)}`);
        billHtml += `<div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"><div class="flex items-center text-gray-800 dark:text-white font-bold"><span class="w-8 text-center mr-1">💰</span> 每人應付總計</div><span class="font-black text-blue-600 dark:text-blue-400 text-xl">${format(totalAA)}</span></div>`;
        this.elements.billDetails.innerHTML = billHtml; this.elements.peopleCount.innerText = p; 
        document.querySelectorAll('.curr-btn').forEach(btn => { btn.className = btn.dataset.curr === appState.currency ? `curr-btn px-3 py-1.5 rounded-md text-xs font-bold transition-colors bg-blue-600 text-white` : `curr-btn px-3 py-1.5 rounded-md text-xs font-bold transition-colors bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300`; }); 
        return { totalAA, rate, sym, textBill };
    }

    switchTab(tabId) {
        ['voting', 'timeline', 'bill'].forEach(id => document.getElementById(`tab-${id}`).classList.add('hidden'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.toggle('text-blue-600', btn.dataset.tab === tabId); btn.classList.toggle('text-gray-400', btn.dataset.tab !== tabId); });
        this.elements.appHeader.style.display = (tabId === 'voting') ? 'block' : 'none';
        if (tabId === 'voting' && this.chartInstance && !document.getElementById('chart-container').classList.contains('hidden')) setTimeout(() => this.chartInstance.resize(), 100);
    }
}

class SkiApp {
    constructor() {
        this.state = {
            lineProfile: null, myVotes: JSON.parse(localStorage.getItem(getStoreKey('my_votes'))) || {},
            topHotelId: null, topHotel: null, currency: 'TWD', peopleCount: 4, currentBillData: null,
            rawTimelineData: null, selectedHotelIdForTimeline: 'all', selectedHotelNameForTimeline: 'all',
            isVotingClosed: false, deadline: null, defaultTokens: 10, tokens: null, winnerId: null,
            eventName: '旅程', tokenName: '代幣', hotelNights: 4, costsData: {} 
        };
        this.service = new FirebaseService();
        this.ui = new UIManager();
        this.timerInterval = null;
        this.validateLicense(); 
    }

    async validateLicense() {
        try {
            const snap = await get(ref(this.service.db, `SYSTEM_LICENSES/${TRIP_ID}`));
            const license = snap.val();

            if (!license || license.status === 'blocked') {
                document.body.innerHTML = '<div style="height:100dvh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#111;color:white;padding:20px;text-align:center;"><i class="fa-solid fa-lock text-6xl text-red-500 mb-4"></i><h1 class="text-2xl font-bold mb-2">授權無效或已被凍結</h1><p class="text-gray-400">請聯繫系統商確認您的金匙狀態。</p></div>';
                return;
            }
            // 🌟 修正點：防止 Date.now() > null 判斷錯誤
            if (license.type === 'rental' && license.expiresAt && Date.now() > license.expiresAt) {
                document.body.innerHTML = '<div style="height:100dvh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#111;color:white;padding:20px;text-align:center;"><i class="fa-solid fa-hourglass-end text-6xl text-orange-500 mb-4"></i><h1 class="text-2xl font-bold mb-2">租賃合約已到期</h1><p class="text-gray-400">此旅遊空間已鎖定，請主辦人續費解鎖。</p></div>';
                return;
            }
            this.initSettingsAndLiff();
        } catch (error) {
            console.error("授權檢測失敗", error);
            if (!navigator.onLine) this.initSettingsAndLiff();
        }
    }

    initSettingsAndLiff() {
        this.service.listenToSettings((settings) => {
            this.ui.applyThemeSettings(settings);
            this.state.deadline = settings.deadline; this.state.defaultTokens = settings.defaultTokens || 10; this.state.winnerId = settings.winnerId || null; 
            this.state.eventName = settings.eventName || '旅程'; this.state.tokenName = settings.tokenName || '代幣';
            this.state.hotelNights = settings.hotelNights || 4; 
            if (!this.state.liffInitialized) { this.state.liffInitialized = true; this.initLiff(); } 
            else if (this.state.lineProfile) { this.handleLineLogin(this.state.lineProfile); }
            this.triggerBillUpdate(); 
        });
    }

    async initLiff() {
        const loadingText = document.getElementById('liff-loading'); const loginBtn = document.getElementById('liff-login-btn');
        const savedProfile = JSON.parse(localStorage.getItem('global_line_profile'));
        if (!navigator.onLine && savedProfile) { this.handleLineLogin(savedProfile); return; }

        try {
            await liff.init({ liffId: LIFF_ID });
            if (liff.isLoggedIn()) { 
                const profile = await liff.getProfile(); 
                localStorage.setItem('global_line_profile', JSON.stringify(profile)); 
                this.handleLineLogin(profile); 
            } else { 
                loadingText.classList.add('hidden'); loginBtn.classList.remove('hidden'); 
                if (savedProfile) { this.handleLineLogin(savedProfile); }
            }
        } catch (err) { if (savedProfile) this.handleLineLogin(savedProfile); }
    }

    // 🌟 核心修正：讓 LINE 登入後記住原本的 TRIP_ID！
    loginWithLine() {
        if (!liff.isLoggedIn()) {
            // 交代 LINE 在登入後要準確送回原本帶 ID 的網址
            const destinationUrl = window.location.href;
            liff.login({ redirectUri: destinationUrl }); 
        }
    }

    handleLineLogin(profile) {
        this.state.lineProfile = profile; this.ui.transitionToApp(profile); 
        if (localStorage.getItem(getStoreKey('tokens')) === null) { this.state.tokens = this.state.defaultTokens; localStorage.setItem(getStoreKey('tokens'), this.state.tokens); } 
        else { this.state.tokens = parseInt(localStorage.getItem(getStoreKey('tokens'))); }
        this.ui.updateTokens(this.state.tokens); this.startCountdownTimer();
        const offHotels = JSON.parse(localStorage.getItem(getStoreKey('offline_hotels'))); if (offHotels) this.processHotelData(offHotels);
        const offCosts = JSON.parse(localStorage.getItem(getStoreKey('offline_costs'))); if (offCosts) { this.state.costsData = offCosts; this.triggerBillUpdate(); }
        this.service.listenToHotels((data) => { localStorage.setItem(getStoreKey('offline_hotels'), JSON.stringify(data)); this.processHotelData(data); });
        this.service.listenToTimeline((data) => { localStorage.setItem(getStoreKey('offline_timeline'), JSON.stringify(data || {})); this.processTimelineData(data); });
        this.service.listenToCosts((data) => { localStorage.setItem(getStoreKey('offline_costs'), JSON.stringify(data)); this.state.costsData = data; this.triggerBillUpdate(); });
    }

    startCountdownTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.state.deadline) { this.ui.elements.countdownBanner.classList.add('hidden'); return; }
            const distance = new Date(this.state.deadline).getTime() - new Date().getTime();
            if (distance < 0 || this.state.winnerId) { 
                if (!this.state.isVotingClosed) { this.state.isVotingClosed = true; this.processHotelData(JSON.parse(localStorage.getItem(getStoreKey('offline_hotels'))) || {}); }
                this.ui.updateCountdownUI(true);
            } else {
                this.state.isVotingClosed = false; const d = Math.floor(distance / (1000 * 60 * 60 * 24)); const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)); const s = Math.floor((distance % (1000 * 60)) / 1000);
                this.ui.updateCountdownUI(false, d, h, m, s);
            }
        }, 1000);
    }

    processHotelData(data) {
        let maxVotes = -1; let calcTopHotel = null; let calcTopId = null;
        Object.entries(data).forEach(([id, hotel]) => { hotel.id = id; if (hotel.is_deleted) return; const votes = hotel.totalVotes || 0; if (votes > maxVotes) { maxVotes = votes; calcTopHotel = hotel; calcTopId = id; } });
        if (this.state.winnerId && data[this.state.winnerId] && !data[this.state.winnerId].is_deleted) { this.state.topHotelId = this.state.winnerId; this.state.topHotel = data[this.state.winnerId]; } else { this.state.topHotelId = calcTopId; this.state.topHotel = calcTopHotel; }
        this.ui.renderHotels(data, this.state.myVotes, this.state.isVotingClosed, this.state.topHotelId); this.ui.renderChart(data, this.state.isVotingClosed); 
        if (this.state.selectedHotelIdForTimeline === 'all' && this.state.topHotel) { this.state.selectedHotelNameForTimeline = this.state.topHotel.name; }
        this.triggerBillUpdate();
    }

    viewSpecificTimeline(hotelId, hotelName) { this.state.selectedHotelIdForTimeline = hotelId; this.state.selectedHotelNameForTimeline = hotelName; this.processTimelineData(this.state.rawTimelineData); this.ui.switchTab('timeline'); }
    processTimelineData(data) { 
        this.state.rawTimelineData = data; if (!data || Object.keys(data).length === 0) { this.ui.elements.timelineContainer.innerHTML = '<div class="text-gray-400 text-center py-10"><i class="fa-solid fa-person-digging text-3xl mb-3 block"></i>管理員尚在安排行程中...</div>'; return; }
        const targetHotelId = this.state.selectedHotelIdForTimeline; const daysMap = {};
        Object.values(data).forEach(ev => {
            if (ev.hotelId && ev.hotelId !== 'all' && ev.hotelId !== targetHotelId) return;
            if (!daysMap[ev.day]) daysMap[ev.day] = { day: ev.day, date: ev.date, events: [] };
            let color = 'text-blue-500'; let bg = 'bg-blue-100 dark:bg-blue-900/30';
            if(ev.icon === 'fa-bus') { color = 'text-green-500'; bg = 'bg-green-100 dark:bg-green-900/30'; } else if(ev.icon === 'fa-hotel') { color = 'text-purple-500'; bg = 'bg-purple-100 dark:bg-purple-900/30'; } else if(ev.icon === 'fa-person-snowboarding') { color = 'text-orange-500'; bg = 'bg-orange-100 dark:bg-orange-900/30'; } else if(ev.icon === 'fa-utensils') { color = 'text-yellow-600'; bg = 'bg-yellow-100 dark:bg-yellow-900/30'; } else if(ev.icon === 'fa-flag') { color = 'text-red-500'; bg = 'bg-red-100 dark:bg-red-900/30'; }
            daysMap[ev.day].events.push({ ...ev, color, bg });
        });
        const itinerary = Object.values(daysMap).sort((a, b) => a.day - b.day); itinerary.forEach(dayObj => dayObj.events.sort((a, b) => a.time.localeCompare(b.time)));
        this.ui.renderTimeline(itinerary, this.state.selectedHotelNameForTimeline);
    }
    setCurrency(curr) { this.state.currency = curr; this.triggerBillUpdate(); }
    changePeople(delta) { const newCount = this.state.peopleCount + delta; if (newCount >= 1 && newCount <= 20) { this.state.peopleCount = newCount; this.triggerBillUpdate(); } }
    triggerBillUpdate() { this.state.currentBillData = this.ui.renderDynamicBill(this.state.topHotel, this.state, this.state.costsData); }

    async handleVote(id, change) {
        if (!navigator.onLine) return Swal.fire('極地狀態', '目前處於離線狀態，無法進行投票喔！', 'warning');
        if (this.state.isVotingClosed) return Swal.fire('封盤', '投票已結束，無法再變更！', 'error');
        const currentVal = this.state.myVotes[id] || 0;
        if (change < 0 && currentVal === 0) return;
        if (change > 0 && this.state.tokens <= 0) return Swal.fire('籌碼耗盡', `你的${this.state.tokenName}已用完`, 'info');
        this.state.myVotes[id] = currentVal + change; this.state.tokens -= change;
        localStorage.setItem(getStoreKey('tokens'), this.state.tokens); localStorage.setItem(getStoreKey('my_votes'), JSON.stringify(this.state.myVotes));
        this.ui.updateTokens(this.state.tokens);
        try { await this.service.submitVote(id, change); } catch (err) { this.state.myVotes[id] = currentVal; this.state.tokens += change; this.ui.updateTokens(this.state.tokens); Swal.fire('斷線', '投票失敗請重試', 'error'); }
    }

    copyBillMessage() { 
        if (!this.state.currentBillData) return;
        const b = this.state.currentBillData; const f = (val) => `${b.sym} ` + Math.round(val * b.rate).toLocaleString();
        const userName = this.state.lineProfile ? this.state.lineProfile.displayName : '旅伴';
        let msg = `【${userName}的${this.state.eventName}帳單 (共 ${this.state.peopleCount} 人分攤)】\n`;
        b.textBill.forEach(line => msg += line + '\n');
        msg += `\n💰 每人應付：${b.sym} ${Math.round(b.totalAA * b.rate).toLocaleString()}\n\n🏦 請匯款至：(代碼 808) 1234-567-890123\n🙏 期待一起出發！`;
        navigator.clipboard.writeText(msg).then(() => Swal.fire('成功', '動態帳單已複製', 'success'));
    }
}

const app = new SkiApp(); window.app = app; 
window.loginWithLine = () => app.loginWithLine(); window.switchTab = (id) => app.ui.switchTab(id); window.toggleChart = () => app.ui.toggleChart(); window.viewSpecificTimeline = (id, name) => app.viewSpecificTimeline(id, name); window.copyBillMessage = () => app.copyBillMessage(); window.toggleDarkMode = () => { document.documentElement.classList.toggle('dark'); document.getElementById('theme-icon').classList.toggle('fa-moon'); document.getElementById('theme-icon').classList.toggle('fa-sun'); if (app.ui.chartInstance) app.processHotelData(JSON.parse(localStorage.getItem(getStoreKey('offline_hotels'))) || {}); };
