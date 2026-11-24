import { stations, onDemand, sceneNames } from "./catalog.js";
import { wireControls } from "./controls.js";
import { createPlayer } from "./player.js";
import { importCoverBatch } from "./cover-import.js";

const get = (id) => document.getElementById(id);
const setText = (id, value) => {
  const element = get(id);
  if (element.textContent !== value) element.textContent = value;
};
const tune = { radio: stations, demand: onDemand };
const positions = { radio: stations.findIndex(({ id }) => id === "mudclub"), demand: 0 };
const scenes = ["coast", "marsh", "city", "harbor", "road", "club"];
const covers = new Map();
const lyricFiles = new Map();
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const cardGroup = get("station-cards");
const libraryDialog = get("library-dialog");
const helpDialog = get("help-dialog");
const backdropLayers = [get("scenery-a"), get("scenery-b")];
let mode = "radio";
let power = true;
let lyricsVisible = false;
let imageLayer = 0;
let lastScene = "";
let playback = {};
let swipe;

const current = () => tune[mode][positions[mode]];
const wrap = (index) => (index + tune[mode].length) % tune[mode].length;
const player = createPlayer(get("audio"), renderPlayback);

function formatTime(seconds = 0) {
  const whole = Math.max(0, Math.floor(seconds));
  return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
}

function coverArt(station) {
  const cover = document.createElement("span");
  cover.className = "cover";
  cover.setAttribute("aria-hidden", "true");
  cover.dataset.art = (stations.concat(onDemand).indexOf(station) + 2) % 5;
  cover.style.setProperty("--card-accent", station.accent);
  cover.style.setProperty("--card-ink", station.ink);

  const code = document.createElement("span");
  code.className = "cover-code";
  code.textContent = station.monogram;
  const tag = document.createElement("span");
  tag.className = "cover-tag";
  tag.textContent = station.frequency;
  cover.append(code, tag);

  const saved = covers.get(station.id);
  if (saved) {
    const image = new Image();
    image.src = saved.url;
    image.alt = "";
    cover.append(image);
  }
  return cover;
}

function renderCards(direction = 0) {
  const rects = new Map([...cardGroup.children].map((card) => [card.dataset.id, card.getBoundingClientRect()]));
  const hadFocus = cardGroup.contains(document.activeElement);
  const cards = [-2, -1, 0, 1, 2].map((offset) => {
    const index = wrap(positions[mode] + offset);
    const station = tune[mode][index];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "station-card";
    card.dataset.id = station.id;
    card.setAttribute("aria-label", station.name);
    if (!offset) card.setAttribute("aria-current", "true");
    const caption = document.createElement("span");
    caption.className = "card-caption";
    caption.textContent = station.name;
    card.append(coverArt(station), caption);
    card.addEventListener("click", (event) => {
      if (event.detail && swipe?.moved) return;
      if (offset) choose(index, Math.sign(offset));
    });
    return card;
  });

  cardGroup.replaceChildren(...cards);
  if (hadFocus) cards[2].focus({ preventScroll: true });
  if (reduceMotion.matches || !direction) return;

  for (const card of cards) {
    if (!card.offsetWidth) continue;
    const before = rects.get(card.dataset.id);
    const after = card.getBoundingClientRect();
    const dx = before?.width ? before.left - after.left : direction * 34;
    const scale = before?.width ? before.width / after.width : .95;
    card.animate(
      [{ transform: "translateX(" + dx + "px) scale(" + scale + ")", opacity: before?.width ? .85 : .26 },
       { transform: "translateX(0) scale(1)", opacity: card.hasAttribute("aria-current") ? 1 : .87 }],
      { duration: 270, easing: "cubic-bezier(.2,.78,.22,1)" },
    );
  }
}

function showScenery(station) {
  if (lastScene === station.id) return;
  if (lastScene) imageLayer = 1 - imageLayer;
  lastScene = station.id;
  const layer = backdropLayers[imageLayer];
  const photo = scenes[station.scene];
  layer.style.backgroundImage = "linear-gradient(132deg," + station.ink + "93,transparent 66%),url('assets/" + photo + ".webp')";
  layer.classList.add("visible");
  backdropLayers[1 - imageLayer].classList.remove("visible");
}

