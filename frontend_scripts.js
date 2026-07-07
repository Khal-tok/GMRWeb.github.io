let activeMapType = 'all'; 
let activeFilterDev = sessionStorage.getItem('activeFilterDev') || null;
let activeFilterFin = sessionStorage.getItem('activeFilterFin') || null;
let activeFilterSub = sessionStorage.getItem('activeFilterSub') || null;
let activeSearchQuery = sessionStorage.getItem('activeSearchQuery') || '';
let showAllDefault = false;

let buyerMap;
let mapClusterGroup;
let mapMarkers = {};

function initBuyerMap() {
    const centerLat = 14.3345; 
    const centerLng = 120.9028;
    buyerMap = L.map('buyerMap', { zoomControl: false, scrollWheelZoom: false }).setView([centerLat, centerLng], 11);
    
    L.control.zoom({ position: 'bottomright' }).addTo(buyerMap);

    const lightMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
    });
    const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
    });

    lightMap.addTo(buyerMap);

    const baseMaps = {
        "Minimal Map": lightMap,
        "Satellite": satelliteMap
    };
    L.control.layers(baseMaps, null, { position: 'topleft' }).addTo(buyerMap);

    mapClusterGroup = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 40 });
    buyerMap.addLayer(mapClusterGroup);
    
    allProperties.forEach((prop) => {
        let seed = parseInt(prop.id);
        let lat = centerLat + (Math.sin(seed) * 0.05);
        let lng = centerLng + (Math.cos(seed) * 0.05);
        if (prop.lat && prop.lng && prop.lat.trim() !== '') {
            lat = parseFloat(prop.lat); lng = parseFloat(prop.lng);
        }

        let typeClass = 'bg-house';
        let iconType = 'fa-home';
        let hType = (prop.house_type || '').toLowerCase();

        if (hType.includes('condo')) {
            typeClass = 'bg-condo';
            iconType = 'fa-building';
        } else if (hType.includes('farm')) {
            typeClass = 'bg-farm';
            iconType = 'fa-leaf';
        } else if (hType.includes('memorial') || hType.includes('burial')) {
            typeClass = 'bg-memorial';
            iconType = 'fa-monument';
        } else if (hType.includes('lot') && !hType.includes('house')) {
            typeClass = 'bg-farm'; 
            iconType = 'fa-leaf';
        }

        const marker = L.marker([lat, lng], { 
            icon: L.divIcon({ 
                html: `<div class="type-marker ${typeClass}" id="marker-${prop.id}"><i class="fas ${iconType}"></i></div>`, 
                className: 'custom-icon', 
                iconSize: [44, 44] 
            }) 
        });

        marker.on('click', () => {
            showPropertyDetails(prop.id);
        });
        
        mapMarkers[prop.id] = marker;
    });
}

function setMapFilter(type) {
    activeMapType = type;
    document.querySelectorAll('.map-filter-btn').forEach(btn => {
        if (btn.dataset.type === type) {
            btn.classList.add('ring-2', 'ring-offset-2', 'ring-emerald-600');
            btn.classList.remove('border', 'border-transparent');
        } else {
            btn.classList.remove('ring-2', 'ring-offset-2', 'ring-emerald-600');
            btn.classList.add('border', 'border-transparent');
        }
    });
    applyFilters(false);
}

function updateMapMarkers(filteredItems) {
    if (!mapClusterGroup) return;
    mapClusterGroup.clearLayers();
    if (filteredItems.length === 0) return;

    let bounds = [];
    filteredItems.forEach(p => {
        if (mapMarkers[p.id]) {
            mapClusterGroup.addLayer(mapMarkers[p.id]);
            bounds.push(mapMarkers[p.id].getLatLng());
        }
    });
    
    if (bounds.length > 0) {
        const groupBounds = L.latLngBounds(bounds);
        buyerMap.fitBounds(groupBounds, { padding: [50, 50], maxZoom: 13 });
    }
}

