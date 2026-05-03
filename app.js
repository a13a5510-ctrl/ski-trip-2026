// app.js - 2026 日本滑雪戰情室 核心邏輯
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
        const app = initializeApp(firebaseConfig);
        this.db = getDatabase(app);
    }

    listenToHotels(callback) {
        onValue(ref(this.db, 'hotels'), (snapshot) => {
            if (snapshot.val()) callback(snapshot.val());
        });
    }

    async submitVote(hotelId, change) {
        return await update(ref(this.db, `hotels/${hotelId}`), { totalVotes: increment(change) });
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

    // 🌟 第九卷：財務總管的動態結算陣法
    renderDynamicBill(topHotel, appState) {
        if (!this.elements.billDetails) return null;

        // 1. 匯率與符號設定
        const rates = { JPY: 1, TWD: 0.21, HKD: 0.05 };
        const symbols = { JPY: '¥', TWD: 'NT$', HKD: 'HK$' };
        const rate = rates[appState.currency];
        const sym = symbols[appState.currency];
        const p = appState.peopleCount;

        // 2. 底層基礎花費 (全部假定以 JPY 日幣為基準)
        const baseFlight = 75000; // 機票：每人費用
        const baseLift = 20000;   // 纜車：每人費用
        const baseTransport = 60000; // 包車接駁：團體總費用 (均攤)
        // 住宿：假設 topHotel.price 是「一間房每晚」的價錢，我們抓 4 晚的團體總價來均攤
        const baseHotel = topHotel ? topHotel.price * 4 : 0; 

        // 3. 計算個人 AA 應付額 (日幣)
        const flightAA = baseFlight;
        const liftAA = baseLift;
        const transportAA = Math.round(baseTransport / p);
        const hotelAA = Math.round(baseHotel / p);
        const totalAA = flightAA + liftAA + transportAA + hotelAA;

        // 4. 轉換器：將日幣轉換為選擇的幣值並加上千分位逗號
        const format = (val) => `${sym} ` + Math.round(val * rate).toLocaleString();

        // 5. 渲染畫面
        this.elements.billDetails.innerHTML = `
            <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">✈️</span> 機票 (個人)</div><span class="font-medium dark:text-gray-200">${format(flightAA)}</span></div>
            <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">🎫</span> 纜車 (個人)</div><span class="font-medium dark:text-gray-200">${format(liftAA)}</span></div>
            <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">🚌</span> 包車 (均攤)</div><span class="font-medium dark:text-gray-200">${format(transportAA)}</span></div>
            <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">🏨</span> 住宿 (均攤) <p class="text-[10px] text-blue-500 ml-1 truncate w-24">最高票: ${topHotel ? topHotel.name : '未定'}</p></div><span class="font-medium dark:text-gray-200">${format(hotelAA)}</span></div>
            <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"><div class="flex items-center text-gray-800 dark:text-white font-bold"><span class="w-8 text-center mr-1">💰</span> 每人應付總計</div><span class="font-black text-blue-600 dark:text-blue-400 text-xl">${format(totalAA)}</span></div>
        `;

        // 6. 更新 UI 按鈕狀態
        this.elements.peopleCount.innerText = p;
        document.querySelectorAll('.curr-btn').forEach(btn => {
            if (btn.dataset.curr === appState.currency) {
                btn.className = `curr-btn px-3 py-1.5 rounded-md text-xs font-bold transition-colors bg-blue-600 text-white`;
            } else {
                btn.className = `curr-btn px-3 py-1.5 rounded-md text-xs font-bold transition-colors bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300`;
            }
        });

        // 回傳給系統大腦，方便後續「複製」使用
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

class SkiApp {
    constructor() {
        this.state = {
            nickname: "",
            tokens: parseInt(localStorage.getItem('ski_tokens')) || 10,
            myVotes: JSON.parse(localStorage.getItem('ski_my_votes')) || {},
            topHotel: null, // 儲存目前的最高票飯店
            currency: 'TWD', // 預設幣值
            peopleCount: 4,  // 預設人數 4 人
            currentBillData: null 
        };
        this.service = new FirebaseService();
        this.ui = new UIManager();
        this.itinerary = [
            { day: 1, title: "啟程與抵達", date: "2026/02/10", events: [ { time: "08:30", icon: "fa-plane", color: "text-blue-500", bg: "bg-blue-100", title: "星宇航空 JX800", desc: "TPE ➔ NRT" } ] }
        ];
    }

    login() {
        const input = document.getElementById('nickname-input').value.trim();
        if (!input) return Swal.fire('徒兒！', '請輸入暱稱', 'warning');
        
        this.state.nickname = input;
        this.ui.transitionToApp(input);
        this.ui.renderTimeline(this.itinerary);
        this.ui.updateTokens(this.state.tokens);
        
        // 監聽資料庫
        this.service.listenToHotels((data) => {
            this.ui.renderHotels(data, this.state.myVotes);
            
            // 找出最高票飯店並觸發結算
            let maxVotes = -1;
            Object.values(data).forEach(hotel => {
                const votes = hotel.totalVotes || 0;
                if (votes > maxVotes) { maxVotes = votes; this.state.topHotel = hotel; }
            });
            this.triggerBillUpdate();
        });
    }

    // 🌟 改變幣值
    setCurrency(curr) {
        this.state.currency = curr;
        this.triggerBillUpdate();
    }

    // 🌟 改變人數 (防呆：最少 1 人，最多 20 人)
    changePeople(delta) {
        const newCount = this.state.peopleCount + delta;
        if (newCount >= 1 && newCount <= 20) {
            this.state.peopleCount = newCount;
            this.triggerBillUpdate();
        }
    }

    // 🌟 觸發帳單重繪
    triggerBillUpdate() {
        this.state.currentBillData = this.ui.renderDynamicBill(this.state.topHotel, this.state);
    }

    async handleVote(id, change) {
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
        
        // 複製的訊息會自動帶入人數與當前幣值！
        const msg = `【${this.state.nickname}的滑雪帳單 (共 ${this.state.peopleCount} 人分攤)】\n✈️ 機票：${f(b.flightAA)}\n🎫 纜車：${f(b.liftAA)}\n🚌 包車：${f(b.transportAA)}\n🏨 住宿(${b.hotelName})：${f(b.hotelAA)}\n💰 每人應付：${f(b.totalAA)}\n\n🏦 請匯款至：(代碼 808) 1234-567-890123\n🙏 期待一起滑雪！`;
        
        navigator.clipboard.writeText(msg).then(() => Swal.fire('成功', '動態帳單已複製！請去 LINE 貼上', 'success'));
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
