function getStateFromUrl() {
    const p = new URLSearchParams(location.search);
    const page = Math.max(1, Number(p.get("page")) || 1);
    const size = [10, 20, 50].includes(Number(p.get("size"))) ? Number(p.get("size")) : 10;
    const sort = (p.get("sort") === "published_at" || p.get("sort") === "-published_at")
    ? p.get("sort")
    : "-published_at";
    return { page, size, sort };
}

function setStateToUrl(next) {
    const p = new URLSearchParams();
    p.set("page", String(next.page));
    p.set("size", String(next.size));
    p.set("sort", next.sort);
    history.pushState(null, "", "?" + p.toString());
}

let state = getStateFromUrl();

// 1) HEADER
const headerEl = document.getElementById("header");
let lastY = window.scrollY;

function clamp(n, min, max) {
return Math.max(min, Math.min(max, n));
}

function onScroll() {
const y = window.scrollY;
const goingDown = y > lastY;
const nearTop = y < 10;

// HEADER hide/show 
if (goingDown && y > 80) headerEl.classList.add("hidden");
else headerEl.classList.remove("hidden");

// HEADER glass effect
if (!nearTop) headerEl.classList.add("scrolled");
else headerEl.classList.remove("scrolled");

// PARALLAX: image + text 
const bg = document.getElementById("bannerBg");
const text = document.querySelector(".banner-content");
const banner = document.getElementById("banner");
const t = clamp(y, 0, 700);

if (bg) bg.style.transform = `translateY(${t * 0.18}px)`;
//if (text) text.style.transform = `translateY(${t * 0.06}px)`;
if (text) text.style.transform = `translateY(${-t * 0.18}px)`;

// miring → flat 
if (banner) {
    const rect = banner.getBoundingClientRect();
    const h = banner.offsetHeight || 500;
    const progress = clamp((-rect.top) / h, 0, 1); // 0..1
    const clipY = 80 - (80 * progress); 
    banner.style.setProperty("--clipY", `${clipY}%`);
}

    lastY = y;
}

window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// 3) DOM refs
const showingInfoEl = document.getElementById("showingInfo");
const perPageEl = document.getElementById("perPage");
const sortByEl = document.getElementById("sortBy");
const postsContainerEl = document.getElementById("postsContainer");
const paginationEl = document.getElementById("pagination");

function initCustomSelect(selectId, ddId, onChange) {
const select = document.getElementById(selectId);
const dd = document.getElementById(ddId);
if (!select || !dd) return;

const btn = dd.querySelector(".ss-btn");
const valueEl = dd.querySelector(".ss-value");
const list = dd.querySelector(".ss-list");

list.innerHTML = "";
[...select.options].forEach((opt) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ss-item";
    item.dataset.value = opt.value;
    item.innerHTML = `
    <span>${opt.text}</span>
    <span class="check">✓</span>
    `;
    list.appendChild(item);
});

function setActive(value) {
    const opt = [...select.options].find(o => o.value === value);
    if (opt) valueEl.textContent = opt.text;
    list.querySelectorAll(".ss-item").forEach(el => {
    el.classList.toggle("active", el.dataset.value === value);
    });
}

setActive(select.value);

btn.addEventListener("click", (e) => {
    e.preventDefault();
    const isOpen = dd.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(isOpen));
});

list.addEventListener("click", (e) => {
    const item = e.target.closest(".ss-item");
    if (!item) return;

    select.value = item.dataset.value;
    setActive(select.value);

    dd.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    onChange?.(select.value);
});

document.addEventListener("click", (e) => {
    if (!dd.contains(e.target)) {
    dd.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    }
});

select.addEventListener("change", () => setActive(select.value));
}

initCustomSelect("perPage", "perPageDD", (val) => {
    state.size = Number(val);
    state.page = 1;
    setStateToUrl(state);
    load();
});

    initCustomSelect("sortBy", "sortByDD", (val) => {
    state.sort = val;
    state.page = 1;
    setStateToUrl(state);
    load();
});

perPageEl.dispatchEvent(new Event("change"));
sortByEl.dispatchEvent(new Event("change"));

// 4) Lazy loading 
const imageObserver = ("IntersectionObserver" in window)
    ? new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const src = img.dataset.src;
        if (src) img.src = src;
        obs.unobserve(img);
        });
    }, { rootMargin: "200px 0px" })
    : null;

const IMG_PLACEHOLDER =
    "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

// 5) Fetch API
const API_BASE = import.meta.env.PROD 
  ? "https://suitmedia-backend.suitdev.com/api/ideas" 
  : "/api/ideas";  
//const API_BASE = "https://suitmedia-backend.suitdev.com/api/ideas";
//const API_BASE = "/api/ideas";

function buildApiUrl() {
    const u = new URL(API_BASE, location.origin);
    u.searchParams.set("page[number]", String(state.page));
    u.searchParams.set("page[size]", String(state.size));
    u.searchParams.append("append[]", "small_image");
    u.searchParams.append("append[]", "medium_image");
    u.searchParams.set("sort", state.sort);
    return u.toString();
}