function initAdvancedFilters() {
    const locSelect = document.getElementById('advSearchLocation');
    const typeSelect = document.getElementById('advSearchType');

    let locations = new Set();
    let types = new Set();

    allProperties.forEach(p => {
        if(p.city && p.city.trim() !== '') locations.add(p.city);
        if(p.province && p.province.trim() !== '') locations.add(p.province);
        if(p.house_type && p.house_type.trim() !== '') types.add(p.house_type);
    });

    [...locations].sort().forEach(l => locSelect.add(new Option(l, l)));
    [...types].sort().forEach(t => typeSelect.add(new Option(t, t)));
    
    if(sessionStorage.getItem('advLoc')) locSelect.value = sessionStorage.getItem('advLoc');
    if(sessionStorage.getItem('advType')) typeSelect.value = sessionStorage.getItem('advType');
    if(sessionStorage.getItem('advPrice')) document.getElementById('advSearchPrice').value = sessionStorage.getItem('advPrice');
    if(activeSearchQuery) document.getElementById('advSearchKeyword').value = activeSearchQuery;
    
    if(activeFilterDev) document.getElementById('devBtnLabel').innerText = activeFilterDev;
    if(activeFilterFin) document.getElementById('finBtnLabel').innerText = activeFilterFin;
    if(activeFilterSub) document.getElementById('subBtnLabel').innerText = activeFilterSub;
}

function quickSearch(term) {
    document.getElementById('advSearchKeyword').value = term;
    runAdvancedSearch();
}

function runAdvancedSearch() {
    hideAllMenus();
    
    activeSearchQuery = document.getElementById('advSearchKeyword').value.trim().toLowerCase();
    const locVal = document.getElementById('advSearchLocation').value;
    
    const typeVal = document.getElementById('advSearchType').value;
    const priceVal = document.getElementById('advSearchPrice').value;
    
    sessionStorage.setItem('activeSearchQuery', activeSearchQuery);
    sessionStorage.setItem('advLoc', locVal);
    sessionStorage.setItem('advType', typeVal);
    sessionStorage.setItem('advPrice', priceVal);
    
    activeFilterDev = null; sessionStorage.removeItem('activeFilterDev'); document.getElementById('devBtnLabel').innerText = 'Developer';
    activeFilterFin = null; sessionStorage.removeItem('activeFilterFin'); document.getElementById('finBtnLabel').innerText = 'Financing';
    activeFilterSub = null; sessionStorage.removeItem('activeFilterSub'); document.getElementById('subBtnLabel').innerText = 'Subdivision';
    
    applyFilters(true);
}

function resetAdvancedFiltersUI() {
    document.getElementById('advSearchKeyword').value = '';
    document.getElementById('advSearchLocation').value = '';
    document.getElementById('advSearchType').value = '';
    document.getElementById('advSearchPrice').value = '';
    
    sessionStorage.removeItem('advLoc');
    sessionStorage.removeItem('advType');
    sessionStorage.removeItem('advPrice');
}

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); }
    });
}, { threshold: 0.1 });

function observeElements() {
    document.querySelectorAll('.reveal-on-scroll').forEach(el => scrollObserver.observe(el));
}

window.addEventListener('scroll', function() {
    const nav = document.getElementById('mainNav');
    if (window.scrollY > 10) { nav.classList.add('nav-scrolled'); } 
    else { nav.classList.remove('nav-scrolled'); }
});

const typewriterWords = ["House & Lot", "Farm Lots  ", "Condominiums", "Memorial Lots"];
let twWordIndex = 0; let twCharIndex = 0; let twIsDeleting = false;
let heroSlideIndex = 0;
let heroImages = [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80', 
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80', 
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80', 
    'https://images.unsplash.com/photo-1501862700950-18382cd41497?auto=format&fit=crop&w=1600&q=80'  
];

