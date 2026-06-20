// src/lib/eaglerforgeInjector.ts
export interface LaunchOptions {
  clientUrl: string;
  mods: Array<{ url: string; minecraftVersion: string }>;
  baseMcVersion: string;
}

export function generateEaglerForgeLaunchUrl(opts: LaunchOptions): string {
  // Filter compatible mods ONLY
  const compatibleMods = opts.mods.filter(m => 
    m.minecraftVersion === opts.baseMcVersion || m.minecraftVersion === "1.8-1.12"
  );

  if (compatibleMods.length === 0) {
    return opts.clientUrl; // No mods
  }

  // EaglerForge injection pattern (based on public injector)
  const modParams = compatibleMods.map(m => `loadmod=${encodeURIComponent(m.url)}`).join('&');
  
  // Prefer Forge-ready clients or append injector
  let launchUrl = opts.clientUrl;
  
  if (!launchUrl.includes('eaglerforge')) {
    // Append EaglerForge injector script param or use special ?forge=1
    launchUrl += (launchUrl.includes('?') ? '&' : '?') + 'inject=eaglerforge';
  }

  // Stack mod URLs via EaglerForge mod manager param
  launchUrl += (launchUrl.includes('?') ? '&' : '?') + modParams;

  // Optional: window.eaglercraftXOpts = { mods: [...] } via postMessage or URL hash
  console.log('EaglerForge Launch:', launchUrl);
  return launchUrl;
}

// Usage in LaunchButton or ClientDetailPage
// Example:
const launchUrl = generateEaglerForgeLaunchUrl({
  clientUrl: client.versions[0].downloadUrl,
  mods: selectedMods,
  baseMcVersion: selectedClientMcVersion
});
window.open(launchUrl, '_blank');
