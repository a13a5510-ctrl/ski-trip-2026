// app.js - 2026 日本滑雪戰情室 核心邏輯
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 🌟 編年史常數同步
const TRIP_ID = '2026_Japan';

class FirebaseService {
    constructor() {
        const firebaseConfig = {
            apiKey: "AIzaSyD-mC8R_WvYV_7f2H9u_QyT_XfR-fX_k",
            authDomain: "ski-dashboard-2026-c146e.firebaseapp.com",
            databaseURL: "https://ski-dashboard-2026-default-rtdb.firebaseio.com",
            projectId: "ski-dashboard-2026-c146e",
            storageBucket: "ski-dashboard-2026-c146e.firebasestorage.app",
            messagingSenderId: "364506305602",
            appId: "1:364506305602:web:9349e54a6136be42858d4e"
        };
        this.db = getDatabase(initializeApp(firebaseConfig));
    }

    listenToHotels(callback) {
        // 🌟 監聽新路徑
        onValue(ref(this.db, `${TRIP_ID}/hotels`), (snapshot) => {
            if (snapshot.val()) callback(snapshot.val());
        });
    }

    async submitVote(hotelId, change) {
        return await update(ref(this.db, `${TRIP_ID}/hotels/${hotelId}`), { totalVotes: increment(change) });
    }
}

class UIManager {
    constructor() {
        this.elements = {
            loginScreen: document.getElementById('login-screen'),
            mainApp: document.getElementById('main-app'),
            greeting: document.getElementById('user-greeting'),
            tokenBalance: document.getElementById('token-balance'),
            hotelsContainer: document.getElementById('hotels-container'),
            timelineContainer: document.querySelector('#tab-timeline .border-l-2'),
            billDetails: document.getElementById('bill-details'),
            peopleCount: document.getElementById('people-count')
        };
    }

    transitionToApp(name) {
        this.elements.greeting.innerText = `嗨，${name}`;
        this.elements.loginScreen.style.opacity = '0';
        setTimeout(() => {
            this.elements.loginScreen.style.display = 'none';
            this.elements.mainApp.classList.remove('hidden');
        }, 300);
    }

    updateTokens(count) { this.elements.tokenBalance.innerText = count; }

