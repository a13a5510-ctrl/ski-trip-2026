// admin.js - 後台管理邏輯
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, get, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class AdminPanel {
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
        
        this.verifyAdmin();
    }

    async verifyAdmin() {
        const { value: password } = await Swal.fire({
            title: '造物主密室', input: 'password', allowOutsideClick: false,
            confirmButtonText: '解鎖 🔓', confirmButtonColor: '#3B82F6'
        });

        if (password === 'snow2026') {
            document.getElementById('admin-panel').classList.remove('hidden');
        } else {
            Swal.fire({ icon: 'error', title: '密碼錯誤' }).then(() => location.reload());
        }
    }

    async addNewHotel(hotelData) {
        try {
            await set(push(ref(this.db, 'hotels')), hotelData);
            Swal.fire('發射成功！', '新住宿已同步', 'success');
            document.getElementById('add-hotel-form').reset();
        } catch (error) {
            Swal.fire('錯誤', '資料寫入失敗', 'error');
        }
    }

    // 🌟 新增：一鍵票數歸零
    async resetAllVotes() {
        const result = await Swal.fire({
            title: '確定要重置所有票數？',
            text: "這會把所有飯店的票數洗白為 0 喔！",
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: '確定歸零'
        });

        if (result.isConfirmed) {
            const hotelsRef = ref(this.db, 'hotels');
            const snapshot = await get(hotelsRef);
            if (snapshot.exists()) {
                const updates = {};
                Object.keys(snapshot.val()).forEach(key => {
                    updates[`hotels/${key}/totalVotes`] = 0;
                });
                await update(ref(this.db), updates);
                
                // 清除開發者本機的代幣紀錄方便重新測試
                localStorage.removeItem('ski_tokens');
                localStorage.removeItem('ski_my_votes');
                
                Swal.fire('已歸零', '所有票數已重新計算', 'success');
            }
        }
    }

    // 🌟 新增：核彈級刪除所有資料
    async deleteAllHotels() {
        const result = await Swal.fire({
            title: '核彈啟動確認',
            text: "這會刪除資料庫內「所有」的飯店資料，無法復原！",
            icon: 'error', showCancelButton: true, confirmButtonColor: '#000', confirmButtonText: '發射核彈 💣'
        });

        if (result.isConfirmed) {
            await remove(ref(this.db, 'hotels'));
            Swal.fire('已毀滅', '世界清靜了', 'success');
        }
    }
}

const adminApp = new AdminPanel();

window.submitNewHotel = (e) => {
    e.preventDefault();
    adminApp.addNewHotel({
        name: document.getElementById('hotel-name').value,
        price: parseInt(document.getElementById('hotel-price').value),
        desc: document.getElementById('hotel-desc').value,
        image: document.getElementById('hotel-image').value,
        totalVotes: 0
    });
};

// 綁定毀滅按鈕
window.resetAllVotes = () => adminApp.resetAllVotes();
window.deleteAllHotels = () => adminApp.deleteAllHotels();