function renderSelection(direction = 0) {
  const station = current();
  document.documentElement.style.setProperty("--accent", station.accent);
  const tabId = mode === "radio" ? "tab-radio" : "tab-demand";
  get("receiver").setAttribute("aria-labelledby", tabId);
  for (const id of ["tab-radio", "tab-demand"]) {
    get(id).setAttribute("aria-selected", String(id === tabId));
    get(id).tabIndex = id === tabId ? 0 : -1;
  }

  renderCards(direction);
  showScenery(station);
  get("dial").style.setProperty("--position", ((positions[mode] + .5) * 100 / tune[mode].length) + "%");
  get("station-genre").textContent = station.genre;
  get("station-frequency").textContent = station.frequency;
  get("station-name").textContent = station.name;
  get("station-meta").setAttribute("title", "Escena: " + sceneNames[station.scene]);
  get("mini-cover").replaceChildren(coverArt(station));
  get("now-title").textContent = station.name;
  get("library-station").textContent = station.name;

  if (direction && !reduceMotion.matches) {
    get("station-meta").getAnimations().forEach((animation) => animation.cancel());
    get("station-meta").animate(
      [{ opacity: .36, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 230, easing: "ease-out" },
    );
  }
}

function renderPlayback(state) {
  playback = state;
  const station = current();
  const playing = power && state.playing;
  const hasDuration = state.duration > 0;
  const label = !power ? "Radio apagada" : state.error || (
    state.hasAudio ? (playing ? "Reproduciendo" : "En pausa") : "Vista previa · añade audio"
  );
  get("now-state").textContent = label;
  const play = get("play");
  play.firstElementChild.textContent = playing ? "Ⅱ" : "▶";
  play.setAttribute("aria-label", playing ? "Pausar" : state.hasAudio ? "Reproducir" : "Cargar audio");

  get("current-time").textContent = formatTime(state.time);
  get("duration").textContent = formatTime(state.duration);
  const seek = get("seek");
  seek.disabled = !hasDuration;
  seek.max = hasDuration ? state.duration : 1;
  if (document.activeElement !== seek || !seek.matches(":active")) seek.value = state.time || 0;
  get("volume").value = state.volume ?? .8;

  setText("station-track", !power ? "Apagada" : state.hasAudio ?
    state.fileName.replace(/\.[^.]+$/, "") : station.track);
  setText("station-artist", power && !state.hasAudio ? station.artist : "");
  get("station-track").title = power && !state.hasAudio ?
    (station.source === "referencia" ? "Tema que aparece en la captura" : "Muestra de metadatos") : "";
  get("lyric-line").textContent = state.hasLyrics ?
    state.lyric || (state.hasAudio ? "…" : "Añade el audio para sincronizar las letras.") : "Añade letras LRC, VTT o SRT en Mi biblioteca.";
  get("lyric-previous").textContent = state.previousLyric || "";
  get("lyric-next").textContent = state.nextLyric || "";

  get("audio-file-label").textContent = state.fileName || "Elegir MP3, WAV u OGG";
  get("cover-file-label").textContent = covers.get(station.id)?.name || "Elegir PNG, JPEG o WebP";
  get("lyric-file-label").textContent = lyricFiles.get(station.id) || "Elegir LRC, VTT o SRT";
  get("library-error").hidden = !state.error;
  get("library-error").textContent = state.error || "";
}

function choose(index, direction) {
  positions[mode] = wrap(index);
  renderSelection(direction);
  player.select(current().id, power ? {} : { autoplay: false });
}

function step(direction) {
  choose(positions[mode] + direction, direction);
}

function setMode(nextMode, focusTab = false) {
  if (mode === nextMode) return;
  mode = nextMode;
  renderSelection(mode === "radio" ? -1 : 1);
  player.select(current().id, power ? {} : { autoplay: false });
  if (focusTab) get(mode === "radio" ? "tab-radio" : "tab-demand").focus();
}

function toggleMode() {
  setMode(mode === "radio" ? "demand" : "radio", document.activeElement?.role === "tab");
}

function setPower(enabled) {
  power = enabled;
  document.body.classList.toggle("off", !enabled);
  get("power-label").textContent = enabled ? "Apagar" : "Encender";
  if (!enabled && playback.playing) player.toggle();
  else if (enabled && playback.hasAudio && !playback.playing) player.toggle();
  renderPlayback(playback);
}

function toggleLyrics() {
  lyricsVisible = !lyricsVisible;
  get("lyrics-panel").hidden = !lyricsVisible;
  get("lyrics-button").setAttribute("aria-expanded", String(lyricsVisible));
}

function openLibrary() {
  renderPlayback(playback);
  if (!libraryDialog.open && !helpDialog.open) libraryDialog.showModal();
}

function togglePlayback() {
  if (!playback.hasAudio) openLibrary();
  else if (!power) setPower(true);
  else player.toggle();
}

function useFile(inputId, onFile) {
  const input = get(inputId);
  input.addEventListener("change", () => {
    const [file] = input.files;
    input.value = "";
    if (file) void onFile(file);
  });
}

get("tab-radio").addEventListener("click", () => setMode("radio"));
get("tab-demand").addEventListener("click", () => setMode("demand"));
for (const id of ["tab-radio", "tab-demand"]) {
  get(id).addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") setMode("radio", true);
    else if (event.key === "End") setMode("demand", true);
    else toggleMode();
  });
}

