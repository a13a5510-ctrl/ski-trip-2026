// js/admin.js - SaaS 後台邏輯
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const urlParams = new URLSearchParams(window.location.search);
const TRIP_ID = urlParams.get('id') || '2026_Japan';

window.addEventListener('DOMContentLoaded', () => {
    const frontLink = document.querySelector('a[href="index.html"]');
    if (frontLink) frontLink.href = `index.html?id=${TRIP_ID}`;
});

class AdminPanel {
    constructor() {
        const firebaseConfig = { apiKey: "AIzaSyD-mC8R_WvYV_7f2H9u_QyT_XfR-fX_k", authDomain: "ski-dashboard-2026-c146e.firebaseapp.com", databaseURL: "https://ski-dashboard-2026-default-rtdb.firebaseio.com", projectId: "ski-dashboard-2026-c146e" };
        this.db = getDatabase(initializeApp(firebaseConfig));
        this.verifyAdmin();
        this.currentHotelsData = {};
    }

    async verifyAdmin() {
        // 🛡️ 進入後台前，先檢測金匙結界！
        const licenseSnap = await get(ref(this.db, `SYSTEM_LICENSES/${TRIP_ID}`));
        const license = licenseSnap.val();

        if (!license || license.status === 'blocked' || (license.type === 'rental' && license.expiresAt && Date.now() > license.expiresAt)) {
            await Swal.fire({ icon: 'error', title: '授權失效', text: '您的房間金匙已到期或無效，請聯繫系統商。', confirmButtonColor: '#3B82F6' });
            document.body.innerHTML = '<div style="height:100dvh;display:flex;justify-content:center;align-items:center;background:#111;color:white;">🔒 後台已鎖定</div>';
            return;
        }

        const pwSnapshot = await get(ref(this.db, `${TRIP_ID}/settings/adminPassword`));
        const truePassword = pwSnapshot.val() || 'snow2026';

        const { value: password } = await Swal.fire({ title: `解鎖房間: ${TRIP_ID}`, input: 'password', allowOutsideClick: false, confirmButtonText: '解鎖 🔓', confirmButtonColor: '#3B82F6' });
        if (password === truePassword) { 
            document.getElementById('admin-panel').classList.remove('hidden'); 
            this.listenToHotels(); this.listenToSettings(); this.listenToCosts(); 
        } else { Swal.fire({ icon: 'error', title: '密碼錯誤' }).then(() => location.reload()); }
    }

