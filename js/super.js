// js/super.js - SaaS 上帝控制台 (維運大滿貫版)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class SuperAdmin {
    constructor() {
        const firebaseConfig = { apiKey: "AIzaSyD-mC8R_WvYV_7f2H9u_QyT_XfR-fX_k", authDomain: "ski-dashboard-2026-c146e.firebaseapp.com", databaseURL: "https://ski-dashboard-2026-default-rtdb.firebaseio.com", projectId: "ski-dashboard-2026-c146e" };
        this.db = getDatabase(initializeApp(firebaseConfig));
        this.verifySuperGod();
        this.currentLicenses = {}; // 暫存資料
    }

    async verifySuperGod() {
        const { value: password } = await Swal.fire({ title: '神之領域', input: 'password', allowOutsideClick: false, confirmButtonText: '降臨', confirmButtonColor: '#9333ea' });
        if (password === 'SAAS_GOD_2026') { 
            document.getElementById('super-panel').classList.remove('hidden'); 
            this.listenToLicenses(); 
        } else { Swal.fire({ icon: 'error', title: '神罰！' }).then(() => location.reload()); }
    }

    listenToLicenses() {
        onValue(ref(this.db, `SYSTEM_LICENSES`), (snapshot) => {
            const data = snapshot.val() || {};
            this.currentLicenses = data; // 存起來備用
            const tbody = document.getElementById('licenses-list');
            let html = '';
            
            Object.entries(data).forEach(([keyId, info]) => {
                const now = Date.now();
                let isExpired = info.type === 'rental' && info.expiresAt < now;
                let statusHtml = '';
                
                if (info.status === 'blocked') statusHtml = '<span class="bg-red-900 text-red-300 px-2 py-1 rounded text-[10px]">已封鎖</span>';
                else if (isExpired) statusHtml = '<span class="bg-orange-900 text-orange-300 px-2 py-1 rounded text-[10px]">已過期</span>';
                else statusHtml = '<span class="bg-green-900 text-green-300 px-2 py-1 rounded text-[10px]">運行中</span>';

                const expireText = info.type === 'buyout' ? '♾️ 永久有效' : new Date(info.expiresAt).toLocaleString();
                const baseUrl = window.location.origin + window.location.pathname.replace('super.html', '');
                
                // 按鈕群
                const copyBtn = `<button onclick="window.copyLinks('${baseUrl}', '${keyId}')" class="text-blue-400 hover:text-blue-300 mr-3" title="複製連結"><i class="fa-solid fa-link"></i></button>`;
                
                // 🌟 新增：編輯按鈕
                const editBtn = `<button onclick="window.editLicense('${keyId}')" class="text-yellow-400 hover:text-yellow-300 mr-3" title="編輯授權"><i class="fa-solid fa-pen-to-square"></i></button>`;
                
                const blockBtn = info.status === 'blocked' 
                    ? `<button onclick="window.toggleBlock('${keyId}', 'active')" class="text-green-400 hover:text-green-300 mr-2" title="解鎖"><i class="fa-solid fa-unlock"></i></button>`
                    : `<button onclick="window.toggleBlock('${keyId}', 'blocked')" class="text-red-500 hover:text-red-400 mr-2" title="封鎖"><i class="fa-solid fa-ban"></i></button>`;
                
                const deleteBtn = `<button onclick="window.deleteLicense('${keyId}')" class="text-gray-500 hover:text-red-500" title="徹底銷毀"><i class="fa-solid fa-trash-can"></i></button>`;

                html += `
                    <tr class="hover:bg-gray-750 transition text-gray-300">
                        <td class="px-4 py-3 font-mono font-bold text-yellow-500">${keyId}</td>
                        <td class="px-4 py-3 text-xs">${info.memo}</td>
                        <td class="px-4 py-3">${statusHtml}</td>
                        <td class="px-4 py-3 text-[10px] text-gray-500">${expireText}</td>
                        <td class="px-4 py-3 text-center text-sm">${copyBtn}${editBtn}${blockBtn}${deleteBtn}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html || '<tr><td colspan="5" class="text-center py-4 text-gray-500">目前尚無任何授權金匙</td></tr>';
        });
    }

    // 🌟 核心新咒語：呼喚編輯對話框
    async editLicense(keyId) {
        const info = this.currentLicenses[keyId];
        if (!info) return;

        // 將 timestamp 轉為 HTML input datetime-local 格式 (YYYY-MM-DDThh:mm)
        let formattedDate = "";
        if (info.expiresAt) {
            const d = new Date(info.expiresAt);
            formattedDate = d.getFullYear() + '-' + 
                           String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(d.getDate()).padStart(2, '0') + 'T' + 
                           String(d.getHours()).padStart(2, '0') + ':' + 
                           String(d.getMinutes()).padStart(2, '0');
        }

        const { value: formValues } = await Swal.fire({
            title: `編輯授權：${keyId}`,
            background: '#1f2937',
            color: '#fff',
            html: `
                <div class="text-left space-y-4">
                    <div>
                        <label class="block text-xs text-gray-400 mb-1">客戶備註</label>
                        <input id="edit-memo" class="swal2-input !m-0 !w-full" value="${info.memo}">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 mb-1">授權類型</label>
                        <select id="edit-type" class="swal2-input !m-0 !w-full" onchange="document.getElementById('edit-date-container').style.display = this.value==='rental'?'block':'none'">
                            <option value="rental" ${info.type==='rental'?'selected':''}>⏳ 租借模式</option>
                            <option value="buyout" ${info.type==='buyout'?'selected':''}>♾️ 買斷模式</option>
                        </select>
                    </div>
                    <div id="edit-date-container" style="display: ${info.type==='rental'?'block':'none'}">
                        <label class="block text-xs text-gray-400 mb-1">截止時間</label>
                        <input id="edit-deadline" type="datetime-local" class="swal2-input !m-0 !w-full" value="${formattedDate}">
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: '更新授權',
            cancelButtonText: '取消',
            preConfirm: () => {
                return {
                    memo: document.getElementById('edit-memo').value,
                    type: document.getElementById('edit-type').value,
                    expiresAt: document.getElementById('edit-deadline').value ? new Date(document.getElementById('edit-deadline').value).getTime() : null
                }
            }
        });

        if (formValues) {
            try {
                await update(ref(this.db, `SYSTEM_LICENSES/${keyId}`), {
                    memo: formValues.memo,
                    type: formValues.type,
                    expiresAt: formValues.type === 'rental' ? formValues.expiresAt : null
                });
                Swal.fire({ icon: 'success', title: '授權內容已更新', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
            } catch (err) {
                Swal.fire('更新失敗', err.message, 'error');
            }
        }
    }

    async createLicense(data) {
        let expiresAt = null;
        if (data.type === 'rental') {
            expiresAt = Date.now() + (data.days * 24 * 60 * 60 * 1000);
        }
        await set(ref(this.db, `SYSTEM_LICENSES/${data.id}`), {
            type: data.type, memo: data.memo, status: 'active', createdAt: Date.now(), expiresAt: expiresAt
        });
        Swal.fire({ icon: 'success', title: '金匙鑄造完成', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
    }

    async toggleBlock(keyId, newStatus) { await update(ref(this.db, `SYSTEM_LICENSES/${keyId}`), { status: newStatus }); }
    
    async deleteLicense(keyId) {
        if ((await Swal.fire({ title: '核彈警告', text: `確定要徹底刪除金匙 ${keyId} 嗎？`, icon: 'error', showCancelButton: true, confirmButtonColor: '#d33' })).isConfirmed) {
            await remove(ref(this.db, `SYSTEM_LICENSES/${keyId}`));
        }
    }
}

const god = new SuperAdmin();

window.submitNewLicense = (e) => {
    e.preventDefault();
    god.createLicense({
        id: document.getElementById('l-id').value.trim(),
        memo: document.getElementById('l-memo').value.trim(),
        type: document.getElementById('l-type').value,
        days: parseInt(document.getElementById('l-days').value) || 30
    });
};

window.generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'KEY_';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('l-id').value = result;
};

window.toggleDaysInput = () => {
    const type = document.getElementById('l-type').value;
    document.getElementById('days-container').style.display = type === 'rental' ? 'block' : 'none';
};

window.toggleBlock = (id, status) => god.toggleBlock(id, status);
window.deleteLicense = (id) => god.deleteLicense(id);
window.editLicense = (id) => god.editLicense(id); // 🌟 暴露給 HTML 呼叫

window.copyLinks = (baseUrl, keyId) => {
    const text = `【您的旅遊決策室已開通】\n\n🔑 專屬授權碼：${keyId}\n\n📲 前台網址 (發給團員投票用)：\n${baseUrl}index.html?id=${keyId}\n\n⚙️ 主辦人控制台 (設定選項與帳單用)：\n${baseUrl}admin.html?id=${keyId}\n\n預設控制台密碼為：snow2026 (請登入後盡速修改)`;
    navigator.clipboard.writeText(text).then(() => Swal.fire('已複製', '交貨文案已複製到剪貼簿！', 'success'));
};