function initHeroSlideshow() {
    const container = document.getElementById('heroSlideshow');
    if(container) {
        container.innerHTML = heroImages.map((src, i) => `
            <img src="${src}" loading="${i === 0 ? 'eager' : 'lazy'}" class="absolute inset-0 w-full h-full object-cover hero-bg ${i === 0 ? 'hero-bg-active' : 'hero-bg-inactive'}" id="hero-slide-${i}" onerror="this.onerror=null; this.src='gmrlogo.jpg'; this.classList.remove('object-cover'); this.classList.add('object-contain', 'p-10', 'bg-white');">
        `).join('');
    }
}

function changeHeroSlide(newIndex) {
    const currentImg = document.getElementById(`hero-slide-${heroSlideIndex}`);
    if(currentImg) { currentImg.classList.remove('hero-bg-active'); currentImg.classList.add('hero-bg-inactive'); }
    heroSlideIndex = newIndex;
    const nextImg = document.getElementById(`hero-slide-${heroSlideIndex}`);
    if(nextImg) { nextImg.classList.remove('hero-bg-inactive'); nextImg.classList.add('hero-bg-active'); }
}

function runTypewriter() {
    const twElement = document.getElementById('typewriter-text');
    if (!twElement) return;

    const currentWord = typewriterWords[twWordIndex];
    if (twIsDeleting) {
        twElement.textContent = currentWord.substring(0, twCharIndex - 1);
        twCharIndex--;
    } else {
        twElement.textContent = currentWord.substring(0, twCharIndex + 1);
        twCharIndex++;
    }

    let typeSpeed = twIsDeleting ? 50 : 100;

    if (!twIsDeleting && twCharIndex === currentWord.length) {
        typeSpeed = 3000; twIsDeleting = true;
    } else if (twIsDeleting && twCharIndex === 0) {
        twIsDeleting = false;
        twWordIndex = (twWordIndex + 1) % typewriterWords.length;
        changeHeroSlide(twWordIndex); 
        typeSpeed = 500; 
    }
    setTimeout(runTypewriter, typeSpeed);
}

let currentImages = [];
let currentSlide = 0;

function openMobileMenu() {
    document.getElementById('mobileMenuOverlay').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('mobileMenuOverlay').classList.remove('opacity-0');
        document.getElementById('mobileMenu').classList.remove('translate-x-full');
    }, 10);
    document.body.classList.add('overflow-hidden');
}

function closeMobileMenu() {
    document.getElementById('mobileMenu').classList.add('translate-x-full');
    document.getElementById('mobileMenuOverlay').classList.add('opacity-0');
    setTimeout(() => {
        document.getElementById('mobileMenuOverlay').classList.add('hidden');
        
        const isRegOpen = document.getElementById('registerModal').classList.contains('active');
        const isPropOpen = !document.getElementById('singlePropertyModal').classList.contains('hidden');
        const isVTOpen = !document.getElementById('virtualTourModal').classList.contains('hidden');
        
        if (!isRegOpen && !isPropOpen && !isVTOpen) {
            document.body.classList.remove('overflow-hidden');
        }
    }, 500);
}

function goToStep2() {
    const name = document.getElementById('fullname').value.trim();
    const username = document.getElementById('username').value.trim();
    const contact = document.getElementById('contact').value.trim();
    const email = document.getElementById('email').value.trim();
    if(!name || !username || !contact || !email) { alert("Please fill in all fields."); return; }
    if(!email.includes('@')) { alert("Invalid email address."); return; }
    
    document.getElementById('step1').classList.add('hidden');
    document.getElementById('step2').classList.remove('hidden');
}

function goToStep1() {
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step1').classList.remove('hidden');
}

function openModal(title = '') { 
    document.getElementById('selectedProperty').value = title; 
    goToStep1(); 
    document.getElementById('registerModal').classList.add('active'); 
    document.body.classList.add('overflow-hidden');
}

function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    if(modal.classList.contains('active')) modal.classList.remove('active'); 
    modal.classList.add('hidden'); 
    
    if (document.getElementById('mobileMenuOverlay').classList.contains('hidden')) {
        document.body.classList.remove('overflow-hidden');
    }
}

