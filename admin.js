// admin.js - 後台管理邏輯 (行程動態綁定版)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const TRIP_ID = '2026_Japan';

class AdminPanel {
    constructor() {
        const firebaseConfig = {
            apiKey: "AIzaSyD-mC8R_WvYV_7f2H9u_QyT_XfR-fX_k",
            authDomain: "ski-dashboard-2026-c146e.firebaseapp.com",
            databaseURL: "https://ski-dashboard-2026-default-rtdb.firebaseio.com",
            projectId: "ski-dashboard-2026-c146e"
        };
        this.db = getDatabase(initializeApp(firebaseConfig));
        this.verifyAdmin();
        this.currentHotelsData = {};
    }

    async verifyAdmin() {
        const { value: password } = await Swal.fire({ title: '造物主密室', input: 'password', allowOutsideClick: false, confirmButtonText: '解鎖 🔓', confirmButtonColor: '#3B82F6' });
        if (password === 'snow2026') { document.getElementById('admin-panel').classList.remove('hidden'); this.listenToHotels(); } 
        else { Swal.fire({ icon: 'error', title: '密碼錯誤' }).then(() => location.reload()); }
    }

    listenToHotels() {
        onValue(ref(this.db, `${TRIP_ID}/hotels`), (snapshot) => {
            const data = snapshot.val();
            this.currentHotelsData = data || {}; 
            const container = document.getElementById('admin-hotels-list');
            const hotelSelect = document.getElementById('t-hotel'); // 🌟 抓取下拉選單
            
            if (!data) { 
                container.innerHTML = '<p class="text-gray-500 text-sm">目前無任何住宿資料</p>'; 
                hotelSelect.innerHTML = '<option value="all">🌐 共用行程 (所有住宿皆適用)</option>';
                return; 
            }
            
            let html = '';
            let optionsHtml = '<option value="all">🌐 共用行程 (所有住宿皆適用)</option>'; // 🌟 預設選項

            Object.entries(data).forEach(([id, hotel]) => {
                const isDeleted = hotel.is_deleted;
                const statusHtml = isDeleted ? '<span class="ml-2 text-red-400 text-[10px] bg-red-900/30 px-2 py-0.5 rounded">已封印</span>' : '<span class="ml-2 text-green-400 text-[10px] bg-green-900/30 px-2 py-0.5 rounded">營業中</span>';
                const editBtn = `<button onclick="window.editHotel('${id}')" class="text-xs border border-blue-600 text-blue-400 px-3 py-1 rounded hover:bg-blue-900/50 mr-2"><i class="fa-solid fa-pen"></i></button>`;
                const actionBtn = isDeleted 
                    ? `<button onclick="window.toggleSoftDelete('${id}', false)" class="text-xs border border-green-600 text-green-400 px-3 py-1 rounded hover:bg-green-900/50">解封</button>`
                    : `<button onclick="window.toggleSoftDelete('${id}', true)" class="text-xs border border-red-600 text-red-400 px-3 py-1 rounded hover:bg-red-900/50">封印</button>`;
                html += `<div class="flex justify-between items-center bg-gray-750 border border-gray-700 p-2 rounded-lg ${isDeleted ? 'opacity-50' : ''}"><div><div class="text-sm font-bold">${hotel.name} ${statusHtml}</div></div><div>${editBtn}${actionBtn}</div></div>`;
                
                // 🌟 如果沒被封印，就加進下拉選單
                if (!isDeleted) {
                    optionsHtml += `<option value="${id}">🏨 專屬：${hotel.name}</option>`;
                }
            });
            container.innerHTML = html;
            if (hotelSelect) hotelSelect.innerHTML = optionsHtml;
        });
    }

