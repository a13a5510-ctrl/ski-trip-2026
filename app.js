// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================
// 1. 資料庫服務類別 (Data Access Object)
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
            else console.error("雲端路徑錯誤或資料是空的！");
        });
    }

    async submitVote(hotelId, change) {
        const updates = {};
        updates[`hotels/${hotelId}/totalVotes`] = increment(change);
        return await update(ref(this.db), updates);
    }
}

// ==========================================
// 2. 使用者介面管理類別 (View Controller)
// ==========================================
class UIManager {
    constructor() {
        this.htmlElements = {
            loginScreen: document.getElementById('login-screen'),
            mainApp: document.getElementById('main-app'),
            userGreeting: document.getElementById('user-greeting'),
            tokenBalance: document.getElementById('token-balance'),
            hotelsContainer: document.getElementById('hotels-container')
        };
    }

    transitionToMainApp(nickname) {
        this.htmlElements.userGreeting.innerText = `嗨，${nickname}`;
        this.htmlElements.loginScreen.style.opacity = '0';
        setTimeout(() => {
            this.htmlElements.loginScreen.style.display = 'none';
            this.htmlElements.mainApp.classList.remove('hidden');
        }, 300);
    }

    updateTokenDisplay(tokens) {
        this.htmlElements.tokenBalance.innerText = tokens;
    }

    renderHotels(hotelsData, myVotesState) {
        let htmlStr = '';
        for (const [key, hotel] of Object.entries(hotelsData)) {
            const totalVotes = hotel.totalVotes || 0;
            const myVoteCount = myVotesState[key] || 0;
            const description = hotel.desc || hotel.distance || '精選推薦住宿';
            const tag = hotel.tags ? hotel.tags[0] : '精選';

            htmlStr += `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-4 transition-all hover:shadow-md">
                    <div class="h-44 relative bg-cover bg-center" style="background-image: url('${hotel.image || 'https://via.placeholder.com/400x200'}');">
                        <div class="absolute top-3 left-3 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">${tag}</div>
                        <div class="absolute bottom-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">總票數: ${totalVotes} 票</div>
                    </div>
                    <div class="p-4">
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="font-bold text-lg dark:text-white">${hotel.name}</h3>
                            <span class="text-red-500 dark:text-red-400 font-bold">¥${hotel.price ? hotel.price.toLocaleString() : '---'}<span class="text-xs text-gray-400 dark:text-gray-500 font-normal"> /晚</span></span>
                        </div>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4"><i class="fa-solid fa-location-dot mr-1"></i>${description}</p>
                        
                        <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-xl">
                            <span class="text-sm font-medium text-gray-600 dark:text-gray-300 pl-2">投入籌碼：</span>
                            <div class="flex items-center space-x-3 pr-1">
                                <button onclick="window.app.vote('${key}', -1)" class="w-9 h-9 rounded-full bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-600 dark:text-gray-200 shadow-sm flex justify-center items-center active:scale-90 transition-transform"><i class="fa-solid fa-minus text-sm"></i></button>
                                <span class="font-bold text-blue-600 dark:text-blue-400 w-5 text-center text-lg">${myVoteCount}</span>
                                <button onclick="window.app.vote('${key}', 1)" class="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 shadow-sm flex justify-center items-center active:scale-90 transition-transform"><i class="fa-solid fa-plus text-sm"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        this.htmlElements.hotelsContainer.innerHTML = htmlStr;
    }

// 渲染垂直行程表
    renderTimeline(scheduleData) {
        // 抓取我們在 HTML 中預留的時間軸容器
        const container = document.querySelector('#tab-timeline .border-l-2');
        if (!container) return; 
        
        let htmlStr = '';

        scheduleData.forEach(day => {
            let eventsHtml = '';
            // 迴圈渲染當天的每一個小行程
            day.events.forEach(ev => {
                eventsHtml += `
                    <div class="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-3 flex items-center transition-transform active:scale-95 hover:shadow-md">
                        <div class="w-10 h-10 rounded-lg ${ev.bg} ${ev.color} flex justify-center items-center mr-3 flex-shrink-0">
                            <i class="fa-solid ${ev.icon}"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-sm dark:text-gray-100">${ev.title}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-0.5">
                                <span>${ev.desc}</span>
                                <span class="font-semibold text-gray-700 dark:text-gray-300">${ev.time}</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            // 組合當天的外框與標題 (帶有時間軸圓點)
            htmlStr += `
                <div class="relative pl-6 mb-8">
                    <div class="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-gray-50 dark:border-gray-900 shadow"></div>
                    <h3 class="font-bold text-blue-600 dark:text-blue-400 mb-1 text-lg">Day ${day.day}：${day.title}</h3>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mb-3">${day.date}</p>
                    ${eventsHtml}
                </div>
            `;
        });

