import { mediaUrl } from "./media-url.js";

const fontUrl = mediaUrl("media/fonts/GTAArtDeco-Condensed-Bold.ttf");
const source = `local("GTAArtDeco Condensed Bold"), local("GTAArtDeco-CondensedBold"), url(${JSON.stringify(fontUrl.href)}) format("truetype")`;

const font = new FontFace("GTA Art Deco Condensed", source, { weight: "700", display: "swap" });
document.fonts.add(font);
font.load().catch(() => {});
