// src/lib/eaglerforgeInjector.ts
//
// EaglerForge mods are plain .js files that get injected into a client
// that has already had ModAPI built into it via EaglerForgeInjector
// (https://eaglerforge.github.io/EaglerForgeInjector/). That injection
// happens offline, ahead of time, against an unminified/unobfuscated
// 1.8 or 1.12 EaglercraftX build — we can't do it in the browser.
//
// What we CAN do at play-time is load a client that's already
// "forge-ready" and tell it which mod(s) to fetch and inject on boot.
// The confirmed, documented way to do this is the `loadmod` query
// param — EaglerForge's mod loader reads one or more `loadmod=<url>`
// params off the page URL and fetches+injects each one before the
// game finishes booting. Multiple mods can be stacked by repeating
// the param.
//
//   your-client.html?loadmod=https://cdn.example.com/mymod.js
//   your-client.html?loadmod=<mod1>&loadmod=<mod2>
//
// Source: EaglerForgeInjector docs ("Loading Your Mod" — Method 1:
// URL Parameter), core/postinit.js in the injector's runtime.

export type MinecraftVersion = "1.8" | "1.12";

export interface ForgeReadyClient {
  contentId:  string;
  name:       string;
  assetUrl:   string;          // resolved URL to the client's HTML asset
  mcVersion:  MinecraftVersion;
}

export interface ModToLoad {
  name:      string;
  assetUrl:  string;           // resolved URL to the mod's .js asset
  mcVersion: MinecraftVersion;
}

/**
 * Picks forge-ready base clients that are compatible with the given
 * Minecraft version. Returns them in their original order (callers
 * may want to prefer ones flagged "default"/recommended upstream).
 */
export function findCompatibleBaseClients(
  clients: ForgeReadyClient[],
  mcVersion: MinecraftVersion,
): ForgeReadyClient[] {
  return clients.filter(c => c.mcVersion === mcVersion);
}

/**
 * Builds the final iframe `src` for running one or more mods against
 * a forge-ready base client. Throws if the mod's Minecraft version
 * doesn't match the chosen client's — these are not cross-compatible,
 * so silently ignoring the mismatch would just produce a broken
 * client-side error with no useful message.
 */
export function buildModLaunchUrl(
  baseClient: ForgeReadyClient,
  mods: ModToLoad[],
): string {
  const incompatible = mods.find(m => m.mcVersion !== baseClient.mcVersion);
  if (incompatible) {
    throw new Error(
      `"${incompatible.name}" targets Minecraft ${incompatible.mcVersion}, ` +
      `but "${baseClient.name}" is a ${baseClient.mcVersion} base client. ` +
      `Pick a base client built for ${incompatible.mcVersion}.`
    );
  }
  if (mods.length === 0) return baseClient.assetUrl;

  const url = new URL(baseClient.assetUrl, window.location.origin);
  for (const mod of mods) {
    url.searchParams.append("loadmod", mod.assetUrl);
  }
  return url.toString();
}