function hideAllMenus() {
    document.querySelectorAll('.dropdown-menu, .submenu').forEach(m => m.classList.remove('show-dropdown'));
    const portalMenu = document.getElementById('portal-menu');
    if (portalMenu) portalMenu.classList.remove('active');
}

function toggleDropdown(e, id) {
    e.stopPropagation();
    const el = document.getElementById(id);
    const isShown = el.classList.contains('show-dropdown');
    hideAllMenus();
    if(!isShown) el.classList.add('show-dropdown');
}

function toggleSubmenu(e, id) {
    e.stopPropagation();
    const el = document.getElementById(id);
    const isShown = el.classList.contains('show-dropdown');
    document.querySelectorAll('.submenu').forEach(s => s.classList.remove('show-dropdown'));
    if(!isShown) el.classList.add('show-dropdown');
}

function togglePortal(e) { 
    e.stopPropagation();
    const menu = document.getElementById('portal-menu');
    if (menu) {
        const isActive = menu.classList.contains('active');
        hideAllMenus();
        if(!isActive) menu.classList.add('active');
    }
}

function filterByDeveloper(dev) {
    hideAllMenus();
    activeFilterDev = dev === 'All' ? null : dev;
    activeSearchQuery = ''; sessionStorage.removeItem('activeSearchQuery');
    
    if (activeFilterDev) {
        sessionStorage.setItem('activeFilterDev', activeFilterDev);
        document.getElementById('devBtnLabel').innerText = activeFilterDev;
    } else {
        sessionStorage.removeItem('activeFilterDev');
        document.getElementById('devBtnLabel').innerText = 'Developer';
    }
    resetAdvancedFiltersUI(); applyFilters(true);
}

function filterByFinancingQuick(fin) {
    hideAllMenus();
    activeFilterFin = fin === 'All' ? null : fin;
    activeSearchQuery = ''; sessionStorage.removeItem('activeSearchQuery');
    
    if (activeFilterFin) {
        sessionStorage.setItem('activeFilterFin', activeFilterFin);
        document.getElementById('finBtnLabel').innerText = activeFilterFin;
    } else {
        sessionStorage.removeItem('activeFilterFin');
        document.getElementById('finBtnLabel').innerText = 'Financing';
    }
    resetAdvancedFiltersUI(); applyFilters(true);
}

function filterBySubdivisionQuick(sub) {
    hideAllMenus();
    activeFilterSub = sub === 'All' ? null : sub;
    activeSearchQuery = ''; sessionStorage.removeItem('activeSearchQuery');
    
    if (activeFilterSub) {
        sessionStorage.setItem('activeFilterSub', activeFilterSub);
        document.getElementById('subBtnLabel').innerText = activeFilterSub;
    } else {
        sessionStorage.removeItem('activeFilterSub');
        document.getElementById('subBtnLabel').innerText = 'Subdivision';
    }
    resetAdvancedFiltersUI(); applyFilters(true);
}

function filterByExactDeveloperProperty(dev, prop) {
    hideAllMenus();
    activeFilterDev = dev;
    activeSearchQuery = prop.toLowerCase();
    sessionStorage.setItem('activeFilterDev', dev);
    sessionStorage.setItem('activeSearchQuery', activeSearchQuery);
    
    document.getElementById('devBtnLabel').innerText = dev;
    document.getElementById('advSearchKeyword').value = prop;
    
    applyFilters(true);
}

function resetAndScroll() {
    activeSearchQuery = ''; activeFilterDev = null; activeFilterFin = null; activeFilterSub = null;
    showAllDefault = false; 
    
    sessionStorage.removeItem('activeSearchQuery');
    sessionStorage.removeItem('activeFilterDev');
    sessionStorage.removeItem('activeFilterFin');
    sessionStorage.removeItem('activeFilterSub');
    
    document.getElementById('devBtnLabel').innerText = 'Developer';
    document.getElementById('finBtnLabel').innerText = 'Financing';
    document.getElementById('subBtnLabel').innerText = 'Subdivision';
    
    activeMapType = 'all';
    document.querySelectorAll('.map-filter-btn').forEach(btn => {
        if (btn.dataset.type === 'all') {
            btn.classList.add('ring-2', 'ring-offset-2', 'ring-emerald-600');
            btn.classList.remove('border', 'border-transparent');
        } else {
            btn.classList.remove('ring-2', 'ring-offset-2', 'ring-emerald-600');
            btn.classList.add('border', 'border-transparent');
        }
    });
    
    resetAdvancedFiltersUI();
    applyFilters(true);
}

