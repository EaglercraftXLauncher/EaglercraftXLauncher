/* ─── Constants ─── */
const CDN = "https://eaglercraftxlauncher.github.io/EaglercraftXLauncherCDN/";
const GH_API = "https://api.github.com/repos/EaglercraftXLauncher/EaglercraftXLauncherCDN/git/trees/gh-pages?recursive=1";
const FILE_LIST = "./file_list.txt";

const TAB_META = {
  base:    { title: "Vanilla Versions",   sub: "Official Eaglercraft versions from the CDN" },
  clients: { title: "Clients",            sub: "Recommended and modded Eaglercraft clients" },
  mods:    { title: "EaglerForge Mods",   sub: "JavaScript mods loadable into any Eaglercraft client" },
  tools:   { title: "Tools & Utilities",  sub: "EPK editors, binary tools, server jars and more" },
  skins:   { title: "Skins",              sub: "Downloadable player skins from the CDN" },
};

const FILTER_META = {
  base:    [{ label:"All", val:"all"}, {label:"1.8", val:"1.8"}, {label:"1.12", val:"1.12"}, {label:"WASM", val:"wasm"}, {label:"Beta", val:"b1"}],
  clients: [{ label:"All", val:"all"}, {label:"1.8", val:"1.8"}, {label:"1.12", val:"1.12"}, {label:"Shadow", val:"shadow"}, {label:"Dragon", val:"dragon"}, {label:"Wisp", val:"wisp"}],
  mods:    [{ label:"All", val:"all"}, {label:"Gameplay", val:"game"}, {label:"Visual", val:"visual"}, {label:"Utility", val:"util"}],
  tools:   [{ label:"All", val:"all"}, {label:"Server", val:"Server"}, {label:"Modding", val:"Modding"}, {label:"AyunWebEpk", val:"AyunWebEpk"}, {label:"Binary", val:"Binary"}, {label:"Skins", val:"Skins"}],
  skins:   [{ label:"All", val:"all"}],
};

/* ─── State ─── */
let activeTab = "base";
let activeFilter = "all";
let searchTerm = "";
let library = { base:[], clients:[], mods:[], tools:[], skins:[] };
let loadStatus = { base:"pending", clients:"pending", mods:"pending", tools:"pending", skins:"pending" };
let modalItem = null;

/* ─── DOM refs ─── */
const cardsGrid     = document.getElementById("cardsGrid");
const skeletonGrid  = document.getElementById("skeletonGrid");
const emptyState    = document.getElementById("emptyState");
const tabTitle      = document.getElementById("tabTitle");
const tabSub        = document.getElementById("tabSub");
const filterRow     = document.getElementById("filterRow");
const searchInput   = document.getElementById("searchInput");
const searchClear   = document.getElementById("searchClear");
const refreshBtn    = document.getElementById("refreshBtn");
const cdnDot        = document.getElementById("cdnDot");
const cdnStatusText = document.getElementById("cdnStatusText");
const modalBackdrop = document.getElementById("modalBackdrop");
const toastCont     = document.getElementById("toastContainer");
const sidebar       = document.getElementById("sidebar");
const hamburger     = document.getElementById("hamburger");