    async editHotel(hotelId) {
        const hotel = this.currentHotelsData[hotelId];
        if (!hotel) return;

        const { value: formValues } = await Swal.fire({
            title: `編輯: ${hotel.name}`,
            html: `
                <div class="space-y-4 text-left">
                    <div><label class="block text-sm font-bold text-gray-700 mb-1">飯店名稱</label><input id="edit-name" class="swal2-input !m-0 !w-full" value="${hotel.name}"></div>
                    <div><label class="block text-sm font-bold text-gray-700 mb-1">價格 (日幣)</label><input id="edit-price" type="number" class="swal2-input !m-0 !w-full" value="${hotel.price}"></div>
                </div>
            `,
            focusConfirm: false, showCancelButton: true, confirmButtonText: '儲存變更', cancelButtonText: '取消',
            preConfirm: () => { return { name: document.getElementById('edit-name').value, price: parseInt(document.getElementById('edit-price').value) } }
        });

        if (formValues) {
            try { await update(ref(this.db, `${TRIP_ID}/hotels/${hotelId}`), { name: formValues.name, price: formValues.price }); Swal.fire({ icon: 'success', title: '更新成功！', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false }); } catch (error) { Swal.fire('錯誤', '資料更新失敗', 'error'); }
        }
    }

    async toggleSoftDelete(hotelId, deleteStatus) { await update(ref(this.db, `${TRIP_ID}/hotels/${hotelId}`), { is_deleted: deleteStatus }); }
    async addNewHotel(hotelData) {
        await set(push(ref(this.db, `${TRIP_ID}/hotels`)), hotelData);
        document.getElementById('add-hotel-form').reset();
        Swal.fire({ icon:'success', title:'住宿新增成功', toast:true, position:'top-end', timer:2000, showConfirmButton:false });
    }
    async addTimelineEvent(eventData) {
        await set(push(ref(this.db, `${TRIP_ID}/timeline`)), eventData);
        document.getElementById('t-title').value = ''; document.getElementById('t-desc').value = ''; document.getElementById('t-time').value = '';
        Swal.fire({ icon:'success', title:'行程積木已組裝', toast:true, position:'top-end', timer:2000, showConfirmButton:false });
    }
    async resetAllVotes() {
        if ((await Swal.fire({ title: '重置票數？', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: '歸零' })).isConfirmed) {
            const snapshot = await get(ref(this.db, `${TRIP_ID}/hotels`));
            if (snapshot.exists()) {
                const updates = {}; Object.keys(snapshot.val()).forEach(key => updates[`${TRIP_ID}/hotels/${key}/totalVotes`] = 0);
                await update(ref(this.db), updates); localStorage.removeItem('ski_tokens'); localStorage.removeItem('ski_my_votes'); Swal.fire('已歸零', '', 'success');
            }
        }
    }
    async clearTimeline() {
        if ((await Swal.fire({ title: '刪除所有行程？', icon: 'error', showCancelButton: true, confirmButtonColor: '#000', confirmButtonText: '炸毀' })).isConfirmed) {
            await remove(ref(this.db, `${TRIP_ID}/timeline`)); Swal.fire('已清空', '', 'success');
        }
    }
    async deleteAllHotels() {
        if ((await Swal.fire({ title: '核彈確認', icon: 'error', showCancelButton: true, confirmButtonColor: '#000', confirmButtonText: '發射' })).isConfirmed) {
            await remove(ref(this.db, `${TRIP_ID}/hotels`)); Swal.fire('已毀滅', '', 'success');
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
        is_deleted: false
    });
};

window.submitNewTimeline = (e) => {
    e.preventDefault();
    adminApp.addTimelineEvent({
        day: parseInt(document.getElementById('t-day').value), date: document.getElementById('t-date').value,
        time: document.getElementById('t-time').value, icon: document.getElementById('t-icon').value,
        title: document.getElementById('t-title').value, desc: document.getElementById('t-desc').value,
        hotelId: document.getElementById('t-hotel').value // 🌟 將綁定的 ID 一起送上雲端！
    });
};

window.resetAllVotes = () => adminApp.resetAllVotes(); window.clearTimeline = () => adminApp.clearTimeline(); window.deleteAllHotels = () => adminApp.deleteAllHotels(); 
window.toggleSoftDelete = (id, status) => adminApp.toggleSoftDelete(id, status);
window.editHotel = (id) => adminApp.editHotel(id);
