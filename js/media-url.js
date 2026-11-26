const configuredUrl = globalThis.document?.querySelector('meta[name="radio-media-url"]')?.content.trim();
const mediaRoot = configuredUrl
  ? new URL(configuredUrl.replace(/\/?$/, "/"))
  : new URL("../", import.meta.url);

export function mediaUrl(path) {
  return new URL(path, mediaRoot);
}
