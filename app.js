// app.js - 2026 日本滑雪戰情室 核心邏輯
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================
// 1. 資料庫服務類別 (FirebaseService)
// 職責：純粹負責「搬運資料」，不處理任何畫面顯示
// ==========================================
class FirebaseService {
    constructor() {
        const firebaseConfig = {
            apiKey: "AIzaSyD-mC8R_WvYV_7f2H9u_QyT_XfR-fX_k",
            authDomain: "ski-dashboard-2026-c146e.firebaseapp.com",
            // 🌟 這裡使用你測試成功的「純淨版」URL (沒有 c146e)
            databaseURL: "https://ski-dashboard-2026-default-rtdb.firebaseio.com",
            projectId: "ski-dashboard-2026-c146e",
            storageBucket: "ski-dashboard-2026-c146e.firebasestorage.app",
            messagingSenderId: "364506305602",
            appId: "1:364506305602:web:9349e54a6136be42858d4e"
        };
        const app = initializeApp(firebaseConfig);
        this.db = getDatabase(app);
    }

    // 監聽飯店變動
    listenToHotels(callback) {
        const hotelsRef = ref(this.db, 'hotels');
        onValue(hotelsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) callback(data);
        });
    }

    // 送出投票
    async submitVote(hotelId, change) {
        const hotelRef = ref(this.db, `hotels/${hotelId}`);
        return await update(hotelRef, {
            totalVotes: increment(change)
        });
    }
}

// ==========================================
// 2. 使用者介面管理類別 (UIManager)
// 職責：純粹負責「畫畫」，把資料變成漂亮的 HTML
// ==========================================
class UIManager {
    constructor() {
        // 預先抓取 HTML 的神位 (ID)，方便之後呼叫
        this.elements = {
            loginScreen: document.getElementById('login-screen'),
            mainApp: document.getElementById('main-app'),
            greeting: document.getElementById('user-greeting'),
            tokenBalance: document.getElementById('token-balance'),
            hotelsContainer: document.getElementById('hotels-container'),
            timelineContainer: document.querySelector('#tab-timeline .border-l-2')
        };
    }

    // 登入後的畫面切換
    transitionToApp(name) {
        this.elements.greeting.innerText = `嗨，${name}`;
        this.elements.loginScreen.style.opacity = '0';
        setTimeout(() => {
            this.elements.loginScreen.style.display = 'none';
            this.elements.mainApp.classList.remove('hidden');
        }, 300);
    }

    // 更新代幣餘額顯示
    updateTokens(count) {
        this.elements.tokenBalance.innerText = count;
    }

