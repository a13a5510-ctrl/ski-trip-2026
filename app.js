// app.js - 2026 日本滑雪戰情室 核心邏輯
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================
// 1. 資料庫服務類別
// ==========================================
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
        const hotelsRef = ref(this.db, 'hotels');
        onValue(hotelsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) callback(data);
        });
    }

    async submitVote(hotelId, change) {
        const hotelRef = ref(this.db, `hotels/${hotelId}`);
        return await update(hotelRef, {
            totalVotes: increment(change)
        });
    }
}

// ==========================================
// 2. 使用者介面管理類別
// ==========================================
class UIManager {
    constructor() {
        this.elements = {
            loginScreen: document.getElementById('login-screen'),
            mainApp: document.getElementById('main-app'),
            greeting: document.getElementById('user-greeting'),
            tokenBalance: document.getElementById('token-balance'),
            hotelsContainer: document.getElementById('hotels-container'),
            timelineContainer: document.querySelector('#tab-timeline .border-l-2'),
            billContainer: document.querySelector('#tab-bill .space-y-4') // 抓取帳單容器
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

    updateTokens(count) {
        this.elements.tokenBalance.innerText = count;
    }

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
                        <p class="text-xs text-gray-500 mb-4"><i class="fa-solid fa-location-dot mr-1"></i>${hotel.distance || hotel.desc || '優質住宿'}</p>
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

    // 🌟 新增：動態渲染 AA 帳單
    renderDynamicBill(topHotel) {
        const flightCost = 15400;
        const liftCost = 4500;
        const transportCost = 2100;
        // 把日幣簡單當作台幣匯率 0.21 換算 (這裡可以自由調整)
        const hotelCostTWD = topHotel ? Math.round(topHotel.price * 0.21) : 0; 
        const total = flightCost + liftCost + transportCost + hotelCostTWD;

        if (this.elements.billContainer) {
            this.elements.billContainer.innerHTML = `
                <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">✈️</span> 機票</div><span class="font-medium dark:text-gray-200">NT$ ${flightCost.toLocaleString()}</span></div>
                <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">🏨</span> 住宿 (${topHotel ? topHotel.name : '未定'})</div><span class="font-medium dark:text-gray-200">NT$ ${hotelCostTWD.toLocaleString()}</span></div>
                <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">🎫</span> 纜車</div><span class="font-medium dark:text-gray-200">NT$ ${liftCost.toLocaleString()}</span></div>
                <div class="flex justify-between items-center"><div class="flex items-center text-gray-600 dark:text-gray-300"><span class="w-8 text-center mr-1">🚌</span> 交通</div><span class="font-medium dark:text-gray-200">NT$ ${transportCost.toLocaleString()}</span></div>
                <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"><div class="flex items-center text-gray-800 dark:text-white font-bold"><span class="w-8 text-center mr-1">💰</span> 總計需匯款</div><span class="font-black text-blue-600 dark:text-blue-400 text-xl">NT$ ${total.toLocaleString()}</span></div>
            `;
        }
        return { flightCost, liftCost, transportCost, hotelCostTWD, total, hotelName: topHotel ? topHotel.name : '未定' };
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
// 3. 系統主程式類別
// ==========================================
class SkiApp {
    constructor() {
        this.state = {
            nickname: "",
            tokens: parseInt(localStorage.getItem('ski_tokens')) || 10,
            myVotes: JSON.parse(localStorage.getItem('ski_my_votes')) || {},
            currentBillData: null // 儲存目前的帳單計算結果
        };
        this.service = new FirebaseService();
        this.ui = new UIManager();
        
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
            
            // 🌟 新增：找出最高票的飯店，並計算動態帳單
            let maxVotes = -1;
            let topHotel = null;
            Object.values(data).forEach(hotel => {
                const votes = hotel.totalVotes || 0;
                if (votes > maxVotes) {
                    maxVotes = votes;
                    topHotel = hotel;
                }
            });
            this.state.currentBillData = this.ui.renderDynamicBill(topHotel);
        });
    }

    async handleVote(id, change) {
        const currentVal = this.state.myVotes[id] || 0;
        if (change < 0 && currentVal === 0) return;
        if (change > 0 && this.state.tokens <= 0) return Swal.fire('籌碼耗盡', '你的雪花幣已用完', 'info');

        this.state.myVotes[id] = currentVal + change;
        this.state.tokens -= change;
        
        // 儲存進 LocalStorage，重整才不會洗掉
        localStorage.setItem('ski_tokens', this.state.tokens);
        localStorage.setItem('ski_my_votes', JSON.stringify(this.state.myVotes));
        
        this.ui.updateTokens(this.state.tokens);

        try {
            await this.service.submitVote(id, change);
        } catch (err) {
            this.state.myVotes[id] = currentVal;
            this.state.tokens += change;
            this.ui.updateTokens(this.state.tokens);
            Swal.fire('斷線', '投票失敗請重試', 'error');
        }
    }

    copyBillMessage() {
        if (!this.state.currentBillData) return;
        const b = this.state.currentBillData;
        const msg = `【${this.state.nickname}的滑雪帳單】\n✈️ 機票：NT$ ${b.flightCost.toLocaleString()}\n🏨 住宿(${b.hotelName})：NT$ ${b.hotelCostTWD.toLocaleString()}\n🎫 纜車：NT$ ${b.liftCost.toLocaleString()}\n🚌 交通：NT$ ${b.transportCost.toLocaleString()}\n💰 總計：NT$ ${b.total.toLocaleString()}\n\n🏦 請匯款至：(代碼 808) 1234-567-890123\n🙏 期待一起滑雪！`;
        
        navigator.clipboard.writeText(msg).then(() => Swal.fire('成功', '動態帳單已複製', 'success'));
    }
}

// ==========================================
// 4. 初始化
// ==========================================
const app = new SkiApp();
window.app = app; 
window.login = () => app.login();
window.switchTab = (id) => app.ui.switchTab(id);
window.toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    document.getElementById('theme-icon').classList.toggle('fa-moon');
    document.getElementById('theme-icon').classList.toggle('fa-sun');
};
window.copyBillMessage = () => app.copyBillMessage();
