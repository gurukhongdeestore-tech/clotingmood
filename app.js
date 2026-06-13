// --- FIREBASE INITIALIZATION (เปลี่ยนมาใช้ Cloud Firestore) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAPGT44ZlQ3zyD-u3LVJm6dH5DuZtDGk1c",
    authDomain: "clotingmood.firebaseapp.com",
    projectId: "clotingmood",
    storageBucket: "clotingmood.firebasestorage.app",
    messagingSenderId: "18055269299",
    appId: "1:18055269299:web:20b78e4408538dbee6d9c6",
    measurementId: "G-SJSX36LFBQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // เปลี่ยนมาใช้ Firestore
const auth = getAuth(app);

// สแตนด์บายโครงสร้างข้อมูลตั้งต้น
let storeData = {
    slides: [
        { img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200", link: "#", code: "WELCOMENEW" },
        { img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200", link: "#", code: "25%=2000" }
    ],
    categories: [
        { id: "cat-main-1", name: "เสื้อผ้าผู้ชาย", type: "main", parentId: null },
        { id: "cat-sub-1", name: "เสื้อเชิ้ต", type: "sub", parentId: "cat-main-1" },
        { id: "cat-sub-2", name: "กางเกงขายาว", type: "sub", parentId: "cat-main-1" },
        { id: "brand-1", name: "Minimal Label", type: "brand", parentId: "cat-sub-1" },
        { id: "brand-2", name: "Urban Crew", type: "brand", parentId: "cat-sub-1" },
        { id: "cat-main-2", name: "เสื้อผ้าผู้หญิง", type: "main", parentId: null },
        { id: "cat-sub-3", name: "เดรสและชุดแซก", type: "sub", parentId: "cat-main-2" },
        { id: "brand-3", name: "Aura Studio", type: "brand", parentId: "cat-sub-3" }
    ],
    products: [
        { id: "p-1", name: "เสื้อเชิ้ต Minimalist White Shirt", img: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500", catId: "brand-1", price: 1500, code: "25%=2000", keywords: "shirt,white", link: "#" },
        { id: "p-2", name: "กางเกง Chino Slim Fit", img: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500", catId: "cat-sub-2", price: 1800, code: "25%=2000", keywords: "pants,chino", link: "#" },
        { id: "p-3", name: "เดรสผ้าลินิน Linen Summer Dress", img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500", catId: "brand-3", price: 2900, code: "10%=500", keywords: "dress,linen", link: "#" }
    ]
};

let currentSlideIndex = 0;
let selectedCategoryFilter = null; 
let activeMainCategoryContext = null; 
let isAdminLoggedIn = false;
let draggedProductCard = null;

// อ้างอิงเอกสารในหมวดหมู่ของ Cloud Firestore
const storeDocRef = doc(db, 'config', 'storeData');

// 1. ดักจับการเปลี่ยนแปลงข้อมูลจาก Cloud Firestore
onSnapshot(storeDocRef, (snapshot) => {
    if (snapshot.exists()) {
        const data = snapshot.data();
        // ดึงข้อมูลมาใช้งาน ถ้าข้อมูลส่วนไหนว่างจากการลบ ให้ตั้งเป็น Array ว่างทันที
        storeData.slides = data.slides || [];
        storeData.categories = data.categories || [];
        storeData.products = data.products || [];
    } else {
        // หาก Firebase ไม่มีข้อมูล (เช่น พึ่งเปิดใช้งานครั้งแรก)
        storeData.slides = [];
        storeData.categories = [];
        storeData.products = [];
    }
    initApp();
});

// 2. ฟังก์ชันส่งข้อมูลไปบันทึกบน Cloud Firestore เมื่อมีการลบหรือแก้ไข
function saveData() {
    setDoc(storeDocRef, {
        slides: storeData.slides || [],
        categories: storeData.categories || [],
        products: storeData.products || []
    }).then(() => {
        initApp(); 
    }).catch((error) => {
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลไปที่ Firestore: " + error.message);
    });
}

// ตรวจสอบสถานะการ Login จาก Firebase Auth
onAuthStateChanged(auth, (user) => {
    if (user) {
        isAdminLoggedIn = true;
        if(document.getElementById('admin-panel')) document.getElementById('admin-panel').style.display = 'block';
    } else {
        isAdminLoggedIn = false;
        if(document.getElementById('admin-panel')) document.getElementById('admin-panel').style.display = 'none';
    }
    initApp();
});

function initApp() {
    renderSlider();
    renderCategoriesMenu();
    renderProducts();
    renderAdminPanel();
}

// --- BANNER SLIDER ---
function renderSlider() {
    const wrapper = document.getElementById('slider-wrapper');
    const dotsContainer = document.getElementById('slider-dots-container');
    if (!wrapper) return;
    if (!storeData.slides || storeData.slides.length === 0) {
        wrapper.innerHTML = `<div class="slide-item"><p style="text-align:center; padding-top:100px;">ไม่มีรูปสไลด์หน้าปก</p></div>`;
        return;
    }
    wrapper.innerHTML = storeData.slides.map(slide => `
        <div class="slide-item"><img src="${slide.img}" onclick="if('${slide.link}'!=='#') window.open('${slide.link}','_blank')" style="cursor:pointer;"></div>
    `).join('');
    if (dotsContainer) {
        dotsContainer.innerHTML = storeData.slides.map((_, idx) => `
            <span class="dot ${idx === currentSlideIndex ? 'active' : ''}" onclick="jumpToSlide(${idx})"></span>
        `).join('');
    }
    updateSliderPosition();
}

function moveSlider(dir) {
    const total = storeData.slides.length;
    if (total <= 1) return;
    currentSlideIndex = (currentSlideIndex + dir + total) % total;
    updateSliderPosition();
}

function jumpToSlide(idx) { currentSlideIndex = idx; updateSliderPosition(); }

function updateSliderPosition() {
    const wrapper = document.getElementById('slider-wrapper');
    if (wrapper) wrapper.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    document.querySelectorAll('.slider-dots .dot').forEach((d, i) => d.className = `dot ${i===currentSlideIndex?'active':''}`);
}

// --- DISCOUNT FORMULA ---
function calculateDiscountPrice(originalPrice, codeStr) {
    if (!codeStr || !codeStr.includes('=')) return originalPrice;
    try {
        const parts = codeStr.split('=');
        const percent = parseFloat(parts[0].replace('%', ''));
        const maxDiscount = parseFloat(parts[1]);
        if (isNaN(percent) || isNaN(maxDiscount)) return originalPrice;
        return Math.round(originalPrice - Math.min((originalPrice * percent) / 100, maxDiscount));
    } catch (e) { return originalPrice; }
}

// --- POPUP SYSTEM ---
function openCategoryWorkflow(mainCatId) {
    activeMainCategoryContext = mainCatId;
    const mainCat = storeData.categories.find(c => c.id === mainCatId);
    document.getElementById('popup-step-title').innerText = `${mainCat.name} › เลือกหมวดหมู่ย่อย`;
    
    const btnViewAllMain = document.getElementById('btn-view-all-main');
    btnViewAllMain.innerText = `ดูสินค้าทั้งหมดใน "${mainCat.name}"`;
    btnViewAllMain.onclick = () => applyCategoryFilterAndReset(mainCatId, mainCat.name);

    const subs = storeData.categories.filter(c => c.type === 'sub' && c.parentId === mainCatId);
    const container = document.getElementById('popup-subcat-list');
    container.innerHTML = subs.length === 0 ? `<p style="grid-column:1/-1; text-align:center; color:#777;">ไม่มีหมวดหมู่ย่อย</p>` :
        subs.map(s => `<div class="selection-item-btn" onclick="advanceToBrandStep('${s.id}')">${s.name}</div>`).join('');

    document.getElementById('popup-subcat-step').classList.remove('hidden');
    document.getElementById('popup-brand-step').classList.add('hidden');
    document.getElementById('category-popup').classList.add('active');
}

function advanceToBrandStep(subCatId) {
    const subCat = storeData.categories.find(c => c.id === subCatId);
    const mainCat = storeData.categories.find(c => c.id === activeMainCategoryContext);
    document.getElementById('popup-step-title').innerText = `${mainCat.name} › ${subCat.name} › เลือกแบรนด์`;
    
    const btnViewAllSub = document.getElementById('btn-view-all-sub');
    btnViewAllSub.innerText = `ดูสินค้าทั้งหมดในหมวด "${subCat.name}"`;
    btnViewAllSub.onclick = () => applyCategoryFilterAndReset(subCatId, subCat.name);

    const brands = storeData.categories.filter(c => c.type === 'brand' && c.parentId === subCatId);
    const container = document.getElementById('popup-brand-list');
    container.innerHTML = brands.length === 0 ? `<p style="grid-column:1/-1; text-align:center; color:#777;">ไม่มีแบรนด์เฉพาะในหมวดนี้</p>` :
        brands.map(b => `<div class="selection-item-btn" onclick="applyCategoryFilterAndReset('${b.id}', '${b.name}')">${b.name}</div>`).join('');

    document.getElementById('popup-subcat-step').classList.add('hidden');
    document.getElementById('popup-brand-step').classList.remove('hidden');
}

function backToSubcatStep() { if (activeMainCategoryContext) openCategoryWorkflow(activeMainCategoryContext); }

function applyCategoryFilterAndReset(id, labelName) {
    selectedCategoryFilter = id;
    const viewTitle = document.getElementById('current-view-title');
    if (viewTitle) viewTitle.innerText = labelName;
    closePopup('category-popup');
    renderProducts();
}

function closePopup(id) { 
    const popup = document.getElementById(id);
    if(popup) popup.classList.remove('active'); 
}

// --- RENDER MENUS ---
function renderCategoriesMenu() {
    if (!storeData.categories) return;
    const mainCategories = storeData.categories.filter(c => c.type === 'main');
    
    const sidebarTree = document.getElementById('sidebar-categories-tree');
    let sidebarHTML = `<button class="sidebar-cat-btn" onclick="applyCategoryFilterAndReset(null, 'สินค้าทั้งหมด')"><span>แสดงสินค้าทั้งหมด</span><span class="arrow-indicator">▪</span></button>`;
    mainCategories.forEach(cat => {
        sidebarHTML += `<button class="sidebar-cat-btn" onclick="openCategoryWorkflow('${cat.id}')"><span>${cat.name}</span><span class="arrow-indicator">›</span></button>`;
    });
    if(sidebarTree) sidebarTree.innerHTML = sidebarHTML;

    const mobileNav = document.getElementById('mobile-categories');
    let mobHTML = `<div class="mobile-nav-btn" onclick="applyCategoryFilterAndReset(null, 'สินค้าทั้งหมด')">ทั้งหมด</div>`;
    mainCategories.forEach(cat => { mobHTML += `<div class="mobile-nav-btn" onclick="openCategoryWorkflow('${cat.id}')">${cat.name}</div>`; });
    if(mobileNav) mobileNav.innerHTML = mobHTML;
}

function getProductMatchesFilter(productCatId, targetFilterId) {
    if (!targetFilterId) return true;
    if (productCatId === targetFilterId) return true;
    const currentCatObj = storeData.categories.find(c => c.id === productCatId);
    if (currentCatObj && currentCatObj.parentId === targetFilterId) return true;
    if (currentCatObj && currentCatObj.type === 'brand') {
        const parentSub = storeData.categories.find(c => c.id === currentCatObj.parentId);
        if (parentSub && parentSub.parentId === targetFilterId) return true;
    }
    if (currentCatObj && currentCatObj.type === 'sub' && currentCatObj.parentId === targetFilterId) return true;
    return false;
}

// --- RENDER PRODUCTS GRID & DRAG DROP ---
function renderProducts() {
    const grid = document.getElementById('products-grid');
    const searchEl = document.getElementById('global-search');
    const query = searchEl ? searchEl.value.toLowerCase() : '';
    const sortEl = document.getElementById('product-sort-select');
    const sortType = sortEl ? sortEl.value : '';
    if (!grid) return;

    if (!storeData.products) storeData.products = [];
    let items = [...storeData.products];

    if (selectedCategoryFilter) {
        items = items.filter(p => getProductMatchesFilter(p.catId, selectedCategoryFilter));
    }
    if (query) {
        items = items.filter(p => p.name.toLowerCase().includes(query) || (p.keywords && p.keywords.toLowerCase().includes(query)));
    }

    if (sortType === 'price-asc') {
        items.sort((a, b) => calculateDiscountPrice(a.price, a.code) - calculateDiscountPrice(b.price, b.code));
    } else if (sortType === 'price-desc') {
        items.sort((a, b) => calculateDiscountPrice(b.price, b.code) - calculateDiscountPrice(a.price, a.code));
    }

    if (items.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1; padding: 40px 10px; color:#999; text-align:center;">ไม่พบสินค้า</p>`;
        return;
    }

    grid.innerHTML = items.map(p => {
        const discounted = calculateDiscountPrice(p.price, p.code);
        const isDraggable = isAdminLoggedIn ? 'draggable="true"' : 'draggable="false"';
        const dragHandleHint = isAdminLoggedIn ? `<div class="drag-image-hint">✨ แอดมิน: คลิกค้างที่รูปเพื่อลากย้ายตำแหน่งได้</div>` : '';
        
        const adminFloatingButtons = isAdminLoggedIn ? `
            <div class="product-admin-actions">
                <button class="btn-action-floating btn-edit-float" onclick="editProductDirectly('${p.id}')" title="แก้ไขสินค้านี้">✏️</button>
                <button class="btn-action-floating btn-delete-float" onclick="deleteProductDirectly('${p.id}')" title="ลบสินค้านี้">✕</button>
            </div>
        ` : '';

        return `
            <div class="product-card" ${isDraggable} data-id="${p.id}" style="${isAdminLoggedIn ? 'cursor: move;' : ''}">
                <div class="product-img-box">
                    ${adminFloatingButtons}
                    <img src="${p.img}" draggable="false">
                    ${dragHandleHint}
                </div>
                <div class="product-info">
                    <h4 class="product-title">${p.name}</h4>
                    <div class="price-container">
                        ${p.code && discounted < p.price ? `<span class="original-price">฿${p.price}</span>` : ''}
                        <span class="discount-price">฿${discounted}</span>
                    </div>
                    <button class="btn btn-primary btn-full" onclick="window.open('${p.link}', '_blank')">สั่งซื้อสินค้า</button>
                </div>
            </div>
        `;
    }).join('');

    if (isAdminLoggedIn) {
        bindProductCardDragAndDrop();
    }
}

function bindProductCardDragAndDrop() {
    const grid = document.getElementById('products-grid');
    const cards = grid.querySelectorAll('.product-card');

    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedProductCard = card;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', card.getAttribute('data-id'));
            setTimeout(() => {
                card.style.opacity = "0.4";
                card.style.transform = "scale(0.95)";
            }, 0);
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const targetCard = e.target.closest('.product-card');
            if (targetCard && targetCard !== draggedProductCard) {
                const rect = targetCard.getBoundingClientRect();
                const nextNode = (e.clientX - rect.left > rect.width / 2) ? targetCard.nextSibling : targetCard;
                grid.insertBefore(draggedProductCard, nextNode);
            }
        });

        card.addEventListener('dragend', () => {
            card.style.opacity = "1";
            card.style.transform = "none";
            draggedProductCard = null;
            showFloatingSaveButton();
        });
    });
}

function showFloatingSaveButton() {
    if (document.getElementById('floating-save-order-btn')) return;

    const saveBtn = document.createElement('button');
    saveBtn.id = 'floating-save-order-btn';
    saveBtn.innerHTML = '💾 คุณมีการเปลี่ยนลำดับรูปภาพสินค้า [คลิกที่นี่เพื่อบันทึกข้อมูลลง Firebase]';
    saveBtn.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: #007bff; color: white; border: none; padding: 15px 30px;
        font-size: 16px; font-weight: bold; border-radius: 50px; cursor: pointer;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3); z-index: 99999;
    `;
    
    saveBtn.onclick = function() {
        const currentCards = document.querySelectorAll('#products-grid .product-card');
        const reorderedProducts = [];

        currentCards.forEach(c => {
            const id = c.getAttribute('data-id');
            const match = storeData.products.find(p => p.id === id);
            if (match) reorderedProducts.push(match);
        });

        if (reorderedProducts.length > 0) {
            storeData.products = reorderedProducts;
            set(ref(db, 'storeData/products'), storeData.products).then(() => {
                saveBtn.remove();
                initApp();
                alert('💾 บันทึกลำดับสินค้าใหม่เข้า Firebase เรียบร้อยแล้ว!');
            });
        }
    };
    document.body.appendChild(saveBtn);
}

// --- AUTHENTICATION CONTROLLER ---
function handleLogin() {
    const email = document.getElementById('admin-user').value.trim();
    const pass = document.getElementById('admin-pass').value.trim();

    if(!email || !pass) return alert('กรุณากรอก Email และ Password ให้ครบถ้วน');

    signInWithEmailAndPassword(auth, email, pass)
        .then(() => {
            closePopup('login-popup');
            document.getElementById('admin-user').value = '';
            document.getElementById('admin-pass').value = '';
            alert('ยินดีต้อนรับเข้าสู่ระบบจัดการหลังบ้านครับ');
        })
        .catch((error) => {
            alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + error.message);
        });
}

function handleLogout() {
    signOut(auth).then(() => {
        const oldBtn = document.getElementById('floating-save-order-btn');
        if(oldBtn) oldBtn.remove();
        cancelProductEdit();
        cancelSlideEdit();
        alert('ออกจากระบบเรียบร้อย');
    });
}

function handleLoginKeyPress(e) { 
    if (e.key === 'Enter') {
        handleLogin(); 
    }
}

// --- SLIDE BANNER ACTIONS ---
function saveSlideAction() {
    const editIdxStr = document.getElementById('edit-slide-idx').value;
    const img = document.getElementById('new-slide-img').value.trim();
    const link = document.getElementById('new-slide-link').value.trim() || '#';
    const code = document.getElementById('new-slide-code').value.trim();

    if (!img) return alert('กรุณาระบุ URL รูปภาพสไลด์หน้าปก');

    if (editIdxStr !== "") {
        const idx = parseInt(editIdxStr);
        if (idx >= 0 && idx < storeData.slides.length) {
            storeData.slides[idx] = { img, link, code };
            alert('อัปเดตข้อมูลภาพหน้าปกสำเร็จแล้ว!');
        }
        cancelSlideEdit();
    } else {
        storeData.slides.push({ img, link, code });
        clearSlideForm();
    }
    saveData();
}

function editSlideDirectly(idx) {
    const slide = storeData.slides[idx];
    if (!slide) return;

    document.getElementById('edit-slide-idx').value = idx;
    document.getElementById('new-slide-img').value = slide.img;
    document.getElementById('new-slide-link').value = slide.link;
    document.getElementById('new-slide-code').value = slide.code || '';

    document.getElementById('slide-form-title').innerText = `✏️ กำลังแก้ไขภาพหน้าปกแบนเนอร์ (สไลด์ที่ ${idx + 1})`;
    document.getElementById('btn-save-slide').innerText = 'อัปเดตภาพหน้าปก';
    document.getElementById('btn-cancel-slide').classList.remove('hidden');
    document.getElementById('slide-form-title').scrollIntoView({ behavior: 'smooth' });
}

function cancelSlideEdit() {
    clearSlideForm();
    document.getElementById('edit-slide-idx').value = "";
    document.getElementById('slide-form-title').innerText = '1) จัดการรูปภาพสไลด์หน้าปก';
    document.getElementById('btn-save-slide').innerText = 'เพิ่มรูปสไลด์';
    document.getElementById('btn-cancel-slide').classList.add('hidden');
}

function deleteSlide(idx) {
    if(confirm('ต้องการลบภาพหน้าปกสไลด์นี้ใช่หรือไม่?')) {
        storeData.slides.splice(idx, 1);
        if (document.getElementById('edit-slide-idx').value === String(idx)) cancelSlideEdit();
        if(currentSlideIndex >= storeData.slides.length && currentSlideIndex > 0) currentSlideIndex = storeData.slides.length - 1;
        saveData();
    }
}

function clearSlideForm() {
    document.getElementById('new-slide-img').value = '';
    document.getElementById('new-slide-link').value = '';
    document.getElementById('new-slide-code').value = '';
}

// --- PRODUCT MANIPULATION ---
function saveProductAction() {
    const editId = document.getElementById('edit-prod-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const img = document.getElementById('prod-img').value.trim();
    const catId = document.getElementById('prod-cat-select').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const code = document.getElementById('prod-code').value.trim();
    const keywords = document.getElementById('prod-keywords').value.trim();
    const link = document.getElementById('prod-link').value.trim() || '#';

    if (!name || !img || !catId || isNaN(price)) return alert('กรุณากรอกข้อมูลสินค้าให้ครบถ้วน');

    if (editId) {
        const pIndex = storeData.products.findIndex(p => p.id === editId);
        if (pIndex !== -1) {
            storeData.products[pIndex] = { id: editId, name, img, catId, price, code, keywords, link };
        }
        cancelProductEdit();
        alert('แก้ไขข้อมูลสินค้าเรียบร้อยครับ!');
    } else {
        const newProd = { id: 'p-' + Date.now(), name, img, catId, price, code, keywords, link };
        storeData.products.push(newProd);
        clearProductForm();
        alert('เพิ่มสินค้าใหม่ลงระบบสำเร็จแล้ว!');
    }
    saveData();
}

function editProductDirectly(id) {
    const prod = storeData.products.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('edit-prod-id').value = prod.id;
    document.getElementById('prod-name').value = prod.name;
    document.getElementById('prod-img').value = prod.img;
    document.getElementById('prod-cat-select').value = prod.catId;
    document.getElementById('prod-price').value = prod.price;
    document.getElementById('prod-code').value = prod.code || '';
    document.getElementById('prod-keywords').value = prod.keywords || '';
    document.getElementById('prod-link').value = prod.link || '#';

    document.getElementById('product-form-title').innerText = '✏️ กำลังแก้ไขสินค้า: ' + prod.name;
    document.getElementById('btn-save-product').innerText = 'อัปเดตข้อมูลสินค้า';
    document.getElementById('btn-cancel-edit-product').classList.remove('hidden');
    document.getElementById('product-form-title').scrollIntoView({ behavior: 'smooth' });
}

function cancelProductEdit() {
    clearProductForm();
    document.getElementById('edit-prod-id').value = '';
    document.getElementById('product-form-title').innerText = '2) เพิ่มสินค้าใหม่';
    document.getElementById('btn-save-product').innerText = 'บันทึกสินค้า';
    document.getElementById('btn-cancel-edit-product').classList.add('hidden');
}

function deleteProductDirectly(id) {
    if (confirm('คุณต้องการลบสินค้าชิ้นนี้ใช่หรือไม่?')) {
        storeData.products = storeData.products.filter(p => p.id !== id);
        if (document.getElementById('edit-prod-id').value === id) cancelProductEdit();
        
        saveData(); // <--- ต้องมีบรรทัดนี้เพื่อบันทึกการลบลง Firebase
    }
}

function clearProductForm() {
    document.getElementById('prod-name').value = '';
    document.getElementById('prod-img').value = '';
    document.getElementById('prod-cat-select').value = '';
    document.getElementById('prod-price').value = '';
    document.getElementById('prod-code').value = '';
    document.getElementById('prod-keywords').value = '';
    document.getElementById('prod-link').value = '';
}

// --- CATEGORY MANIPULATION ---
function addCategory() {
    const type = document.getElementById('cat-type-select').value;
    const name = document.getElementById('new-cat-name').value.trim();
    const parentId = type !== 'main' ? document.getElementById('parent-cat-select').value : null;

    if (!name) return alert('กรุณาระบุชื่อหมวดหมู่');
    if (type !== 'main' && !parentId) return alert('กรุณาเลือกโครงสร้างหมวดหมู่ต้นทาง');

    const newCat = { id: 'cat-' + Date.now(), name, type, parentId };
    storeData.categories.push(newCat);
    document.getElementById('new-cat-name').value = '';
    saveData();
}

function moveCategoryOrder(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= storeData.categories.length) return;
    const temp = storeData.categories[index];
    storeData.categories[index] = storeData.categories[targetIndex];
    storeData.categories[targetIndex] = temp;
    saveData();
}

function deleteCategory(id) {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้?')) {
        storeData.categories = storeData.categories.filter(c => c.id !== id);
        
        saveData(); // <--- ต้องมีบรรทัดนี้เพื่อบันทึกการลบลง Firebase
    }
}

function toggleCategoryParentSelect() {
    const type = document.getElementById('cat-type-select').value;
    const parentSelect = document.getElementById('parent-cat-select');
    if (!parentSelect) return;
    
    if (type === 'main') {
        parentSelect.classList.add('hidden');
    } else if (type === 'sub') {
        parentSelect.classList.remove('hidden');
        parentSelect.innerHTML = storeData.categories.filter(c => c.type === 'main')
            .map(c => `<option value="${c.id}">อยู่ภายใต้หมวดหมู่หลัก: ${c.name}</option>`).join('');
    } else if (type === 'brand') {
        parentSelect.classList.remove('hidden');
        parentSelect.innerHTML = storeData.categories.filter(c => c.type === 'sub')
            .map(c => `<option value="${c.id}">อยู่ภายใต้หมวดหมู่ย่อย: ${c.name}</option>`).join('');
    }
}

// --- BULK QUICK OPERATIONS ---
function handleInlinePriceEnter(e, prodId, input) {
    if (e.key === 'Enter') {
        const val = parseFloat(input.value);
        if (isNaN(val) || val < 0) return alert('ใส่ตัวเลขที่ถูกต้อง');
        const prod = storeData.products.find(p => p.id === prodId);
        if (prod) { prod.price = val; saveData(); alert('อัปเดตราคาด่วนเรียบร้อยครับ!'); }
    }
}

function selectProductsBySpecificCode(targetCode) {
    document.querySelectorAll('.bulk-item-check').forEach(box => box.checked = false);
    if (!targetCode) return;
    document.querySelectorAll('#bulk-product-list .bulk-row').forEach(row => {
        const badge = row.querySelector('.badge');
        if (badge && badge.getAttribute('data-code') === targetCode) {
            const chk = row.querySelector('.bulk-item-check');
            if (chk) chk.checked = true;
        }
    });
}

function applyBulkCodeChange() {
    const checked = document.querySelectorAll('.bulk-item-check:checked');
    if (checked.length === 0) return alert('กรุณาเลือกสินค้าอย่างน้อย 1 ชิ้นจากในตารางก่อนครับ');
    const newCode = document.getElementById('bulk-code-new').value.trim();
    const ids = Array.from(checked).map(b => b.value);
    
    storeData.products.forEach(p => { if (ids.includes(p.id)) p.code = newCode; });
    document.getElementById('bulk-code-new').value = '';
    saveData();
    alert('เปลี่ยนโค้ดส่วนลดสินค้าที่เลือกกลุ่มนี้สำเร็จแล้ว!');
}

function toggleSelectAllBulk(master) { 
    document.querySelectorAll('.bulk-item-check').forEach(b => b.checked = master.checked); 
}

// --- RENDER ADMIN BACKEND PANEL ---
function renderAdminPanel() {
    const adminSlidesList = document.getElementById('admin-slides-list');
    if (adminSlidesList && storeData.slides) {
        adminSlidesList.innerHTML = storeData.slides.map((slide, idx) => `
            <li>
                <div style="display:flex; align-items:center; gap: 12px; max-width:65%;">
                    <img src="${slide.img}" style="width:55px; height:34px; object-fit:cover; border-radius:6px; border:1px solid #ddd;">
                    <span style="font-size:12px; line-height:1.4; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
                        <strong>สไลด์ที่ ${idx + 1}</strong> <br>
                        🔑 โค้ด: <span class="badge" style="background:#222; font-size:10px;">${slide.code || 'ไม่มี'}</span>
                    </span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="editSlideDirectly(${idx})" style="color:blue; cursor:pointer; padding:3px 8px; border:1px solid blue; border-radius:4px; background:#fff;">✏️ แก้ไข</button>
                    <button onclick="deleteSlide(${idx})" style="color:red; cursor:pointer; padding:3px 8px; border:1px solid red; border-radius:4px; background:#fff;">✕ ลบ</button>
                </div>
            </li>
        `).join('');
    }

    const bulkTbody = document.getElementById('bulk-product-list');
    if(bulkTbody && storeData.products) {
        bulkTbody.innerHTML = storeData.products.map(p => `
            <tr class="bulk-row" data-id="${p.id}" id="row-${p.id}">
                <td style="text-align:center; color:#ccc;">▫</td>
                <td><input type="checkbox" class="bulk-item-check" value="${p.id}" id="chk-${p.id}"></td>
                <td><img src="${p.img}" class="bulk-img" style="width:45px; height:45px; object-fit:cover; border-radius:8px;"></td>
                <td><strong>${p.name}</strong></td>
                <td><input type="number" class="inline-edit-price" value="${p.price}" data-id="${p.id}" style="width:100px; padding:6px; text-align:center;"></td>
                <td><span class="badge" data-code="${p.code || ''}">${p.code || 'ไม่มีโค้ด'}</span></td>
            </tr>
        `).join('');
        
        bulkTbody.querySelectorAll('.inline-edit-price').forEach(input => {
            input.addEventListener('keypress', (e) => {
                handleInlinePriceEnter(e, input.getAttribute('data-id'), input);
            });
        });
    }

    if (storeData.products) {
        const distinctCodes = [...new Set(storeData.products.map(p => p.code).filter(Boolean))];
        let filterOptions = '<option value="">-- เลือกโค้ดเพื่อติ๊ก Checkbox สินค้าทั้งหมดที่ใช้โค้ดนี้ --</option>';
        distinctCodes.forEach(code => { filterOptions += `<option value="${code}">โค้ด "${code}" (${storeData.products.filter(p => p.code === code).length} ชิ้น)</option>`; });
        const adminCodeSelect = document.getElementById('admin-filter-code-select');
        if (adminCodeSelect) adminCodeSelect.innerHTML = filterOptions;
    }

    const adminCatList = document.getElementById('admin-category-list');
    if (adminCatList && storeData.categories) {
        adminCatList.innerHTML = storeData.categories.map((c, index) => {
            let typeLabel = c.type === 'main' ? '★ หลัก' : c.type === 'sub' ? '↳ ย่อย' : '▫ แบรนด์';
            return `
                <li>
                    <span><strong>[${typeLabel}]</strong> ${c.name}</span>
                    <div class="sort-btns" style="display: flex; gap: 5px;">
                        <button onclick="moveCategoryOrder(${index}, -1)" style="cursor:pointer; padding: 2px 6px;">↑</button>
                        <button onclick="moveCategoryOrder(${index}, 1)" style="cursor:pointer; padding: 2px 6px;">↓</button>
                        <button onclick="deleteCategory('${c.id}')" style="color:red; margin-left:10px; cursor:pointer; padding: 2px 6px;">✕</button>
                    </div>
                </li>
            `;
        }).join('');
    }

    const prodCatSelect = document.getElementById('prod-cat-select');
    if (prodCatSelect && storeData.categories) {
        prodCatSelect.innerHTML = '<option value="">เลือกหมวดหมู่ย่อยหรือแบรนด์ปลายทาง</option>' + 
            storeData.categories.filter(c => c.type !== 'main')
            .map(c => `<option value="${c.id}">[${c.type === 'sub' ? 'หมวดหมู่ย่อย' : 'แบรนด์'}] ${c.name}</option>`).join('');
    }
}

// --- GLOBAL EXPOSURE ---
window.moveSlider = moveSlider;
window.jumpToSlide = jumpToSlide;
window.openCategoryWorkflow = openCategoryWorkflow;
window.advanceToBrandStep = advanceToBrandStep;
window.backToSubcatStep = backToSubcatStep;
window.applyCategoryFilterAndReset = applyCategoryFilterAndReset;
window.closePopup = closePopup;
window.editProductDirectly = editProductDirectly;
window.deleteProductDirectly = deleteProductDirectly;
window.editSlideDirectly = editSlideDirectly;
window.deleteSlide = deleteSlide;
window.moveCategoryOrder = moveCategoryOrder;
window.deleteCategory = deleteCategory;

// --- DOM EVENT BINDING ---
document.addEventListener('DOMContentLoaded', () => {
    const globalSearch = document.getElementById('global-search');
    if(globalSearch) globalSearch.addEventListener('input', renderProducts);

    const sortSelect = document.getElementById('product-sort-select');
    if(sortSelect) sortSelect.addEventListener('change', renderProducts);

    const adminLoginBtn = document.getElementById('admin-login-btn');
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => {
            const loginPopup = document.getElementById('login-popup');
            if(loginPopup) {
                loginPopup.classList.add('active');
                const adminUser = document.getElementById('admin-user');
                if(adminUser) adminUser.focus();
            }
        });
    }

    if (document.getElementById('close-login-popup-btn')) document.getElementById('close-login-popup-btn').addEventListener('click', () => closePopup('login-popup'));
    if (document.getElementById('cancel-login-popup-btn')) document.getElementById('cancel-login-popup-btn').addEventListener('click', () => closePopup('login-popup'));
    if (document.getElementById('close-category-popup-btn')) document.getElementById('close-category-popup-btn').addEventListener('click', () => closePopup('category-popup'));

    const adminPassInput = document.getElementById('admin-pass');
    if (adminPassInput) adminPassInput.addEventListener('keypress', handleLoginKeyPress);

    const adminUserInput = document.getElementById('admin-user');
    if (adminUserInput) adminUserInput.addEventListener('keypress', handleLoginKeyPress);

    if (document.getElementById('btn-submit-login')) document.getElementById('btn-submit-login').addEventListener('click', handleLogin);
    if (document.getElementById('admin-logout-btn')) document.getElementById('admin-logout-btn').addEventListener('click', handleLogout);

    if (document.getElementById('btn-save-slide')) document.getElementById('btn-save-slide').addEventListener('click', saveSlideAction);
    if (document.getElementById('btn-cancel-slide')) document.getElementById('btn-cancel-slide').addEventListener('click', cancelSlideEdit);
    
    const catTypeSelect = document.getElementById('cat-type-select');
    if (catTypeSelect) catTypeSelect.addEventListener('change', toggleCategoryParentSelect);
    
    if (document.getElementById('btn-add-category')) document.getElementById('btn-add-category').addEventListener('click', addCategory);
    if (document.getElementById('btn-save-product')) document.getElementById('btn-save-product').addEventListener('click', saveProductAction);
    if (document.getElementById('btn-cancel-edit-product')) document.getElementById('btn-cancel-edit-product').addEventListener('click', cancelProductEdit);
    
    const selectAllBulk = document.getElementById('select-all-bulk');
    if (selectAllBulk) selectAllBulk.addEventListener('click', function() { toggleSelectAllBulk(this); });
    
    const codeFilterSelect = document.getElementById('admin-filter-code-select');
    if(codeFilterSelect) codeFilterSelect.addEventListener('change', function() { selectProductsBySpecificCode(this.value); });
    
    if(document.getElementById('btn-apply-bulk-code')) document.getElementById('btn-apply-bulk-code').addEventListener('click', applyBulkCodeChange);
});