    // 顯化飯店卡片
    renderHotels(data, myVotes) {
        let html = '';
        Object.entries(data).forEach(([id, hotel]) => {
            const votes = hotel.totalVotes || 0;
            const myCount = myVotes[id] || 0;
            html += `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-4 transition-all hover:shadow-md">
                    <div class="h-44 relative bg-cover bg-center" style="background-image: url('${hotel.image}');">
                        <div class="absolute bottom-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">總計 ${votes} 票</div>
                    </div>
                    <div class="p-4">
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="font-bold text-lg dark:text-white">${hotel.name}</h3>
                            <span class="text-red-500 font-bold">¥${hotel.price.toLocaleString()}</span>
                        </div>
                        <p class="text-xs text-gray-500 mb-4"><i class="fa-solid fa-location-dot mr-1"></i>${hotel.distance || hotel.desc}</p>
                        <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-xl">
                            <span class="text-sm font-medium pl-2">投入籌碼：</span>
                            <div class="flex items-center space-x-3">
                                <button onclick="window.app.handleVote('${id}', -1)" class="w-8 h-8 rounded-full bg-white dark:bg-gray-600 border flex justify-center items-center active:scale-90">-</button>
                                <span class="font-bold text-blue-600 text-lg w-4 text-center">${myCount}</span>
                                <button onclick="window.app.handleVote('${id}', 1)" class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex justify-center items-center active:scale-90">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        this.elements.hotelsContainer.innerHTML = html;
    }

    // 顯化垂直時間軸
    renderTimeline(itinerary) {
        let html = '';
        itinerary.forEach(day => {
            let events = day.events.map(ev => `
                <div class="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-3 flex items-center">
                    <div class="w-10 h-10 rounded-lg ${ev.bg} ${ev.color} flex justify-center items-center mr-3 flex-shrink-0"><i class="fa-solid ${ev.icon}"></i></div>
                    <div class="flex-1">
                        <div class="font-bold text-sm">${ev.title}</div>
                        <div class="text-xs text-gray-500 flex justify-between mt-0.5"><span>${ev.desc}</span><span>${ev.time}</span></div>
                    </div>
                </div>
            `).join('');

            html += `
                <div class="relative pl-6 mb-8">
                    <div class="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-gray-50 dark:border-gray-900 shadow"></div>
                    <h3 class="font-bold text-blue-600 dark:text-blue-400 mb-1 text-lg">Day ${day.day}：${day.title}</h3>
                    <p class="text-xs text-gray-400 mb-3">${day.date}</p>
                    ${events}
                </div>
            `;
        });
        this.elements.timelineContainer.innerHTML = html;
    }

    // 切換 Tab
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
// 3. 系統主程式類別 (SkiApp)
// 職責：大腦，負責控制狀態與指揮其它組件
// ==========================================
class SkiApp {
    constructor() {
        this.state = {
            nickname: "",
            tokens: 10,
            myVotes: {} // 紀錄自己在每間飯店投了幾票
        };
        
        this.service = new FirebaseService();
        this.ui = new UIManager();
        
        // 固定的行程資料
        this.itinerary = [
            {
                day: 1, title: "啟程與抵達", date: "2026/02/10",
                events: [
                    { time: "08:30", icon: "fa-plane", color: "text-blue-500", bg: "bg-blue-100", title: "星宇航空 JX800", desc: "TPE ➔ NRT" },
                    { time: "17:30", icon: "fa-hotel", color: "text-purple-500", bg: "bg-purple-100", title: "Check-in 住宿", desc: "安頓行李" }
                ]
            },
            {
                day: 2, title: "全日激戰雪場", date: "2026/02/11",
                events: [
                    { time: "09:00", icon: "fa-person-snowboarding", color: "text-orange-500", bg: "bg-orange-100", title: "雪場開滑！", desc: "分組行動" }
                ]
            }
        ];
    }

    // 處理登入
    login() {
        const input = document.getElementById('nickname-input').value.trim();
        if (!input) return Swal.fire('徒兒！', '請輸入暱稱', 'warning');
        
        this.state.nickname = input;
        this.ui.transitionToApp(input);
        this.ui.renderTimeline(this.itinerary); // 登入後順便畫行程表
        
        // 開始監聽資料庫
        this.service.listenToHotels((data) => {
            this.ui.renderHotels(data, this.state.myVotes);
        });
    }

    // 處理投票 (🌟 樂觀 UI 實作)
    async handleVote(id, change) {
        const currentVal = this.state.myVotes[id] || 0;
        
        if (change < 0 && currentVal === 0) return;
        if (change > 0 && this.state.tokens <= 0) return Swal.fire('籌碼耗盡', '你的 10 枚雪花幣已用完', 'info');

        // 1. 先更新本地狀態
        this.state.myVotes[id] = currentVal + change;
        this.state.tokens -= change;
        
        // 2. 立即更新畫面代幣餘額
        this.ui.updateTokens(this.state.tokens);

        // 3. 背景悄悄送給 Firebase
        try {
            await this.service.submitVote(id, change);
        } catch (err) {
            console.error("同步失敗", err);
            // 如果失敗才把代幣還回去 (Rollback)
            this.state.myVotes[id] = currentVal;
            this.state.tokens += change;
            this.ui.updateTokens(this.state.tokens);
        }
    }
}

// ==========================================
// 4. 初始化與全域綁定
// ==========================================
const app = new SkiApp();
window.app = app; // 讓 HTML 的 onclick 可以用 window.app 存取

// 綁定按鈕
window.login = () => app.login();
window.switchTab = (id) => app.ui.switchTab(id);
window.toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    const icon = document.getElementById('theme-icon');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
};
window.copyBillMessage = () => {
    const msg = `【${app.state.nickname}的滑雪帳單】\n總計：NT$ 30,200\n期待與大家一起滑雪！`;
    navigator.clipboard.writeText(msg).then(() => Swal.fire('成功', '訊息已複製', 'success'));
};
