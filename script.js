const library = {
  clients: [
    {
      icon: "CX",
      title: "EaglercraftX 1.8.8",
      description: "Stable classic client with fast startup, offline profiles, and LAN relay support.",
      badge: "Base"
    },
    {
      icon: "LE",
      title: "Legendary Edition 1.20.1",
      description: "Modern profile inspired by polished desktop launchers with Forge-style metadata.",
      badge: "Featured"
    },
    {
      icon: "SH",
      title: "Shadow Client",
      description: "Performance-focused build for lightweight devices and school Chromebooks.",
      badge: "Fast"
    }
  ],
  mods: [
    {
      icon: "MM",
      title: "Xaero Minimap Pack",
      description: "Exploration overlay with waypoint-inspired styling for modded worlds.",
      badge: "Utility"
    },
    {
      icon: "VP",
      title: "Visual Plus Bundle",
      description: "Client-side ambience upgrades, particles, and compact HUD improvements.",
      badge: "Visual"
    },
    {
      icon: "BT",
      title: "Backpack Tools",
      description: "Inventory helper module for quick item sorting and survival setup.",
      badge: "Survival"
    }
  ],
  "resource-packs": [
    {
      icon: "LR",
      title: "Legendary Resource Pack",
      description: "Crisp 64x textures tuned for a dark launcher aesthetic and PvE worlds.",
      badge: "64x"
    },
    {
      icon: "BM",
      title: "Better Maps 1.17",
      description: "Sharper maps, readable icons, and warm terrain colors for long sessions.",
      badge: "16x"
    },
    {
      icon: "UI",
      title: "Enhanced UI 256x",
      description: "High-resolution menus and inventory details for desktop play.",
      badge: "256x"
    }
  ],
  tools: [
    {
      icon: "IM",
      title: "Import Manager",
      description: "Drop local HTML, ZIP, or JSON manifests into your launcher library.",
      badge: "Local"
    },
    {
      icon: "RC",
      title: "Relay Checker",
      description: "Test multiplayer relay health before joining a world with friends.",
      badge: "Network"
    },
    {
      icon: "PS",
      title: "Profile Sandbox",
      description: "Try new clients safely without replacing your main launch profile.",
      badge: "Safe"
    }
  ]
};

const packs = [
  ["LR", "Legendary_Resource_Pack", "DO NOT REMOVE, KEEP ME ON TOP"],
  ["BM", "Better Maps 1.17.zip", "Improved map icons for Minecraft"],
  ["RT", "ShinyU0027s+Rats+v1.zip", "Unknown compatibility"],
  ["DY", "bottled-dye-e620.zip", "Pack up the dye!"],
  ["BN", "better-banners-e1870.zip", "Version 2.0"],
  ["IM", "LootChestRetexture", "Retextures loot chests to fit builds"]
];

const cardsGrid = document.querySelector("#cardsGrid");
const packList = document.querySelector("#packList");
const activeLabel = document.querySelector("#activeLabel");
const activeTitle = document.querySelector("#activeTitle");
const search = document.querySelector("#search");
const toast = document.querySelector("#toast");
let activeTab = "clients";

function titleCase(value) {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function renderCards() {
  const term = search.value.trim().toLowerCase();
  const items = library[activeTab].filter((item) => {
    const haystack = `${item.title} ${item.description} ${item.badge}`.toLowerCase();
    return haystack.includes(term);
  });

  activeLabel.textContent = titleCase(activeTab);
  activeTitle.textContent = `${titleCase(activeTab)} Library`;
  cardsGrid.innerHTML = items
    .map(
      (item) => `
        <article class="card">
          <div class="card-icon" aria-hidden="true">${item.icon}</div>
          <div>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
          </div>
          <div class="card-footer">
            <span class="badge">${item.badge}</span>
            <button class="launch-link" type="button">Select →</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderPacks() {
  packList.innerHTML = packs
    .map(
      ([icon, title, subtitle]) => `
        <article class="pack-card">
          <span class="pack-icon" aria-hidden="true">${icon}</span>
          <span>
            <strong>${title}</strong>
            <small>${subtitle}</small>
          </span>
          <span class="pack-toggle" aria-hidden="true">✓</span>
        </article>
      `
    )
    .join("");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".nav-item.active").classList.remove("active");
    button.classList.add("active");
    activeTab = button.dataset.tab;
    renderCards();
  });
});

cardsGrid.addEventListener("click", (event) => {
  if (event.target.matches(".launch-link")) {
    const title = event.target.closest(".card").querySelector("h3").textContent;
    showToast(`${title} selected`);
  }
});

document.querySelector("#playNow").addEventListener("click", () => {
  showToast("Launching Legendary Survival profile...");
});

search.addEventListener("input", renderCards);

renderPacks();
renderCards();