function loadMoreDefaultProperties() {
    showAllDefault = true;
    applyFilters(false); 
}

function applyFilters(scrollToGrid = false) {
    if (scrollToGrid) {
        document.getElementById('property-section').scrollIntoView({behavior: 'smooth', block: 'start'});
    }

    const advLoc = sessionStorage.getItem('advLoc') || '';
    const advType = sessionStorage.getItem('advType') || '';
    const advPrice = parseInt(sessionStorage.getItem('advPrice')) || 0;
    
    const isFiltered = activeSearchQuery || activeFilterDev || activeFilterFin || activeFilterSub || advLoc || advType || advPrice > 0 || activeMapType !== 'all';

    let res = allProperties.filter(p => {
        let matches = true;

        if (activeSearchQuery) {
            const title = p.title ? p.title.toLowerCase() : '';
            const city = p.city ? p.city.toLowerCase() : '';
            const prov = p.province ? p.province.toLowerCase() : '';
            const dev = p.developer ? p.developer.toLowerCase() : '';
            const locField = p.loc ? p.loc.toLowerCase() : ''; 
            const statusField = p.status ? p.status.toLowerCase() : '';

            if (!(title.includes(activeSearchQuery) || city.includes(activeSearchQuery) || prov.includes(activeSearchQuery) || dev.includes(activeSearchQuery) || locField.includes(activeSearchQuery) || statusField.includes(activeSearchQuery))) matches = false;
        }

        if (activeFilterDev && p.developer !== activeFilterDev) matches = false;
        
        if (activeFilterFin) {
            const pFin = p.financing ? p.financing.toLowerCase() : '';
            const searchFin = activeFilterFin.toLowerCase().replace(' financing', '');
            if (!pFin.includes(searchFin)) matches = false;
        }

        if (activeFilterSub && p.subdivision !== activeFilterSub) matches = false;
        if (advLoc && p.city !== advLoc && p.province !== advLoc) matches = false;
        if (advType && p.house_type !== advType) matches = false;
        
        if (advPrice > 0) {
            if (p.price) {
                let rawPrice = 0; const lowerPrice = p.price.toLowerCase();
                if (lowerPrice.includes('m')) { rawPrice = parseFloat(lowerPrice.replace(/[^0-9.]/g, '')) * 1000000; } 
                else if (lowerPrice.includes('k')) { rawPrice = parseFloat(lowerPrice.replace(/[^0-9.]/g, '')) * 1000; } 
                else { rawPrice = parseFloat(lowerPrice.replace(/[^0-9.]/g, '')); }
                if (rawPrice && rawPrice > advPrice) matches = false;
            } else { matches = false; }
        }

        if (activeMapType !== 'all') {
            let hType = (p.house_type || '').toLowerCase();
            let isCondo = hType.includes('condo');
            let isFarm = hType.includes('farm');
            let isMemorial = hType.includes('memorial') || hType.includes('burial');
            let isLotOnly = hType.includes('lot') && !hType.includes('house') && !isFarm && !isMemorial;
            let isHouse = !isCondo && !isFarm && !isMemorial && !isLotOnly; 

            if (activeMapType === 'house' && !isHouse) matches = false;
            if (activeMapType === 'condo' && !isCondo) matches = false;
            if (activeMapType === 'farm' && !isFarm && !isLotOnly) matches = false; 
            if (activeMapType === 'memorial' && !isMemorial) matches = false;
        }

        return matches;
    });

    render(res, isFiltered);
    updateMapMarkers(res); 
}

