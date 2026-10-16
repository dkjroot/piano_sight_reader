// Presets name the display resolution; budget generously for browser/desktop chrome.
export function layoutPreset(selection,height,width=1280) {
  const migrated=selection==='compact' ? '1080' : selection==='comfortable' ? '1440' : selection;
  const preset=['720','1080','1440','2160'].includes(migrated) ? migrated : height<=540 ? '720' : height<=900 ? '1080' : height<=1260 ? '1440' : '2160';
  return {preset,density:+preset<=1080 ? 'compact' : 'comfortable',budget:Math.min(height,+preset-180),preferred:({720:200,1080:280,1440:300,2160:360})[preset],minimum:width<650 ? 170 : 180};
}
export function staffViewport(profile,chromeHeight) {
  return Math.max(profile.minimum,Math.min(profile.preferred,profile.budget-chromeHeight));
}
