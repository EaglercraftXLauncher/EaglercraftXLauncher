const CDN_BASE = "https://eaglercraftxlauncher.github.io/EaglercraftXLauncherCDN/";
const GITHUB_TREE_API = "https://api.github.com/repos/EaglercraftXLauncher/EaglercraftXLauncherCDN/git/trees/gh-pages?recursive=1";
const FILE_LIST_PATH = "Repository/File_list";

const manifestSources = {
  base: {
    label: "Vanilla Versions",
    path: "assets/json/base.json",
    description: "Official and classic Eaglercraft versions from the CDN JSON manifest."
  },
  clients: {
    label: "Assisted Clients",
    path: "assets/json/assisted.json + assets/json/modded.json",
    description: "Recommended and modded clients from the CDN JSON manifests."
  },
  mods: {
    label: "EaglerForge Mods",
    path: "assets/json/mods.json",
    description: "JavaScript mods that can be downloaded from the CDN."
  },
  skins: {
    label: "Skins",
    path: "assets/json/skins.json",
    description: "Downloadable skins hosted in the CDN tools directory."
  },
  tools: {
    label: "Tools",
    path: FILE_LIST_PATH,
    description: "Tool files discovered from Repository/File_list with a GitHub tree fallback."
  }
};

const fallbackLibrary = {
  base: [
    {
      title: "Latest release",
      version: "1.12.2-u2-wasm",
      description: "Fallback vanilla entry while the CDN manifest is unavailable.",
      link: "Versions/Eaglercraft_1.12.2_WASM.html",
      active: true
    },
    {
      title: "Previous release",
      version: "1.8.8-u53-wasm",
      description: "Fallback 1.8.8 WASM entry while the CDN manifest is unavailable.",
      link: "Versions/EaglercraftX_1.8.8_WASM.html",
      active: true
    }
  ],
  clients: [
    {
      title: "Shadow v4.5 OptiFine",
      version: "1.8.8",
      description: "Fallback featured modded client.",
      link: "Clients/Shadow/Shadow.v4.5.optifine.html",
      active: true
    }
  ],
  mods: [],
  tools: [],
  skins: []
};

const library = structuredClone(fallbackLibrary);
const sourceState = Object.fromEntries(
  Object.entries(manifestSources).map(([key, source]) => [
    key,
    {
      ...source,
      count: 0,
      ok: false,
      status: "Waiting"
    }
  ])
);

const cardsGrid = document.querySelector("#cardsGrid");
const sourceList = document.querySelector("#sourceList");
const activeLabel = document.querySelector("#activeLabel");
const activeTitle = document.querySelector("#activeTitle");
const search = document.querySelector("#search");
const toast = document.querySelector("#toast");
const cdnStatus = document.querySelector("#cdnStatus");
const cdnUrl = document.querySelector("#cdnUrl");
const contentCount = document.querySelector("#contentCount");
const selectedTitle = document.querySelector("#selectedTitle");
const selectedMeta = document.querySelector("#selectedMeta");
const selectedLink = document.querySelector("#selectedLink");
const fileListStatus = document.querySelector("#fileListStatus");

let activeTab = "base";
let activeFilter = "all";
let selectedItem = null;