function generateCardHtml(p, delay) {
    return `
    <div class="reveal-on-scroll group cursor-pointer transform hover:-translate-y-2 transition-all duration-500" style="transition-delay: ${delay}ms;" onclick="showPropertyDetails(${p.id})">
        <div class="relative aspect-[4/5] overflow-hidden bg-stone-100 mb-5 rounded-[2rem] shadow-md group-hover:shadow-2xl transition-all duration-500 flex items-center justify-center">
            <img src="${p.img}" class="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110 relative z-10" onerror="this.onerror=null; this.src='gmrlogo.jpg'; this.classList.remove('object-cover'); this.classList.add('object-contain', 'p-8', 'bg-white');">
            <div class="absolute inset-0 bg-stone-900/10 group-hover:bg-stone-900/30 transition-colors duration-500 z-20 pointer-events-none"></div>
            <div class="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-[9px] font-bold text-emerald-950 uppercase tracking-widest shadow-sm z-30 pointer-events-none transform group-hover:scale-105 transition-transform duration-500">${p.status || 'Available'}</div>
        </div>
        <div class="flex justify-between items-start px-2">
            <div>
                <h3 class="font-bold text-emerald-950 text-base mb-1 leading-snug group-hover:text-emerald-600 transition-colors">${p.title}</h3>
                <p class="text-[10px] font-semibold text-stone-500 uppercase tracking-widest flex items-center gap-1"><i class="fas fa-map-marker-alt text-emerald-600/50"></i> ${p.loc || p.city}</p>
            </div>
            <div class="text-right">
                <p class="font-bold text-emerald-700 text-sm bg-emerald-50 px-2 py-1 rounded-lg">${p.price}</p>
            </div>
        </div>
    </div>
    `;
}

function render(items, isFiltered = true) {
    const container = document.getElementById('gallery-container');
    const totalFound = items.length;
    
    if(items.length === 0) {
        container.innerHTML = `<div class="py-20 text-center text-stone-400 font-bold uppercase tracking-widest text-xs reveal-on-scroll">No properties match your exact criteria.</div>`;
        observeElements();
        return;
    }

    let houses = items.filter(p => !(p.house_type && p.house_type.toLowerCase().includes('lot')));
    let lots = items.filter(p => p.house_type && p.house_type.toLowerCase().includes('lot'));

    if (!isFiltered && !showAllDefault) {
        houses = houses.slice(0, 8);
        lots = lots.slice(0, 4);
    }

    let html = '';
    let globalIndex = 0;

    if(houses.length > 0) {
        html += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">`;
        houses.forEach(p => {
            const delay = (globalIndex % 4) * 100;
            globalIndex++;
            html += generateCardHtml(p, delay);
        });
        html += `</div>`;
    }

    if(lots.length > 0) {
        let title = isFiltered || showAllDefault ? "Lots & Estates" : "Estates & Land";
        html += `<div class="mb-8 reveal-on-scroll border-t border-stone-200 pt-16">
                    <h2 class="text-2xl font-playfair font-bold text-emerald-950">${title}</h2>
                 </div>`;
        html += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">`;
        lots.forEach(p => {
            const delay = (globalIndex % 4) * 100;
            globalIndex++;
            html += generateCardHtml(p, delay);
        });
        html += `</div>`;
    }
    
    if (!isFiltered && !showAllDefault && totalFound > 12) {
        let hiddenCount = totalFound - (houses.length + lots.length);
        html += `
        <div class="mt-4 text-center reveal-on-scroll">
            <button onclick="loadMoreDefaultProperties()" class="border border-emerald-600 text-emerald-700 font-bold py-4 px-10 uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-600 hover:text-white transition-colors shadow-sm rounded-xl">View ${hiddenCount} More Properties</button>
        </div>`;
    }
    
    container.innerHTML = html;
    observeElements();
}

function updateDynamicFinancing() {
    const select = document.getElementById('dynamicFinancingSelect');
    if(!select || !select.options.length) return;
    const selected = select.options[select.selectedIndex];
    document.getElementById('detailGmi').innerText = selected.getAttribute('data-gmi') || 'N/A';
}