get("previous").addEventListener("click", () => step(-1));
get("next").addEventListener("click", () => step(1));
get("shoulder-left").addEventListener("click", () => step(-1));
get("shoulder-right").addEventListener("click", () => step(1));
get("power").addEventListener("click", () => setPower(!power));
get("lyrics-button").addEventListener("click", toggleLyrics);
get("play").addEventListener("click", togglePlayback);
get("open-library").addEventListener("click", openLibrary);
get("open-help").addEventListener("click", () => helpDialog.showModal());
get("seek").addEventListener("input", (event) => player.seek(event.target.valueAsNumber));
get("volume").addEventListener("input", (event) => player.setVolume(event.target.valueAsNumber));

get("choose-audio").addEventListener("click", () => get("audio-file").click());
get("choose-cover").addEventListener("click", () => get("cover-file").click());
const batchButton = get("choose-cover-batch");
const batchInput = get("cover-batch-file");
const batchStatus = get("cover-batch-status");
batchButton.addEventListener("click", () => batchInput.click());
batchInput.addEventListener("change", async () => {
  const files = [...batchInput.files];
  batchInput.value = "";
  if (!files.length) return;

  batchButton.disabled = true;
  batchStatus.hidden = false;
  batchStatus.textContent = "Leyendo portadas…";
  try {
    const { covers: imported, unmatched } = await importCoverBatch(files, [...stations, ...onDemand]);
    for (const [id, cover] of imported) {
      const previous = covers.get(id);
      covers.set(id, cover);
      if (previous) URL.revokeObjectURL(previous.url);
    }
    renderSelection();
    renderPlayback(playback);
    batchStatus.textContent = imported.size === 1 ? "1 portada asignada." : imported.size + " portadas asignadas.";
    if (unmatched) batchStatus.textContent += " Sin asignar: " + unmatched + ".";
  } catch {
    batchStatus.textContent = "No se pudo leer la selección de portadas.";
  } finally {
    batchButton.disabled = false;
  }
});
get("choose-lyrics").addEventListener("click", () => get("lyrics-file").click());
useFile("audio-file", (file) => {
  if (player.loadAudio(file) && !power) {
    power = true;
    document.body.classList.remove("off");
    get("power-label").textContent = "Apagar";
    renderPlayback(playback);
  }
});
useFile("lyrics-file", async (file) => {
  const id = current().id;
  if (await player.loadLyrics(file)) {
    lyricFiles.set(id, file.name);
    renderPlayback(playback);
  }
});
useFile("cover-file", (file) => {
  const station = current();
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
    get("library-error").hidden = false;
    get("library-error").textContent = "Selecciona una imagen PNG, JPEG, WebP o GIF.";
    return;
  }

  const preview = new Image();
  const url = URL.createObjectURL(file);
  preview.onload = () => {
    const previous = covers.get(station.id);
    covers.set(station.id, { url, name: file.name });
    if (previous) URL.revokeObjectURL(previous.url);
    renderSelection();
    renderPlayback(playback);
  };
  preview.onerror = () => {
    URL.revokeObjectURL(url);
    get("library-error").hidden = false;
    get("library-error").textContent = "El navegador no pudo leer la portada.";
  };
  preview.src = url;
});

cardGroup.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse") return;
  swipe = { x: event.clientX, y: event.clientY, pointer: event.pointerId, moved: false };
});
cardGroup.addEventListener("pointerup", (event) => {
  if (!swipe || swipe.pointer !== event.pointerId) return;
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
    swipe.moved = true;
    step(dx > 0 ? -1 : 1);
  }
  setTimeout(() => { if (swipe?.pointer === event.pointerId) swipe = undefined; }, 100);
});
cardGroup.addEventListener("pointercancel", () => { swipe = undefined; });

wireControls({
  previous: () => step(-1),
  next: () => step(1),
  togglePower: () => setPower(!power),
  toggleLyrics,
  showRadio: () => setMode("radio"),
  showDemand: () => setMode("demand"),
  isActive: () => !libraryDialog.open && !helpDialog.open,
  onGamepadChange: (connected) => { get("gamepad").hidden = !connected; },
});

renderSelection();
player.select(current().id);
player.setVolume(.8);

fetch("assets/photo-credits.json").then((response) => response.json()).then((photos) => {
  const credits = get("photo-credits");
  photos.forEach((photo, index) => {
    if (index > 0) credits.append(" · ");
    else credits.append("Fotografías de ");
    const link = document.createElement("a");
    link.href = photo.source;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = photo.author;
    credits.append(link);
  });
}).catch(() => {});