function cdnUrlFor(path = "") {
  if (!path) return CDN_BASE;
  return new URL(path.replace(/^\.\//, ""), CDN_BASE).href;
}

function titleCase(value) {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function filenameFromPath(path) {
  return decodeURIComponent(path.split("/").pop() || path).replace(/\.[^.]+$/, "");
}

function initials(value) {
  return value
    .split(/\s+|\.|-|_/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("") || "EX";
}

function normalizeItem(item, tab) {
  const title = item.title || item.name || filenameFromPath(item.path || item.link || "CDN Item");
  const linkPath = item.link || item.image || item.path || "";
  const meta = item.version || item.author || item.type || manifestSources[tab].label;
  const description = item.description || `${title} from ${manifestSources[tab].label}.`;

  return {
    ...item,
    tab,
    title,
    meta,
    description,
    icon: item.icon ? cdnUrlFor(item.icon) : "",
    link: cdnUrlFor(linkPath),
    path: linkPath.replace(/^\.\//, ""),
    badge: item.active === false ? "Inactive" : meta,
    active: item.active !== false
  };
}

function normalizeManifestItems(items, tab) {
  return items.map((item) => normalizeItem(item, tab));
}

function normalizeToolPaths(paths) {
  const runnableExtensions = /\.(html?|jar|js|zip|epk)$/i;
  return paths
    .filter((path) => path.startsWith("Tools/"))
    .filter((path) => runnableExtensions.test(path))
    .filter((path) => !path.includes("/samples/"))
    .slice(0, 48)
    .map((path) =>
      normalizeItem(
        {
          title: filenameFromPath(path),
          version: path.split("/").slice(1, -1).join(" / ") || "Tool",
          description: `CDN tool file: ${path}`,
          path,
          type: "Tool",
          active: true
        },
        "tools"
      )
    );
}

async function fetchJson(path) {
  const response = await fetch(cdnUrlFor(path), { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function fetchFileListPaths() {
  const response = await fetch(cdnUrlFor(FILE_LIST_PATH), { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const text = await response.text();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, "/"))
    .map((line) => line.replace(/^.*?(Clients|Mods|Tools|Versions|assets)\//, "$1/"))
    .filter(Boolean);
}

async function fetchGitHubTreePaths() {
  const response = await fetch(GITHUB_TREE_API, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const data = await response.json();
  return data.tree.filter((item) => item.type === "blob").map((item) => item.path);
}

function setSourceState(key, ok, count, status) {
  sourceState[key] = {
    ...sourceState[key],
    ok,
    count,
    status
  };
}

async function loadManifest(key) {
  const items = await fetchJson(manifestSources[key].path);
  library[key] = normalizeManifestItems(items, key);
  setSourceState(key, true, library[key].length, "Loaded from CDN JSON");
}

async function loadClients() {
  const [assistedItems, moddedItems] = await Promise.all([
    fetchJson("assets/json/assisted.json"),
    fetchJson("assets/json/modded.json")
  ]);
  const seen = new Set();
  library.clients = normalizeManifestItems([...assistedItems, ...moddedItems], "clients").filter((item) => {
    const key = `${item.title}|${item.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  setSourceState("clients", true, library.clients.length, "Loaded assisted + modded CDN JSON");
}

async function loadTools() {
  try {
    const fileListPaths = await fetchFileListPaths();
    library.tools = normalizeToolPaths(fileListPaths);
    setSourceState("tools", true, library.tools.length, "Loaded from Repository/File_list");
    fileListStatus.textContent = "Repository/File_list loaded";
  } catch (fileListError) {
    const treePaths = await fetchGitHubTreePaths();
    library.tools = normalizeToolPaths(treePaths);
    setSourceState("tools", true, library.tools.length, "File list missing; used GitHub tree fallback");
    fileListStatus.textContent = "GitHub tree fallback";
  }
}

function filteredItems() {
  const term = search.value.trim().toLowerCase();
  return library[activeTab].filter((item) => {
    const haystack = `${item.title} ${item.description} ${item.meta} ${item.path}`.toLowerCase();
    const matchesSearch = haystack.includes(term);
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "active" && item.active) ||
      haystack.includes(activeFilter);
    return matchesSearch && matchesFilter;
  });
}

function iconMarkup(item) {
  if (!item.icon) return `<span>${initials(item.title)}</span>`;
  return `<img src="${item.icon}" alt="" loading="lazy" />`;
}

function renderCards() {
  const items = filteredItems();
  activeLabel.textContent = manifestSources[activeTab].label;
  activeTitle.textContent = `${titleCase(activeTab)} Library`;

  if (items.length === 0) {
    cardsGrid.innerHTML = `
      <article class="empty-card">
        <h3>No CDN items found</h3>
        <p>Try another tab, clear search, or refresh the CDN manifests.</p>
      </article>
    `;
    return;
  }

  cardsGrid.innerHTML = items
    .map(
      (item, index) => `
        <article class="card" data-index="${index}">
          <div class="card-icon" aria-hidden="true">${iconMarkup(item)}</div>
          <div>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
          </div>
          <div class="path-line" title="${item.link}">${item.path}</div>
          <div class="card-footer">
            <span class="badge">${item.badge}</span>
            <a class="launch-link" href="${item.link}" target="_blank" rel="noreferrer">Open →</a>
          </div>
        </article>
      `
    )
    .join("");
}

function renderSources() {
  sourceList.innerHTML = Object.entries(sourceState)
    .map(
      ([key, source]) => `
        <article class="pack-card ${source.ok ? "is-loaded" : ""}">
          <span class="pack-icon" aria-hidden="true">${source.ok ? "✓" : "…"}</span>
          <span>
            <strong>${source.label}</strong>
            <small>${source.count} items · ${source.status}</small>
          </span>
          <button class="source-tab" data-tab="${key}" type="button">View</button>
        </article>
      `
    )
    .join("");
}

function updateSummary() {
  const total = Object.values(library).reduce((sum, items) => sum + items.length, 0);
  const loaded = Object.values(sourceState).filter((source) => source.ok).length;
  contentCount.textContent = `${total} loaded`;
  cdnStatus.textContent = loaded ? `${loaded}/5 sources` : "Offline fallback";
  cdnUrl.textContent = new URL(CDN_BASE).host;
}

function selectItem(item) {
  selectedItem = item;
  selectedTitle.textContent = item.title;
  selectedMeta.textContent = item.meta;
  selectedLink.href = item.link;
  selectedLink.textContent = activeTab === "mods" || activeTab === "skins" ? "Download" : "Open CDN";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function setActiveTab(tab) {
  activeTab = tab;
  document.querySelector(".nav-item.active")?.classList.remove("active");
  document.querySelector(`.nav-item[data-tab="${tab}"]`)?.classList.add("active");
  renderCards();
  const firstItem = filteredItems()[0] || library[tab][0];
  if (firstItem) selectItem(firstItem);
}

async function loadCdnData() {
  showToast("Loading CDN manifests...");
  renderSources();

  await Promise.allSettled(
    ["base", "clients", "mods", "skins"].map(async (key) => {
      try {
        if (key === "clients") {
          await loadClients();
        } else {
          await loadManifest(key);
        }
      } catch (error) {
        library[key] = normalizeManifestItems(fallbackLibrary[key], key);
        setSourceState(key, false, library[key].length, `Fallback: ${error.message}`);
      }
    })
  );

  try {
    await loadTools();
  } catch (error) {
    library.tools = normalizeManifestItems(fallbackLibrary.tools, "tools");
    setSourceState("tools", false, 0, `Unavailable: ${error.message}`);
    fileListStatus.textContent = "File list unavailable";
  }

  renderSources();
  updateSummary();
  setActiveTab(activeTab);
  showToast("CDN library ready");
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

document.querySelectorAll(".chip").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".chip.active")?.classList.remove("active");
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderCards();
  });
});

sourceList.addEventListener("click", (event) => {
  const button = event.target.closest(".source-tab");
  if (button) setActiveTab(button.dataset.tab);
});

cardsGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (!card) return;
  const item = filteredItems()[Number(card.dataset.index)];
  if (item) selectItem(item);
});

document.querySelector("#playNow").addEventListener("click", () => {
  if (!selectedItem) return;
  window.open(selectedItem.link, "_blank", "noopener,noreferrer");
  showToast(`Opening ${selectedItem.title}`);
});

document.querySelector("#refreshData").addEventListener("click", loadCdnData);
search.addEventListener("input", renderCards);

renderSources();
updateSummary();
selectItem(normalizeItem(fallbackLibrary.base[0], "base"));
renderCards();
loadCdnData();