function showPropertyDetails(id) {
    const prop = allProperties.find(p => p.id == id);
    if (!prop) return;

    const isLotOnly = prop.house_type && prop.house_type.toLowerCase().includes('lot');

    document.getElementById('singlePropertyModal').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    if (document.getElementById('detailSqmContainer')) document.getElementById('detailSqmContainer').style.display = isLotOnly ? 'none' : 'block';
    if (document.getElementById('detailBedsContainer')) document.getElementById('detailBedsContainer').style.display = isLotOnly ? 'none' : 'block';
    if (document.getElementById('detailTbContainer')) document.getElementById('detailTbContainer').style.display = isLotOnly ? 'none' : 'block';
    if (document.getElementById('detailTurnoverContainer')) document.getElementById('detailTurnoverContainer').style.display = isLotOnly ? 'none' : 'flex';

    document.getElementById('detailStatus').innerText = prop.status || 'Available';
    document.getElementById('detailTitle').innerText = prop.title || 'N/A';
    document.getElementById('detailLoc').innerText = prop.loc || 'N/A';
    document.getElementById('detailPrice').innerText = prop.price || 'N/A';
    document.getElementById('detailDev').innerText = prop.developer || 'N/A';
    document.getElementById('detailSub').innerText = prop.subdivision || 'N/A';
    
    document.getElementById('detailSqm').innerText = prop.sqm || 'N/A';
    document.getElementById('detailLot').innerText = prop.lot_area || 'N/A';
    document.getElementById('detailBeds').innerText = prop.beds || 'N/A';
    document.getElementById('detailTb').innerText = prop.toilet_bath || 'N/A';
    
    document.getElementById('detailType').innerText = prop.house_type || 'N/A';
    document.getElementById('detailTurnover').innerText = prop.turn_over || 'N/A';

    let optionsHtml = '';
    if(prop.gmi_pagibig) optionsHtml += `<option value="pagibig" data-gmi="${prop.gmi_pagibig}">Pag-IBIG Financing</option>`;
    if(prop.gmi_bank) optionsHtml += `<option value="bank" data-gmi="${prop.gmi_bank}">Bank Financing</option>`;
    if(prop.gmi_inhouse) optionsHtml += `<option value="inhouse" data-gmi="${prop.gmi_inhouse}">In-House Financing</option>`;
    
    if(optionsHtml === '') {
        optionsHtml = `<option value="none" data-gmi="${prop.gmi || 'Contact Agent'}">Cash / Standard</option>`;
    }
    
    const selectEl = document.getElementById('dynamicFinancingSelect');
    if (selectEl) {
        selectEl.innerHTML = optionsHtml;
        updateDynamicFinancing(); 
    }

    const mediaWrapper = document.getElementById('mediaLinksWrapper');
    if (mediaWrapper) {
        mediaWrapper.innerHTML = '';
        
        if (prop.virtual_tour_url && prop.virtual_tour_url.trim() !== '') {
            mediaWrapper.innerHTML += `<button onclick="openVirtualTour(event, '${prop.virtual_tour_url}')" class="w-full bg-stone-100 text-stone-900 border border-stone-200 py-3 font-bold text-[10px] uppercase tracking-widest text-center hover:bg-stone-200 transition-colors mb-3 flex justify-center items-center gap-2 shadow-sm rounded-xl"><i class="fas fa-play text-sm text-emerald-600"></i> Virtual Tour</button>`;
        }
    }

    currentImages = [];
    if (prop.img && prop.img.trim() !== '') currentImages.push(prop.img);
    if (prop.img2 && prop.img2.trim() !== '') currentImages.push(prop.img2);
    if (prop.img3 && prop.img3.trim() !== '') currentImages.push(prop.img3);
    for(let i=4; i<=10; i++) {
        if (prop['img'+i] && prop['img'+i].trim() !== '') currentImages.push(prop['img'+i]);
    }
    if (currentImages.length === 0) currentImages.push('gmrlogo.jpg');
    
    currentSlide = 0;
    updateCarousel();
}