        container.innerHTML = htmlStr;
    }    
    
    switchTab(tabId) {
        ['voting', 'timeline', 'bill'].forEach(id => {
            document.getElementById(`tab-${id}`).classList.add('hidden');
        });
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');

        document.querySelectorAll('.nav-btn').forEach(btn => {
            if(btn.dataset.tab === tabId) {
                btn.className = `nav-btn flex flex-col items-center flex-1 py-1 rounded-lg active:bg-gray-100 dark:active:bg-gray-700 transition-colors text-blue-600 dark:text-blue-400`;
            } else {
                btn.className = `nav-btn flex flex-col items-center flex-1 py-1 rounded-lg active:bg-gray-100 dark:active:bg-gray-700 transition-colors text-gray-400 dark:text-gray-500`;
            }
        });
    }

    toggleDarkMode() {
        const html = document.documentElement;
        const icon = document.getElementById('theme-icon');
        if (html.classList.contains('dark')) {
            html.classList.remove('dark');
            icon.classList.replace('fa-sun', 'fa-moon');
        } else {
            html.classList.add('dark');
            icon.classList.replace('fa-moon', 'fa-sun');
        }
    }
}

// ==========================================
// 3. 系統主程式類別 (Main Application)
// ==========================================
class SkiApp {
    constructor() {
        this.state = {
            nickname: "",
            totalTokens: 10,
            myVotes: {} 
        };
        this.db = new FirebaseService();
        this.ui = new UIManager();
    }

    login() {
        const input = document.getElementById('nickname-input').value.trim();
        if(!input) {
            Swal.fire({ icon: 'error', title: '徒兒...', text: '名字要打啊！' });
            return;
        }
        this.state.nickname = input;
        this.ui.transitionToMainApp(this.state.nickname);
        
        this.db.listenToHotels((data) => {
            console.log("從雲端抓到的飯店資料：", data);
            this.ui.renderHotels(data, this.state.myVotes);
        });
    }

    // 處理投票邏輯 (終極絲滑版：解決 Race Condition 吃幣問題)
    async vote(itemId, change) {
        let myCurrentVotes = this.state.myVotes[itemId] || 0;
        
        // 防呆機制 1：不能扣成負的
        if (change < 0 && myCurrentVotes === 0) return; 
        
        // 防呆機制 2：代幣用光
        if (change > 0 && this.state.totalTokens === 0) {
            Swal.fire({ icon: 'warning', title: '籌碼耗盡', text: '你的 10 枚雪花幣已經用完啦！', timer: 1500 });
            return;
        }

        // 🌟 關鍵修正：先更新本地狀態！(這叫做 Optimistic Update)
        // 讓本地端的陣列先 +1，這樣等一下 Firebase 叫我們重畫畫面時，數字才會是對的
        this.state.myVotes[itemId] = myCurrentVotes + change;
        this.state.totalTokens -= change;
        
        // 立即更新畫面上方的代幣餘額
        this.ui.updateTokenDisplay(this.state.totalTokens);

        try {
            // 背景默默傳送給 Firebase
            await this.db.submitVote(itemId, change);
        } catch (error) {
            // 🛡️ 防禦機制 (Rollback)：如果真的遇到網路斷線，要把剛剛扣的代幣「還給」使用者
            console.error("投票失敗:", error);
            this.state.myVotes[itemId] = myCurrentVotes;
            this.state.totalTokens += change;
            this.ui.updateTokenDisplay(this.state.totalTokens);
            
            // 並且手動觸發一次重新渲染，把畫面上的票數扣回來 (若有需要)
            // this.db.listenToHotels 會自動處理這部分，或者可以手動調用
            Swal.fire({ icon: 'error', title: '斷線啦', text: '網路不穩，投票失敗，請重試！' });
        }
    }

    copyBillMessage() {
        const msg = `【${this.state.nickname || '雪友'}的滑雪帳單】\n✈️ 機票：$15,400\n🏨 住宿：$8,200\n🎫 纜車：$4,500\n🚌 交通：$2,100\n💰 總計：NT$ 30,200\n\n🏦 請匯款至：(代碼 808) 1234-567-890123\n🙏 感謝大德，期待一起滑雪！`;
        navigator.clipboard.writeText(msg).then(() => {
            Swal.fire({ icon: 'success', title: '複製成功！', text: '快去 LINE 群組貼上討債吧！', timer: 2000 });
        }).catch(err => {
            Swal.fire({ icon: 'error', title: '複製失敗', text: '請手動複製。' });
        });
    }
}

// ==========================================
// 4. 系統初始化與 HTML 事件綁定
// ==========================================
const app = new SkiApp();
window.app = app; 

window.login = () => app.login();
window.switchTab = (tabId) => app.ui.switchTab(tabId);
window.toggleDarkMode = () => app.ui.toggleDarkMode();
window.copyBillMessage = () => app.copyBillMessage();