/* ─── Helpers ─── */
function cdnUrl(path) {
  if (!path) return CDN;
  if (/^https?:\/\//.test(path)) return path;
  return CDN + path.replace(/^\.\//, "").replace(/\\/g, "/");
}

function fileBasename(p) {
  return decodeURIComponent(p.replace(/\\/g, "/").split("/").pop() || p).replace(/\.[^.]+$/, "");
}

function initials(s) {
  return s.split(/[\s\-_.]+/).filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join("") || "EX";
}

function badgeClass(tab) {
  return { mods:"mod", skins:"skin", tools:"tool" }[tab] || "";
}

/* ─── Normalise items ─── */
function norm(raw, tab) {
  const title    = raw.title || raw.name || fileBasename(raw.path || raw.link || raw.image || "Item");
  const linkPath = (raw.link || raw.image || raw.path || "").replace(/\\/g, "/");
  const meta     = raw.version || raw.author || raw.type || TAB_META[tab].title;
  const desc     = raw.description || `${title} — available on the EaglercraftX CDN.`;
  const icon     = raw.icon ? cdnUrl(raw.icon) : (raw.image ? cdnUrl(raw.image) : "");
  return { title, meta, desc, icon, tab, active: raw.active !== false,
           link: cdnUrl(linkPath), path: linkPath };
}

/* ─── Fetch helpers ─── */
async function fetchJSON(path) {
  const r = await fetch(cdnUrl(path), { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function fetchFileList() {
  const r = await fetch(cdnUrl(FILE_LIST), { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const text = await r.text();
  return text.split(/\r?\n/).map(l => l.trim().replace(/\\/g, "/"))
    .map(l => l.replace(/^.*?(Clients|Mods|Tools|Versions|assets)\//, "$1/"))
    .filter(Boolean);
}

async function fetchGHTree() {
  const r = await fetch(GH_API, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return d.tree.filter(i => i.type === "blob").map(i => i.path);
}

/* ─── Load each tab ─── */
async function loadBase() {
  const items = await fetchJSON("assets/json/base.json");
  library.base = items.map(i => norm(i, "base"));
}

async function loadClients() {
  const [a, m] = await Promise.all([
    fetchJSON("assets/json/assisted.json"),
    fetchJSON("assets/json/modded.json"),
  ]);
  const seen = new Set();
  library.clients = [...a, ...m].map(i => norm(i, "clients")).filter(i => {
    const k = i.title + "|" + i.path;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

async function loadMods() {
  const items = await fetchJSON("assets/json/mods.json");
  library.mods = items.map(i => norm(i, "mods"));
}

async function loadSkins() {
  const items = await fetchJSON("assets/json/skins.json");
  library.skins = items.map(i => norm(i, "skins"));
}

async function loadTools() {
  let paths;
  try {
    paths = await fetchFileList();
    toast("Loaded tools from File_list", "success");
  } catch(_) {
    paths = await fetchGHTree();
    toast("Loaded tools via GitHub tree fallback");
  }
  const KEEP = /\.(html?|jar|js|zip|epk)$/i;
  library.tools = paths
    .filter(p => p.startsWith("Tools/") && KEEP.test(p) && !p.includes("/samples/") && !p.includes("node_modules"))
    .slice(0, 60)
    .map(p => norm({
      title: fileBasename(p),
      version: p.split("/").slice(1,-1).join(" › ") || "Tool",
      description: `${p.split("/").pop()} — CDN tool.`,
      path: p, type: "Tool", active: true,
    }, "tools"));
}

/* ─── Fallback data (when CDN unreachable) ─── */
const FALLBACK = {
  base: [
    { title:"EaglercraftX 1.8.8 WASM", version:"1.8.8-WASM", description:"Flagship EaglercraftX build for 1.8.8.", link:"Versions/EaglercraftX_1.8.8_WASM.html", active:true },
    { title:"Eaglercraft 1.12.2 WASM",  version:"1.12.2-WASM", description:"Eaglercraft for Minecraft 1.12.2.",    link:"Versions/Eaglercraft_1.12.2_WASM.html",  active:true },
    { title:"Eaglercraft 1.5.2",         version:"1.5.2",       description:"Classic 1.5.2 Eaglercraft build.",     link:"Versions/Eaglercraft_1.5.2.html",         active:true },
    { title:"Eaglercraft Beta 1.7.3",    version:"b1.7.3",      description:"Beta 1.7.3 Eaglercraft build.",        link:"Versions/Eaglercraft_b1.7.3.html",        active:true },
  ],
  clients: [
    { title:"Shadow v4.5 OptiFine", version:"1.8.8", description:"Popular OptiFine-enabled modded client.", link:"Clients/Shadow/Shadow.v4.5.optifine.html", active:true },
    { title:"Dragon v5",            version:"1.8.8", description:"Dragon client v5.",                        link:"Clients/Dragon/Dragon v5.html",            active:true },
    { title:"Wispcraft v3",         version:"1.8.8", description:"Wisp client v3.",                          link:"Clients/Wispcraft/Wispcraft v3.html",      active:true },
  ],
  mods: [],
  tools: [],
  skins: [],
};

/* ─── Data loading orchestrator ─── */
async function loadAll() {
  refreshBtn.classList.add("spinning");
  cdnDot.className = "cdn-dot";
  cdnStatusText.textContent = "Loading CDN...";
  showSkeleton(true);

  const tasks = [
    { key:"base",    fn: loadBase    },
    { key:"clients", fn: loadClients },
    { key:"mods",    fn: loadMods    },
    { key:"skins",   fn: loadSkins   },
    { key:"tools",   fn: loadTools   },
  ];

  let ok = 0;
  await Promise.allSettled(tasks.map(async ({ key, fn }) => {
    try {
      await fn();
      loadStatus[key] = "ok";
      ok++;
    } catch (e) {
      loadStatus[key] = "error";
      library[key] = FALLBACK[key].map(i => norm(i, key));
      console.warn(`CDN load failed for "${key}":`, e.message);
    }
    updateNavCount(key);
    if (key === activeTab) render();
  }));

  cdnDot.className = "cdn-dot " + (ok >= 4 ? "ok" : ok >= 2 ? "warn" : "err");
  cdnStatusText.textContent = `${ok}/5 sources loaded`;
  refreshBtn.classList.remove("spinning");
  showSkeleton(false);
  render();
}

/* ─── Render ─── */
function render() {
  const items = filtered();
  showSkeleton(false);

  if (items.length === 0 && library[activeTab].length > 0) {
    cardsGrid.innerHTML = "";
    cardsGrid.hidden = true;
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  cardsGrid.hidden = false;

  cardsGrid.innerHTML = items.map(item => {
    const iconHtml = item.icon
      ? `<img src="${item.icon}" alt="" loading="lazy" onerror="this.style.display='none';this.parentElement.textContent='${initials(item.title)}'">`
      : initials(item.title);
    return `
      <article class="card" data-path="${encodeURIComponent(item.path)}" role="button" tabindex="0" aria-label="Open ${item.title}">
        <div class="card-top">
          <div class="card-icon">${iconHtml}</div>
          <div class="card-meta">
            <div class="card-title">${escHtml(item.title)}</div>
            <span class="card-badge ${badgeClass(item.tab)}">${escHtml(item.meta)}</span>
          </div>
        </div>
        <p class="card-desc">${escHtml(item.desc)}</p>
        ${item.path ? `<div class="card-path">${escHtml(item.path)}</div>` : ""}
        <div class="card-footer">
          <span class="card-status">
            <span class="card-status-dot ${item.active ? "" : "inactive"}"></span>
            ${item.active ? "Active" : "Inactive"}
          </span>
          <span class="card-open">
            Launch
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="5 3 19 12 5 21 5 3"/></svg>
          </span>
        </div>
      </article>`;
  }).join("");
}

function filtered() {
  const term = searchTerm.toLowerCase();
  return library[activeTab].filter(item => {
    const hay = `${item.title} ${item.desc} ${item.meta} ${item.path}`.toLowerCase();
    const matchSearch = !term || hay.includes(term);
    const matchFilter = activeFilter === "all" || hay.includes(activeFilter.toLowerCase());
    return matchSearch && matchFilter;
  });
}

function showSkeleton(show) {
  skeletonGrid.hidden = !show;
  cardsGrid.hidden   = show;
  if (show) emptyState.hidden = true;
}

function updateNavCount(tab) {
  const el = document.getElementById(`count-${tab}`);
  if (el) el.textContent = library[tab].length;
}

function updateTabUI() {
  const meta = TAB_META[activeTab];
  tabTitle.textContent = meta.title;
  tabSub.textContent   = meta.sub;

  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === activeTab));

  const filters = FILTER_META[activeTab] || [{ label:"All", val:"all" }];
  filterRow.innerHTML = filters.map(f =>
    `<button class="filter-chip${activeFilter === f.val ? " active" : ""}" data-filter="${f.val}">${f.label}</button>`
  ).join("");
}

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ─── Modal ─── */
function openModal(item) {
  modalItem = item;
  const iconHtml = item.icon
    ? `<img src="${item.icon}" alt="" onerror="this.style.display='none'">`
    : initials(item.title);
  document.getElementById("modalIcon").innerHTML  = iconHtml;
  document.getElementById("modalTitle").textContent = item.title;
  document.getElementById("modalMeta").textContent  = item.meta;
  document.getElementById("modalDesc").textContent  = item.desc;
  document.getElementById("modalPath").textContent  = item.link;
  document.getElementById("modalOpen").href = item.link;
  modalBackdrop.hidden = false;
  document.getElementById("modal").focus?.();
}

function closeModal() {
  modalBackdrop.hidden = true;
  modalItem = null;
}

/* ─── Toast ─── */
function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-dot"></span>${escHtml(msg)}`;
  toastCont.appendChild(el);
  setTimeout(() => { el.style.animation = "toastOut 200ms ease forwards"; setTimeout(() => el.remove(), 200); }, 2800);
}

/* ─── Sidebar overlay for mobile ─── */
let overlay = null;
function openSidebar() {
  sidebar.classList.add("open");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", closeSidebar);
  }
  overlay.classList.add("visible");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("visible");
}

/* ─── Event listeners ─── */
// Nav tabs
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab === activeTab) return;
    activeTab = btn.dataset.tab;
    activeFilter = "all";
    updateTabUI();
    render();
    if (window.innerWidth <= 768) closeSidebar();
  });
});

// Filter chips (delegated, because they're re-rendered)
filterRow.addEventListener("click", e => {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;
  activeFilter = chip.dataset.filter;
  filterRow.querySelectorAll(".filter-chip").forEach(c => c.classList.toggle("active", c === chip));
  render();
});

// Search
searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim();
  render();
});
searchClear.addEventListener("click", () => {
  searchInput.value = "";
  searchTerm = "";
  render();
  searchInput.focus();
});
document.getElementById("clearSearchBtn").addEventListener("click", () => {
  searchInput.value = "";
  searchTerm = "";
  render();
});

// Card clicks (delegated)
cardsGrid.addEventListener("click", e => {
  const card = e.target.closest(".card");
  if (!card) return;
  const path = decodeURIComponent(card.dataset.path || "");
  const item = filtered().find(i => i.path === path);
  if (item) openModal(item);
});
cardsGrid.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    e.target.closest(".card")?.click();
  }
});

// Modal
document.getElementById("modalClose").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", e => { if (e.target === modalBackdrop) closeModal(); });
document.getElementById("modalLaunch").addEventListener("click", () => {
  if (!modalItem) return;
  window.open(modalItem.link, "_blank", "noopener,noreferrer");
  toast(`Launching ${modalItem.title}`, "success");
  closeModal();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

// Refresh
refreshBtn.addEventListener("click", () => {
  if (refreshBtn.classList.contains("spinning")) return;
  toast("Refreshing CDN data...");
  loadAll();
});

// Hamburger
hamburger.addEventListener("click", () => {
  if (sidebar.classList.contains("open")) closeSidebar();
  else openSidebar();
});

/* ─── Init ─── */
updateTabUI();
showSkeleton(true);
loadAll();