function updateCarousel() {
    const container = document.getElementById('carouselContainer');
    container.innerHTML = currentImages.map((src, index) => {
        const isLogo = src === 'gmrlogo.jpg';
        const imgClass = isLogo ? 'object-contain p-6 bg-white' : 'object-cover';
        return `<img src="${src}" class="absolute inset-0 w-full h-full ${imgClass} transition-opacity duration-700 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}" onerror="this.onerror=null; this.src='gmrlogo.jpg'; this.classList.remove('object-cover'); this.classList.add('object-contain', 'p-6', 'bg-white');">`;
    }).join('');

    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    const indicators = document.getElementById('slideIndicators');

    if (currentImages.length > 1) {
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
        indicators.classList.remove('hidden');
        
        indicators.innerHTML = currentImages.map((_, index) => `
            <span onclick="goToSlide(${index})" class="w-2.5 h-2.5 rounded-full shadow-md cursor-pointer transition-transform duration-300 ${index === currentSlide ? 'bg-emerald-600 scale-125' : 'bg-white/80 hover:bg-white'} pointer-events-auto"></span>
        `).join('');
    } else {
        prevBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
        indicators.classList.add('hidden');
    }
}

document.getElementById('prevSlide').onclick = function() {
    if (currentImages.length <= 1) return;
    currentSlide = (currentSlide - 1 + currentImages.length) % currentImages.length;
    updateCarousel();
};

document.getElementById('nextSlide').onclick = function() {
    if (currentImages.length <= 1) return;
    currentSlide = (currentSlide + 1) % currentImages.length;
    updateCarousel();
};

window.goToSlide = function(index) {
    currentSlide = index;
    updateCarousel();
};

function openVirtualTour(e, url) {
    if(e) e.stopPropagation();
    
    let embedUrl = url;
    if (url.includes('youtube.com/watch?v=')) {
        embedUrl = url.replace('watch?v=', 'embed/');
    } else if (url.includes('youtu.be/')) {
        embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
    }

    const isDirectVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg');
    const vtContainer = document.getElementById('vtContainer');
    
    if (isDirectVideo) {
        vtContainer.innerHTML = `<video id="vtVideo" src="${url}" controls autoplay class="absolute inset-0 w-full h-full object-contain"></video>`;
    } else {
        vtContainer.innerHTML = `<iframe id="vtIframe" src="${embedUrl}" class="absolute inset-0 w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    }

    document.getElementById('virtualTourModal').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

window.onclick = function(e) { 
    if (!e.target.closest('.nav-item') && !e.target.closest('.dropdown-toggle') && !e.target.closest('.dropdown-menu') && !e.target.closest('.submenu') && !e.target.closest('.outline-none')) {
        hideAllMenus(); 
    }
    if (e.target === document.getElementById('registerModal')) {
        closeModal('registerModal');
    }
    if (e.target === document.getElementById('singlePropertyModal')) {
        closeModal('singlePropertyModal');
    }
    if (e.target === document.getElementById('virtualTourModal')) { 
        closeModal('virtualTourModal'); 
        const vtContainer = document.getElementById('vtContainer');
        if(vtContainer) vtContainer.innerHTML = '';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const loader = document.getElementById('loader');
    if(loader) setTimeout(() => loader.classList.add('loader-hidden'), 600);

    try {
        initHeroSlideshow();
        runTypewriter();
        initAdvancedFilters();
        initBuyerMap();
        
        sessionStorage.removeItem('activeSearchQuery');
        sessionStorage.removeItem('activeFilterProv');
        sessionStorage.removeItem('activeFilterCity');
        sessionStorage.removeItem('activeFilterDev');
        sessionStorage.removeItem('activeFilterFin');
        sessionStorage.removeItem('activeFilterSub');
        applyFilters(false); 
        
        document.getElementById('advSearchKeyword').value = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        observeElements();
        
    } catch (error) {
        console.error("Initialization Error:", error);
    }
});