    listenToSettings() {
        onValue(ref(this.db, `${TRIP_ID}/settings`), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                document.getElementById('s-event-name').value = data.eventName || '2026 滑雪戰情室';
                document.getElementById('s-event-icon').value = data.eventIcon || '🏂';
                document.getElementById('s-token-name').value = data.tokenName || '雪花幣';
                document.getElementById('s-admin-pw').value = data.adminPassword || 'snow2026';
                document.getElementById('s-tokens').value = data.defaultTokens || 10;
                document.getElementById('s-deadline').value = data.deadline || '';
                document.getElementById('s-nights').value = data.hotelNights || 4;
            }
        });
    }

    async updateSettings(settings) { await update(ref(this.db, `${TRIP_ID}/settings`), settings); Swal.fire({ icon: 'success', title: '全局設定已更新', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false }); }
    listenToCosts() {
        onValue(ref(this.db, `${TRIP_ID}/costs`), (snapshot) => {
            const data = snapshot.val(); const container = document.getElementById('admin-costs-list');
            if (!data) { container.innerHTML = '<p class="text-gray-500 text-sm">目前無自訂成本項目</p>'; return; }
            let html = '';
            Object.entries(data).forEach(([id, cost]) => {
                const typeLabel = cost.type === 'shared' ? '👥 均攤' : '👤 個人';
                html += `<div class="flex justify-between items-center bg-gray-750 border border-gray-700 p-2 rounded-lg"><div class="text-sm font-bold">${cost.icon} ${cost.name} <span class="text-xs text-gray-400 ml-2">(${typeLabel})</span> <span class="text-green-400 ml-2">$${cost.amount.toLocaleString()}</span></div><button onclick="window.deleteCost('${id}')" class="text-xs text-red-400 hover:text-red-300 px-2 py-1" title="刪除"><i class="fa-solid fa-trash"></i></button></div>`;
            });
            container.innerHTML = html;
        });
    }

    async submitNewCost(costData) { await set(push(ref(this.db, `${TRIP_ID}/costs`)), costData); document.getElementById('add-cost-form').reset(); }
    async deleteCost(costId) { await remove(ref(this.db, `${TRIP_ID}/costs/${costId}`)); }

    listenToHotels() { 
        onValue(ref(this.db, `${TRIP_ID}/hotels`), (snapshot) => {
            const data = snapshot.val(); this.currentHotelsData = data || {}; 
            const container = document.getElementById('admin-hotels-list'); const hotelSelect = document.getElementById('t-hotel'); 
            if (!data) { container.innerHTML = '<p class="text-gray-500 text-sm">目前無任何候補方案</p>'; hotelSelect.innerHTML = '<option value="all">🌐 共用行程 (所有方案皆適用)</option>'; return; }
            let html = ''; let optionsHtml = '<option value="all">🌐 共用行程 (所有方案皆適用)</option>'; 
            Object.entries(data).forEach(([id, hotel]) => {
                const isDeleted = hotel.is_deleted; const statusHtml = isDeleted ? '<span class="ml-2 text-red-400 text-[10px] bg-red-900/30 px-2 py-0.5 rounded">已封印</span>' : '<span class="ml-2 text-green-400 text-[10px] bg-green-900/30 px-2 py-0.5 rounded">候選中</span>';
                const crownBtn = `<button onclick="window.forceCrown('${id}', '${hotel.name}')" class="text-xs border border-yellow-600 text-yellow-500 px-3 py-1 rounded hover:bg-yellow-900/50 mr-2" title="強制加冕"><i class="fa-solid fa-crown"></i></button>`;
                const editBtn = `<button onclick="window.editHotel('${id}')" class="text-xs border border-blue-600 text-blue-400 px-3 py-1 rounded hover:bg-blue-900/50 mr-2"><i class="fa-solid fa-pen"></i></button>`;
                const actionBtn = isDeleted ? `<button onclick="window.toggleSoftDelete('${id}', false)" class="text-xs border border-green-600 text-green-400 px-3 py-1 rounded hover:bg-green-900/50">解封</button>` : `<button onclick="window.toggleSoftDelete('${id}', true)" class="text-xs border border-red-600 text-red-400 px-3 py-1 rounded hover:bg-red-900/50">封印</button>`;
                html += `<div class="flex justify-between items-center bg-gray-750 border border-gray-700 p-2 rounded-lg ${isDeleted ? 'opacity-50' : ''}"><div><div class="text-sm font-bold">${hotel.name} ${statusHtml}</div></div><div class="flex">${crownBtn}${editBtn}${actionBtn}</div></div>`;
                if (!isDeleted) optionsHtml += `<option value="${id}">📌 專屬：${hotel.name}</option>`;
            });
            container.innerHTML = html; if (hotelSelect) hotelSelect.innerHTML = optionsHtml;
        });
    }

    async forceCrown(hotelId, hotelName) { if ((await Swal.fire({ title: `加冕 ${hotelName}？`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#eab308', confirmButtonText: '👑 強制加冕' })).isConfirmed) { await update(ref(this.db, `${TRIP_ID}/settings`), { winnerId: hotelId }); Swal.fire('加冕成功', '', 'success'); } }
    async clearCrown() { if ((await Swal.fire({ title: '撤銷加冕？', icon: 'question', showCancelButton: true, confirmButtonColor: '#eab308', confirmButtonText: '撤銷' })).isConfirmed) { await update(ref(this.db, `${TRIP_ID}/settings`), { winnerId: null }); Swal.fire('已撤銷', '', 'success'); } }
    async editHotel(hotelId) { 
        const hotel = this.currentHotelsData[hotelId]; if (!hotel) return;
        const { value: formValues } = await Swal.fire({ title: `編輯: ${hotel.name}`, html: `<input id="edit-name" class="swal2-input" value="${hotel.name}"><input id="edit-price" type="number" class="swal2-input" value="${hotel.price}">`, preConfirm: () => { return { name: document.getElementById('edit-name').value, price: parseInt(document.getElementById('edit-price').value) } } });
        if (formValues) { try { await update(ref(this.db, `${TRIP_ID}/hotels/${hotelId}`), { name: formValues.name, price: formValues.price }); Swal.fire({ icon: 'success', title: '更新成功！', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false }); } catch (error) { Swal.fire('錯誤', '資料更新失敗', 'error'); } }
    }
    async toggleSoftDelete(hotelId, deleteStatus) { await update(ref(this.db, `${TRIP_ID}/hotels/${hotelId}`), { is_deleted: deleteStatus }); }
    async addNewHotel(hotelData) { await set(push(ref(this.db, `${TRIP_ID}/hotels`)), hotelData); document.getElementById('add-hotel-form').reset(); Swal.fire({ icon:'success', title:'新增成功', toast:true, position:'top-end', timer:2000, showConfirmButton:false }); }
    async addTimelineEvent(eventData) { await set(push(ref(this.db, `${TRIP_ID}/timeline`)), eventData); document.getElementById('t-title').value = ''; document.getElementById('t-desc').value = ''; document.getElementById('t-time').value = ''; Swal.fire({ icon:'success', title:'積木已組裝', toast:true, position:'top-end', timer:2000, showConfirmButton:false }); }
    async resetAllVotes() { if ((await Swal.fire({ title: '票數歸零？', icon: 'warning', showCancelButton: true, confirmButtonText: '歸零' })).isConfirmed) { const snapshot = await get(ref(this.db, `${TRIP_ID}/hotels`)); if (snapshot.exists()) { const updates = {}; Object.keys(snapshot.val()).forEach(key => updates[`${TRIP_ID}/hotels/${key}/totalVotes`] = 0); updates[`${TRIP_ID}/settings/winnerId`] = null; await update(ref(this.db), updates); Swal.fire('已歸零', '', 'success'); } } }
    async clearTimeline() { if ((await Swal.fire({ title: '刪除所有行程？', icon: 'error', showCancelButton: true, confirmButtonText: '炸毀' })).isConfirmed) { await remove(ref(this.db, `${TRIP_ID}/timeline`)); Swal.fire('已清空', '', 'success'); } }
    async deleteAllHotels() { if ((await Swal.fire({ title: '核彈確認', icon: 'error', showCancelButton: true, confirmButtonText: '發射' })).isConfirmed) { await remove(ref(this.db, `${TRIP_ID}/hotels`)); Swal.fire('已毀滅', '', 'success'); } }
}

const adminApp = new AdminPanel();
window.submitSettings = (e) => { e.preventDefault(); adminApp.updateSettings({ eventName: document.getElementById('s-event-name').value, eventIcon: document.getElementById('s-event-icon').value, tokenName: document.getElementById('s-token-name').value, adminPassword: document.getElementById('s-admin-pw').value, defaultTokens: parseInt(document.getElementById('s-tokens').value) || 10, deadline: document.getElementById('s-deadline').value, hotelNights: parseInt(document.getElementById('s-nights').value) || 4 }); };
window.submitNewCost = (e) => { e.preventDefault(); adminApp.submitNewCost({ icon: document.getElementById('c-icon').value, name: document.getElementById('c-name').value, amount: parseInt(document.getElementById('c-amount').value), type: document.getElementById('c-type').value }); };
window.deleteCost = (id) => adminApp.deleteCost(id);
window.submitNewHotel = (e) => { e.preventDefault(); adminApp.addNewHotel({ name: document.getElementById('hotel-name').value, price: parseInt(document.getElementById('hotel-price').value), desc: document.getElementById('hotel-desc').value, image: document.getElementById('hotel-image').value, totalVotes: 0, is_deleted: false }); };
window.submitNewTimeline = (e) => { e.preventDefault(); adminApp.addTimelineEvent({ day: parseInt(document.getElementById('t-day').value), date: document.getElementById('t-date').value, time: document.getElementById('t-time').value, icon: document.getElementById('t-icon').value, title: document.getElementById('t-title').value, desc: document.getElementById('t-desc').value, hotelId: document.getElementById('t-hotel').value }); };
window.resetAllVotes = () => adminApp.resetAllVotes(); window.clearTimeline = () => adminApp.clearTimeline(); window.deleteAllHotels = () => adminApp.deleteAllHotels(); window.toggleSoftDelete = (id, status) => adminApp.toggleSoftDelete(id, status); window.editHotel = (id) => adminApp.editHotel(id); window.forceCrown = (id, name) => adminApp.forceCrown(id, name); window.clearCrown = () => adminApp.clearCrown();
