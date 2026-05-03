// admin.js - 後台管理邏輯
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class AdminPanel {
    constructor() {
        // 使用我們確認過的純淨版 Firebase 設定
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
        
        // 啟動密碼驗證
        this.verifyAdmin();
    }

    // 簡單的密碼鎖 (防君子不防駭客，但對我們的專案夠用了)
    async verifyAdmin() {
        const { value: password } = await Swal.fire({
            title: '造物主密室',
            input: 'password',
            inputLabel: '請輸入通行密碼',
            inputPlaceholder: '輸入密碼解鎖後台',
            allowOutsideClick: false,
            confirmButtonText: '解鎖 🔓',
            confirmButtonColor: '#3B82F6'
        });

        // 預設密碼設定為：snow2026
        if (password === 'snow2026') {
            document.getElementById('admin-panel').classList.remove('hidden');
            Swal.fire({ icon: 'success', title: '驗證通過', text: '歡迎回來，造物主。', timer: 1500, showConfirmButton: false });
        } else {
            Swal.fire({ icon: 'error', title: '入侵拒絕', text: '密碼錯誤！', allowOutsideClick: false }).then(() => {
                location.reload(); // 密碼錯誤就重新整理
            });
        }
    }

    // 將新飯店寫入資料庫
    async addNewHotel(hotelData) {
        // ref(db, 'hotels') 指向飯店列表，push() 會自動產生一組不會重複的亂碼 ID
        const newHotelRef = push(ref(this.db, 'hotels'));
        
        try {
            // set() 將資料正式寫入這個新節點
            await set(newHotelRef, hotelData);
            Swal.fire('發射成功！', '新住宿已同步至前台', 'success');
            document.getElementById('add-hotel-form').reset(); // 清空表單
        } catch (error) {
            console.error("寫入失敗:", error);
            Swal.fire('錯誤', '資料寫入失敗', 'error');
        }
    }
}

// 初始化後台系統
const adminApp = new AdminPanel();

// 綁定表單送出事件
window.submitNewHotel = (e) => {
    e.preventDefault(); // 阻止網頁預設的重新整理行為
    
    // 收集表單資料
    const newHotel = {
        name: document.getElementById('hotel-name').value,
        price: parseInt(document.getElementById('hotel-price').value),
        distance: document.getElementById('hotel-desc').value,
        image: document.getElementById('hotel-image').value,
        totalVotes: 0, // 新飯店預設 0 票
        tags: ["最新上架"] 
    };

    // 呼叫大腦寫入雲端
    adminApp.addNewHotel(newHotel);
};
