// admin.js - 後台管理邏輯 (動態行程擴充版)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
            this.listenToHotels(); 
        } else {
            Swal.fire({ icon: 'error', title: '密碼錯誤' }).then(() => location.reload());
        }
    }

    listenToHotels() {
        onValue(ref(this.db, `${TRIP_ID}/hotels`), (snapshot) => {
            const data = snapshot.val();
            const container = document.getElementById('admin-hotels-list');
            if (!data) { container.innerHTML = '<p class="text-gray-500 text-sm">目前無任何住宿資料</p>'; return; }
            
            let html = '';
            Object.entries(data).forEach(([id, hotel]) => {
                const isDeleted = hotel.is_deleted;
                const statusHtml = isDeleted ? '<span class="ml-2 text-red-400 text-[10px] bg-red-900/30 px-2 py-0.5 rounded">已封印</span>' : '<span class="ml-2 text-green-400 text-[10px] bg-green-900/30 px-2 py-0.5 rounded">營業中</span>';
                const actionBtn = isDeleted 
                    ? `<button onclick="window.toggleSoftDelete('${id}', false)" class="text-xs border border-green-600 text-green-400 px-3 py-1 rounded hover:bg-green-900/50">解封</button>`
                    : `<button onclick="window.toggleSoftDelete('${id}', true)" class="text-xs border border-red-600 text-red-400 px-3 py-1 rounded hover:bg-red-900/50">封印</button>`;

                html += `<div class="flex justify-between items-center bg-gray-750 border border-gray-700 p-2 rounded-lg ${isDeleted ? 'opacity-50' : ''}"><div><div class="text-sm font-bold">${hotel.name} ${statusHtml}</div></div>${actionBtn}</div>`;
            });
            container.innerHTML = html;
        }, (err) => { document.getElementById('admin-hotels-list').innerHTML = `<p class="text-red-500">讀取失敗</p>`; });
    }

    async toggleSoftDelete(hotelId, deleteStatus) {
        await update(ref(this.db, `${TRIP_ID}/hotels/${hotelId}`), { is_deleted: deleteStatus });
    }

    async addNewHotel(hotelData) {
        await set(push(ref(this.db, `${TRIP_ID}/hotels`)), hotelData);
        document.getElementById('add-hotel-form').reset();
        Swal.fire({ icon:'success', title:'住宿新增成功', toast:true, position:'top-end', timer:2000, showConfirmButton:false });
    }

    // 🌟 新增：將行程積木發射至雲端
    async addTimelineEvent(eventData) {
        await set(push(ref(this.db, `${TRIP_ID}/timeline`)), eventData);
        // 清空標題與描述，但保留天數跟日期，方便使用者連續輸入同一天的行程
        document.getElementById('t-title').value = '';
        document.getElementById('t-desc').value = '';
        document.getElementById('t-time').value = '';
        Swal.fire({ icon:'success', title:'行程積木已組裝', toast:true, position:'top-end', timer:2000, showConfirmButton:false });
    }

    async resetAllVotes() {
        const result = await Swal.fire({ title: '重置票數？', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: '歸零' });
        if (result.isConfirmed) {
            const snapshot = await get(ref(this.db, `${TRIP_ID}/hotels`));
            if (snapshot.exists()) {
                const updates = {};
                Object.keys(snapshot.val()).forEach(key => updates[`${TRIP_ID}/hotels/${key}/totalVotes`] = 0);
                await update(ref(this.db), updates);
                localStorage.removeItem('ski_tokens'); localStorage.removeItem('ski_my_votes');
                Swal.fire('已歸零', '', 'success');
            }
        }
    }

    // 🌟 新增：清空行程表
    async clearTimeline() {
        const result = await Swal.fire({ title: '刪除所有行程？', icon: 'error', showCancelButton: true, confirmButtonColor: '#000', confirmButtonText: '炸毀行程表' });
        if (result.isConfirmed) {
            await remove(ref(this.db, `${TRIP_ID}/timeline`));
            Swal.fire('已清空', '行程表已回到空白狀態', 'success');
        }
    }

    async deleteAllHotels() {
        const result = await Swal.fire({ title: '核彈確認', text: "刪除所有飯店無法復原！", icon: 'error', showCancelButton: true, confirmButtonColor: '#000', confirmButtonText: '發射' });
        if (result.isConfirmed) {
            await remove(ref(this.db, `${TRIP_ID}/hotels`));
            Swal.fire('已毀滅', '', 'success');
        }
    }
}

const adminApp = new AdminPanel();

window.submitNewHotel = (e) => {
    e.preventDefault();
    adminApp.addNewHotel({
        name: document.getElementById('hotel-name').value, price: parseInt(document.getElementById('hotel-price').value),
        desc: document.getElementById('hotel-desc').value, image: document.getElementById('hotel-image').value,
        totalVotes: 0, is_deleted: false
    });
};

// 🌟 綁定新增行程的按鈕
window.submitNewTimeline = (e) => {
    e.preventDefault();
    adminApp.addTimelineEvent({
        day: parseInt(document.getElementById('t-day').value),
        date: document.getElementById('t-date').value,
        time: document.getElementById('t-time').value,
        icon: document.getElementById('t-icon').value,
        title: document.getElementById('t-title').value,
        desc: document.getElementById('t-desc').value
    });
};

window.resetAllVotes = () => adminApp.resetAllVotes();
window.clearTimeline = () => adminApp.clearTimeline();
window.deleteAllHotels = () => adminApp.deleteAllHotels();
window.toggleSoftDelete = (id, status) => adminApp.toggleSoftDelete(id, status);