    renderHotels(data, myVotes) {
        let html = '';
        Object.entries(data).forEach(([id, hotel]) => {
            // 🛡️ 防禦陣法：如果這家飯店被標記為隱藏，直接跳過不畫它！
            if (hotel.is_deleted) return;

            const votes = hotel.totalVotes || 0;
            const myCount = myVotes[id] || 0;
            html += `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-4">
                    <div class="h-44 relative bg-cover bg-center" style="background-image: url('${hotel.image}');">
                        <div class="absolute bottom-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">總計 ${votes} 票</div>
                    </div>
                    <div class="p-4">
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="font-bold text-lg dark:text-white">${hotel.name}</h3>
                            <span class="text-red-500 font-bold">¥${hotel.price.toLocaleString()}</span>
                        </div>
                        <p class="text-xs text-gray-500 mb-4"><i class="fa-solid fa-location-dot mr-1"></i>${hotel.distance || '優質住宿'}</p>
                        <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-xl">
                            <span class="text-sm font-medium pl-2">投入籌碼：</span>
                            <div class="flex items-center space-x-3">
                                <button onclick="window.app.handleVote('${id}', -1)" class="w-8 h-8 rounded-full bg-white dark:bg-gray-600 border active:scale-90">-</button>
                                <span class="font-bold text-blue-600 text-lg w-4 text-center">${myCount}</span>
                                <button onclick="window.app.handleVote('${id}', 1)" class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 active:scale-90">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // 如果全部都被刪除了，給個提示
        if(html === '') html = '<div class="text-center py-10 text-gray-400">目前尚無開放投票的住宿</div>';
        this.elements.hotelsContainer.innerHTML = html;
    }

    renderTimeline(itinerary) {
        let html = '';
        itinerary.forEach(day => {
            let events = day.events.map(ev => `
                <div class="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-3 flex items-center">
                    <div class="w-10 h-10 rounded-lg ${ev.bg} ${ev.color} flex justify-center items-center mr-3"><i class="fa-solid ${ev.icon}"></i></div>
                    <div class="flex-1"><div class="font-bold text-sm">${ev.title}</div><div class="text-xs text-gray-500 flex justify-between mt-0.5"><span>${ev.desc}</span><span>${ev.time}</span></div></div>
                </div>
            `).join('');
            html += `
                <div class="relative pl-6 mb-8">
                    <div class="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-gray-50 dark:border-gray-900"></div>
                    <h3 class="font-bold text-blue-600 dark:text-blue-400 mb-1 text-lg">Day ${day.day}：${day.title}</h3>
                    <p class="text-xs text-gray-400 mb-3">${day.date}</p>
                    ${events}
                </div>
            `;
        });
        this.elements.timelineContainer.innerHTML = html;
    }

    renderDynamicBill(topHotel, appState) {
        if (!this.elements.billDetails) return null;

        const rates = { JPY: 1, TWD: 0.21, HKD: 0.05 };
        const symbols = { JPY: '¥', TWD: 'NT$', HKD: 'HK$' };
        const rate = rates[appState.currency];
        const sym = symbols[appState.currency];
        const p = appState.peopleCount;

        const baseFlight = 75000; 
        const baseLift = 20000;   
        const baseTransport = 60000; 
        const baseHotel = topHotel ? topHotel.price * 4 : 0; 

        const flightAA = baseFlight;
        const liftAA = baseLift;
        const transportAA = Math.round(baseTransport / p);
        const hotelAA = Math.round(baseHotel / p);
        const totalAA = flightAA + liftAA + transportAA + hotelAA;

        const format = (val) => `${sym} ` + Math.round(val * rate).toLocaleString();

        this.elements.billDetails.innerHTML = `
            <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">✈️</span> 機票 (個人)</div><span class="font-medium dark:text-gray-200">${format(flightAA)}</span></div>
            <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">🎫</span> 纜車 (個人)</div><span class="font-medium dark:text-gray-200">${format(liftAA)}</span></div>
            <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">🚌</span> 包車 (均攤)</div><span class="font-medium dark:text-gray-200">${format(transportAA)}</span></div>
            <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">🏨</span> 住宿 (均攤) <p class="text-[10px] text-blue-500 ml-1 truncate w-24">最高票: ${topHotel ? topHotel.name : '未定'}</p></div><span class="font-medium dark:text-gray-200">${format(hotelAA)}</span></div>
            <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"><div class="flex items-center text-gray-800 dark:text-white font-bold"><span class="w-8 text-center mr-1">💰</span> 每人應付總計</div><span class="font-black text-blue-600 dark:text-blue-400 text-xl">${format(totalAA)}</span></div>
        `;

        this.elements.peopleCount.innerText = p;
        document.querySelectorAll('.curr-btn').forEach(btn => {
            btn.className = btn.dataset.curr === appState.currency 
                ? `curr-btn px-3 py-1.5 rounded-md text-xs font-bold transition-colors bg-blue-600 text-white`
                : `curr-btn px-3 py-1.5 rounded-md text-xs font-bold transition-colors bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300`;
        });

        return { flightAA, liftAA, transportAA, hotelAA, totalAA, rate, sym, hotelName: topHotel ? topHotel.name : '未定' };
    }

    switchTab(tabId) {
        ['voting', 'timeline', 'bill'].forEach(id => document.getElementById(`tab-${id}`).classList.add('hidden'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('text-blue-600', btn.dataset.tab === tabId);
            btn.classList.toggle('text-gray-400', btn.dataset.tab !== tabId);
        });
    }
}

// ==========================================
// 3. 系統主程式類別 (升級版：極地求生與自動登入)
// ==========================================
class SkiApp {
    constructor() {
        this.state = {
            // 🌟 1. 喚醒記憶：嘗試從 LocalStorage 讀取上次的暱稱
            nickname: localStorage.getItem('ski_username') || "",
            tokens: parseInt(localStorage.getItem('ski_tokens')) || 10,
            myVotes: JSON.parse(localStorage.getItem('ski_my_votes')) || {},
            topHotel: null,
            currency: 'TWD',
            peopleCount: 4, 
            currentBillData: null 
        };
        this.service = new FirebaseService();
        this.ui = new UIManager();
        this.itinerary = [
            { day: 1, title: "啟程與抵達", date: "2026/02/10", events: [ { time: "08:30", icon: "fa-plane", color: "text-blue-500", bg: "bg-blue-100", title: "星宇航空 JX800", desc: "TPE ➔ NRT" } ] }
        ];

        // 🌟 2. 自動登入陣法：如果已經有名字，網頁載入時自動通關！
        window.addEventListener('DOMContentLoaded', () => {
            if (this.state.nickname) {
                document.getElementById('nickname-input').value = this.state.nickname;
                this.login();
            }
        });
    }

    login() {
        const input = document.getElementById('nickname-input').value.trim();
        if (!input) return Swal.fire('徒兒！', '請輸入暱稱', 'warning');
        
        this.state.nickname = input;
        localStorage.setItem('ski_username', input); // 🌟 存下名字，下次免登入

        this.ui.transitionToApp(input);
        this.ui.renderTimeline(this.itinerary);
        this.ui.updateTokens(this.state.tokens);
        
        // 🌟 3. 極地求生術 (Offline First)：先撈出「戰備儲糧」畫畫面！
        const offlineHotels = JSON.parse(localStorage.getItem('ski_offline_hotels'));
        if (offlineHotels) {
            console.log("🟢 偵測到本機戰備儲糧，先行載入離線飯店資料！");
            this.processHotelData(offlineHotels);
        }

        // 監聽資料庫 (如果有網路，這裡抓到的新資料會瞬間「覆蓋」舊資料)
        this.service.listenToHotels((data) => {
            // 🌟 4. 每次拿到最新鮮的雲端資料，就更新進「戰備儲糧」中
            localStorage.setItem('ski_offline_hotels', JSON.stringify(data));
            this.processHotelData(data);
        });
    }

    // 🌟 將資料處理邏輯獨立出來，方便離線/連線時共用呼叫
    processHotelData(data) {
        this.ui.renderHotels(data, this.state.myVotes);
        
        let maxVotes = -1;
        this.state.topHotel = null; 
        Object.values(data).forEach(hotel => {
            if (hotel.is_deleted) return; // 隱藏封印的飯店
            const votes = hotel.totalVotes || 0;
            if (votes > maxVotes) { maxVotes = votes; this.state.topHotel = hotel; }
        });
        this.triggerBillUpdate();
    }

    setCurrency(curr) { this.state.currency = curr; this.triggerBillUpdate(); }
    
    changePeople(delta) {
        const newCount = this.state.peopleCount + delta;
        if (newCount >= 1 && newCount <= 20) { this.state.peopleCount = newCount; this.triggerBillUpdate(); }
    }
    
    triggerBillUpdate() { this.state.currentBillData = this.ui.renderDynamicBill(this.state.topHotel, this.state); }

    async handleVote(id, change) {
        // 🌟 5. 斷網防呆：如果目前沒網路，禁止投票並跳出提示
        if (!navigator.onLine) {
            return Swal.fire('極地狀態', '目前處於離線狀態，無法進行投票喔！', 'warning');
        }

        const currentVal = this.state.myVotes[id] || 0;
        if (change < 0 && currentVal === 0) return;
        if (change > 0 && this.state.tokens <= 0) return Swal.fire('籌碼耗盡', '你的雪花幣已用完', 'info');

        this.state.myVotes[id] = currentVal + change;
        this.state.tokens -= change;
        localStorage.setItem('ski_tokens', this.state.tokens);
        localStorage.setItem('ski_my_votes', JSON.stringify(this.state.myVotes));
        this.ui.updateTokens(this.state.tokens);

        try { await this.service.submitVote(id, change); } 
        catch (err) {
            this.state.myVotes[id] = currentVal; this.state.tokens += change;
            this.ui.updateTokens(this.state.tokens);
            Swal.fire('斷線', '投票失敗請重試', 'error');
        }
    }

    copyBillMessage() {
        if (!this.state.currentBillData) return;
        const b = this.state.currentBillData;
        const f = (val) => `${b.sym} ` + Math.round(val * b.rate).toLocaleString();
        const msg = `【${this.state.nickname}的滑雪帳單 (共 ${this.state.peopleCount} 人分攤)】\n✈️ 機票：${f(b.flightAA)}\n🎫 纜車：${f(b.liftAA)}\n🚌 包車：${f(b.transportAA)}\n🏨 住宿(${b.hotelName})：${f(b.hotelAA)}\n💰 每人應付：${f(b.totalAA)}\n\n🏦 請匯款至：(代碼 808) 1234-567-890123\n🙏 期待一起滑雪！`;
        navigator.clipboard.writeText(msg).then(() => Swal.fire('成功', '動態帳單已複製', 'success'));
    }
}

const app = new SkiApp();
window.app = app; 
window.login = () => app.login();
window.switchTab = (id) => app.ui.switchTab(id);
window.copyBillMessage = () => app.copyBillMessage();
window.toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    document.getElementById('theme-icon').classList.toggle('fa-moon');
    document.getElementById('theme-icon').classList.toggle('fa-sun');
};