function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function getImageUrl(item) {
    const pick = (v) => {
    if (!v) return "";
    if (Array.isArray(v)) return v[0]?.url || v[0] || "";
    if (typeof v === "object") return v.url || "";
    if (typeof v === "string") return v;
    return "";
    };

    const img = pick(item?.small_image) || pick(item?.medium_image);

    if (img && typeof img === "string" && img.startsWith("/")) {
    return "https://suitmedia-backend.suitdev.com" + img;
    }
    return img || "";
}

function renderLoading() {
    postsContainerEl.innerHTML = `
        <div class="skeleton-grid" aria-label="Loading ideas">
        ${Array.from({ length: state.size }).slice(0, 12).map(() => `
            <div class="skeleton-card">
            <div class="skeleton-thumb"></div>
            <div class="skeleton-body">
                <div class="skeleton-line sm"></div>
                <div class="skeleton-line lg"></div>
                <div class="skeleton-line md"></div>
            </div>
            </div>
        `).join("")}
        </div>
    `;
}

function updateShowingInfo(total) {
    const start = (state.page - 1) * state.size + 1;
    const end = Math.min(state.page * state.size, total);
    showingInfoEl.textContent = total
    ? `Showing ${start} - ${end} of ${total}`
    : `Showing 0 - 0 of 0`;
}

function renderPosts(items) {
    if (!items || items.length === 0) {
    postsContainerEl.innerHTML = `<div class="loading">No ideas found.</div>`;
    return;
    }

    const grid = document.createElement("div");
    grid.className = "posts-grid";

    items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "post-card";

    const imageUrl = getImageUrl(item) || "";
    const title = item?.title ?? "(Untitled)";
    const date = formatDate(item?.published_at);

    card.innerHTML = `
        <div class="post-thumbnail">
        <img
            src="${IMG_PLACEHOLDER}"
            data-src="${imageUrl}"
            alt="${String(title).replaceAll('"', "&quot;")}"
            loading="lazy"
        >
        </div>
        <div class="post-content">
        <div class="post-date">${date}</div>
        <h3 class="post-title">${title}</h3>
        </div>
    `;

    const img = card.querySelector("img");
    if (imageUrl) {
        if (imageObserver) imageObserver.observe(img);
        else img.src = imageUrl;
    } else {
        img.removeAttribute("data-src");
    }

    grid.appendChild(card);
    });

    postsContainerEl.innerHTML = "";
    postsContainerEl.appendChild(grid);
}

function scrollToList() {
    const el = document.querySelector("main.container");
    const headerH = document.getElementById("header")?.offsetHeight || 0;
    if (!el) return;

    const y = el.getBoundingClientRect().top + window.scrollY - headerH - 16;
    window.scrollTo({ top: y, behavior: "smooth" });
}


function renderPagination(total) {
    const totalPages = Math.max(1, Math.ceil(total / state.size));

    if (totalPages <= 1) {
    paginationEl.innerHTML = "";
    return;
    }

    let html = "";
    html += `<button ${state.page === 1 ? "disabled" : ""} data-page="${state.page - 1}">«</button>`;

    const maxVisible = 5;
    let startPage = Math.max(1, state.page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    if (startPage > 1) {
    html += `<button data-page="1">1</button>`;
    if (startPage > 2) html += `<span>...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
    html += `<button class="${i === state.page ? "active" : ""}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span>...</span>`;
    html += `<button data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button ${state.page === totalPages ? "disabled" : ""} data-page="${state.page + 1}">»</button>`;

    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
        const nextPage = Number(btn.dataset.page);
        if (!Number.isFinite(nextPage)) return;
        state.page = nextPage;
        setStateToUrl(state);
        load();
        scrollToList();
    });
    });
}

async function load() {
    renderLoading();

    try {
    const url = buildApiUrl();
    const res = await fetch(url, { headers: { Accept: "application/json" } });

    if (!res.ok) {
        const txt = await res.text();
        postsContainerEl.innerHTML = `<div class="loading">Error loading ideas.<br><small>HTTP ${res.status}: ${txt}</small></div>`;
        return;
    }

    const json = await res.json();
    const items = json?.data ?? [];
    const total = json?.meta?.total ?? 0;

    renderPosts(items);
    renderPagination(total);
    updateShowingInfo(total);

    perPageEl.value = String(state.size);
    sortByEl.value = state.sort;
    } catch (err) {
    postsContainerEl.innerHTML = `
        <div class="loading">
            Unable to load ideas at the moment.<br>
            <small>Please try again later.</small>
        </div>
    `;
    console.error(err);
    }
}

// 6) Events
perPageEl.addEventListener("change", () => {
    state.size = Number(perPageEl.value);
    state.page = 1;
    setStateToUrl(state);
    load();
});

sortByEl.addEventListener("change", () => {
    state.sort = sortByEl.value;
    state.page = 1;
    setStateToUrl(state);
    load();
});

window.addEventListener("popstate", () => {
    state = getStateFromUrl();
    load();
});

load();