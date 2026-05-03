// admin.js - 後台管理邏輯 (防禦升級版)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 🌟 編年史常數：以後改年份只要改這裡！
const TRIP_ID = '2026_Japan';

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
            this.listenToHotels(); // 解鎖後開始監聽飯店列表
        } else {
            Swal.fire({ icon: 'error', title: '密碼錯誤' }).then(() => location.reload());
        }
    }

    // 🌟 監聽並渲染後台的飯店列表
    listenToHotels() {
        onValue(ref(this.db, `${TRIP_ID}/hotels`), (snapshot) => {
            const data = snapshot.val();
            const container = document.getElementById('admin-hotels-list');
            if (!data) {
                container.innerHTML = '<p class="text-gray-500 text-sm">目前無任何住宿資料</p>';
                return;
            }
            
            let html = '';
            Object.entries(data).forEach(([id, hotel]) => {
                const isDeleted = hotel.is_deleted;
                const statusHtml = isDeleted ? '<span class="ml-2 text-red-400 text-[10px] bg-red-900/30 px-2 py-0.5 rounded">已封印(隱藏)</span>' : '<span class="ml-2 text-green-400 text-[10px] bg-green-900/30 px-2 py-0.5 rounded">營業中</span>';
                const actionBtn = isDeleted 
                    ? `<button onclick="window.toggleSoftDelete('${id}', false)" class="text-xs border border-green-600 text-green-400 px-3 py-1.5 rounded hover:bg-green-900/50 transition">解封</button>`
                    : `<button onclick="window.toggleSoftDelete('${id}', true)" class="text-xs border border-red-600 text-red-400 px-3 py-1.5 rounded hover:bg-red-900/50 transition">封印</button>`;

                html += `
                    <div class="flex justify-between items-center bg-gray-750 border border-gray-700 p-3 rounded-lg ${isDeleted ? 'opacity-50 grayscale' : ''}">
                        <div>
                            <div class="text-sm font-bold text-white flex items-center">${hotel.name} ${statusHtml}</div>
                            <div class="text-xs text-gray-400 mt-1">累積票數: ${hotel.totalVotes || 0} 票</div>
                        </div>
                        ${actionBtn}
                    </div>
                `;
            });
            container.innerHTML = html;
        });
    }

    // 🌟 實作軟刪除 (封印術)
    async toggleSoftDelete(hotelId, deleteStatus) {
        await update(ref(this.db, `${TRIP_ID}/hotels/${hotelId}`), {
            is_deleted: deleteStatus
        });
        const msg = deleteStatus ? '飯店已在前台隱藏，但歷史票數已保留！' : '飯店已重新開放投票！';
        Swal.fire({ icon: 'success', title: '狀態更新', text: msg, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    }

    async addNewHotel(hotelData) {
        try {
            await set(push(ref(this.db, `${TRIP_ID}/hotels`)), hotelData);
            Swal.fire('發射成功！', '新住宿已同步', 'success');
            document.getElementById('add-hotel-form').reset();
        } catch (error) {
            Swal.fire('錯誤', '資料寫入失敗', 'error');
        }
    }

    async resetAllVotes() {
        const result = await Swal.fire({ title: '重置所有票數？', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: '確定歸零' });
        if (result.isConfirmed) {
            const snapshot = await get(ref(this.db, `${TRIP_ID}/hotels`));
            if (snapshot.exists()) {
                const updates = {};
                Object.keys(snapshot.val()).forEach(key => updates[`${TRIP_ID}/hotels/${key}/totalVotes`] = 0);
                await update(ref(this.db), updates);
                localStorage.removeItem('ski_tokens');
                localStorage.removeItem('ski_my_votes');
                Swal.fire('已歸零', '', 'success');
            }
        }
    }

    async deleteAllHotels() {
        const result = await Swal.fire({ title: '核彈啟動確認', icon: 'error', showCancelButton: true, confirmButtonColor: '#000', confirmButtonText: '發射核彈 💣' });
        if (result.isConfirmed) {
            await remove(ref(this.db, `${TRIP_ID}/hotels`));
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
        totalVotes: 0,
        is_deleted: false // 🌟 新增：預設是沒有被刪除的
    });
};

window.resetAllVotes = () => adminApp.resetAllVotes();
window.deleteAllHotels = () => adminApp.deleteAllHotels();
window.toggleSoftDelete = (id, status) => adminApp.toggleSoftDelete(id, status);
