import { demandShelf, extraRadioShelf, radioShelf } from "./covers.js";
import { bindSwipe, wireControls } from "./controls.js";
import { createRadioPlayer } from "./player.js";
import { mediaUrl } from "./media-url.js";
import { createPlaybackBar } from "./playback-bar.js";
import { createVolumeControl } from "./volume.js";
import { createSettingsControl } from "./settings.js";
import { createControllerPairing } from "./controller-pairing.js";
import "./radio-font.js";

const $ = (id) => document.getElementById(id);
const shelves = { extra: extraRadioShelf, radio: radioShelf, demand: demandShelf };
const modes = Object.keys(shelves);
const positions = { extra: 0, radio: 0, demand: 0 };
const cardOffsets = [-2, -1, 0, 1, 2];
const photos = ["coast", "marsh", "city", "harbor", "road", "club"];
const scenes = [...document.querySelectorAll(".scene-photo")];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const cards = $("cards");
const coverImages = new Map();
const maxCoverWait = 6000;
const dial = $("dial");
const modeControl = $("mode-control");
const stationAudio = $("station-audio");
const tuneAudio = $("tune-audio");
const powerAudio = $("power-audio");
powerAudio.src = mediaUrl("media/radio-local/power.wav");
const keyButtons = {
  previous: $("shoulder-left"), next: $("shoulder-right"), togglePower: $("power"),
  previousTrack: $("song-previous"), nextTrack: $("song-next"), togglePlaylist: $("playlist-toggle"),
  toggleVolume: $("volume-toggle"), volumeSelect: $("volume-select"), exitMenu: $("menu-exit"),
  toggleSettings: $("settings-toggle"), settingsSelect: $("settings-select"),
  playlistSelect: $("playlist-select"),
};

let mode = "radio";
let radioOff = true;
let sceneIndex = 0;
let sceneSource = "";
let nowPlaying;
let tuningAnimation;

const player = createRadioPlayer({
  audio: stationAudio,
  tune: tuneAudio,
  onChange(track) {
    nowPlaying = track;
    renderInfo();
  },
  onUpdate: renderPlayback,
});

const playbackBar = createPlaybackBar({
  onChoose: (index) => playFromBar((id) => player.playQueueEntry(id, index)),
  onStep(direction) {
    player.playTune();
    playFromBar((id) => player.stepQueue(id, direction));
  },
  onToggle(open) {
    if (open) {
      volumeControl.close();
      const selectedTrack = $("playlist-entries").querySelector("[data-selected]");
      (selectedTrack ?? $("menu-exit")).focus({ preventScroll: true });
    }
    playPowerSound();
  },
  onSeek(seconds) {
    if (!radioOff) player.seek(currentStation().id, seconds);
  },
});

const volumeControl = createVolumeControl({
  music: stationAudio,
  onToggle(open) {
    if (open) playbackBar.close();
    playPowerSound();
  },
  onSelect: playPowerSound,
});

const controllerPairing = createControllerPairing({
  relay: mediaUrl(""),
  getScene: () => sceneSource,
  onViewChange(open) {
    $("settings-options").hidden = open;
    if ($("settings-dialog").open) {
      $(open ? "settings-exit" : "settings-select").focus({ preventScroll: true });
    }
  },
  onPaired() {
    if (settingsControl.isOpen()) settingsControl.close();
  },
});

const settingsControl = createSettingsControl({
  onOpen() {
    volumeControl.close();
    playbackBar.close();
    playPowerSound();
  },
  onClose() {
    controllerPairing.closeView();
    playPowerSound();
  },
  onMove: () => player.playTune(),
  onSelect: playPowerSound,
  onShuffleChange: player.setShuffle,
  onController: controllerPairing.open,
  onBack: controllerPairing.closeView,
  onEffectsChange(enabled) {
    for (const effect of [tuneAudio, powerAudio]) {
      effect.muted = !enabled;
      if (effect.muted) effect.pause();
    }
  },
});

function currentShelf() {
  return shelves[mode];
}

function currentStation() {
  return currentShelf()[positions[mode]];
}

function playSelectedStation() {
  player.playStation(currentStation().id);
}

function playFromBar(action) {
  const wasOff = radioOff;
  radioOff = false;
  action(currentStation().id);
  if (wasOff) render();
}

function renderPlayback() {
  const station = currentStation();
  playbackBar.update({ station, state: player.getPlayback(station.id), off: radioOff });
}

function stationIndex(index) {
  if (mode !== "radio") return index;
  const { length } = currentShelf();
  return ((index % length) + length) % length;
}

function changeScene(station) {
  const source = photos[station.scene];
  if (source === sceneSource) return;
  const previous = scenes[sceneIndex];
  if (sceneSource) sceneIndex = 1 - sceneIndex;
  sceneSource = source;
  const next = scenes[sceneIndex];
  next.style.backgroundImage = "url('assets/" + source + ".webp')";
  next.classList.add("visible");
  if (previous !== next) previous.classList.remove("visible");
}

async function loadCover(station) {
  const image = new Image();
  image.alt = "";
  image.draggable = false;
  image.src = new URL(`../${station.cover}`, import.meta.url);

  try {
    await image.decode();
  } catch {
    return;
  }

  coverImages.set(station.id, image);
  cards.querySelector(`[data-station="${station.id}"] .placeholder`)?.replaceWith(image);
}

async function preloadCovers() {
  const stations = Object.values(shelves).flat().filter(({ cover }) => cover);
  let timeout;
  await Promise.race([
    Promise.all(stations.map(loadCover)),
    new Promise((resolve) => { timeout = setTimeout(resolve, maxCoverWait); }),
  ]);
  clearTimeout(timeout);
}

function stationCard(station, index, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "card";
  button.dataset.station = station.id;
  button.setAttribute("aria-label", station.name);
  button.title = station.name;
  if (active) button.setAttribute("aria-current", "true");

  const image = coverImages.get(station.id);
  if (image) {
    button.append(image);
  } else {
    const placeholder = document.createElement("span");
    placeholder.className = "placeholder";
    placeholder.textContent = station.monogram;
    placeholder.setAttribute("aria-hidden", "true");
    button.append(placeholder);
  }

  button.addEventListener("click", () => select(index));
  return button;
}

function emptyStationCard(offset) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "card card-empty";
  button.tabIndex = -1;
  button.setAttribute("aria-label", "Espacio de emisora vacío");
  button.addEventListener("click", () => rejectTuning(Math.sign(offset)));
  return button;
}

function renderCards(direction) {
  tuningAnimation?.cancel();
  const focusWasInCards = cards.contains(document.activeElement);
  const previous = new Map([...cards.querySelectorAll("[data-station]")]
    .map((card) => [card.dataset.station, card.getBoundingClientRect()]));
  const selected = positions[mode];
  const visible = cardOffsets.map((offset) => {
    const index = stationIndex(selected + offset);
    const station = currentShelf()[index];
    return station ? stationCard(station, index, offset === 0) : emptyStationCard(offset);
  });
  cards.replaceChildren(...visible);
  if (focusWasInCards) visible[Math.floor(visible.length / 2)].focus({ preventScroll: true });

  if (!direction || reducedMotion.matches) return;
  for (const card of visible) {
    if (!card.offsetWidth) continue;
    const before = previous.get(card.dataset.station);
    const offset = before?.width ? before.left - card.getBoundingClientRect().left : direction * 24;
    card.animate(
      [{ transform: "translateX(" + offset + "px)", opacity: before?.width ? 1 : 0 },
       { transform: "translateX(0)", opacity: 1 }],
      { duration: 220, easing: "cubic-bezier(.2,.7,.26,1)" },
    );
  }
}

function renderInfo() {
  const station = currentStation();
  const artist = $("station-artist");
  $("station-name").textContent = station.name;
  $("station-track").textContent = radioOff ? "Apagada" : nowPlaying?.title ?? station.track ?? "";
  artist.textContent = radioOff ? "" : nowPlaying?.artist ?? station.artist ?? "";
  artist.title = !radioOff && nowPlaying?.writers ? `Composición · ${nowPlaying.writers}` : "";
}

function render(direction = 0) {
  const canTune = currentShelf().length > 1;
  const station = currentStation();
  modeControl.style.setProperty("--guide-index", modes.indexOf(mode));
  for (const section of modes) $(`${section}-mode`).setAttribute("aria-pressed", String(mode === section));
  renderInfo();
  $("power-label").textContent = radioOff ? "Encender" : "Apagar";
  document.body.dataset.radioMode = mode;
  document.body.toggleAttribute("data-off", radioOff);
  dial.disabled = !canTune;
  dial.max = canTune ? currentShelf().length : cardOffsets.length;
  dial.value = canTune ? positions[mode] + 1 : cardOffsets.indexOf(0) + 1;
  dial.setAttribute("aria-valuetext", canTune ? station.name + ", " + dial.value + " de " + dial.max : station.name);
  renderCards(direction);
  renderPlayback();
  if (station.scene != null) changeScene(station);
}

function select(index, direction = Math.sign(index - positions[mode])) {
  const selected = stationIndex(index);
  if (!currentShelf()[selected]) {
    rejectTuning(direction);
    return;
  }
  if (selected === positions[mode]) {
    if (!radioOff) playSelectedStation();
    return;
  }

  positions[mode] = selected;
  nowPlaying = undefined;
  if (!radioOff) {
    player.playTune();
    playSelectedStation();
  }
  render(direction);
}

function step(direction) {
  select(positions[mode] + direction, direction);
}

function rejectTuning(direction) {
  player.playTune();
  if (reducedMotion.matches) return;
  tuningAnimation?.cancel();
  tuningAnimation = cards.animate([
    { transform: "translateX(0)" },
    { transform: `translateX(${-direction * 8}px)`, offset: .35 },
    { transform: "translateX(0)" },
  ], { duration: 180, easing: "ease-out" });
}

function setMode(nextMode) {
  if (mode === nextMode) return;
  const direction = modes.indexOf(nextMode) - modes.indexOf(mode);
  mode = nextMode;
  nowPlaying = undefined;
  if (radioOff) player.pause();
  else playSelectedStation();
  player.playTune();
  render(Math.sign(direction));
}

function moveMode(direction) {
  const nextMode = modes[modes.indexOf(mode) + direction];
  if (nextMode) setMode(nextMode);
}

function playPowerSound() {
  if (powerAudio.muted) return;
  powerAudio.currentTime = 0;
  powerAudio.play().catch(() => {});
}

function exitMenu() {
  const wasVolume = volumeControl.close();
  if (!wasVolume && !playbackBar.close()) return;
  $(wasVolume ? "volume-toggle" : "playlist-toggle").focus({ preventScroll: true });
  playPowerSound();
}

function togglePower() {
  radioOff = !radioOff;
  if (radioOff) player.pause();
  else playSelectedStation();
  playPowerSound();
  render();
}

function animateControlPress(action) {
  const button = keyButtons[action];
  if (!button || button.disabled || reducedMotion.matches) return;

  button.firstElementChild.animate([
    { transform: "none" },
    { transform: "var(--button-pressed)", offset: .44 },
    { transform: "none" },
  ], { duration: 240, easing: "ease-out" });
}

bindSwipe(cards, (x, y) => {
  if (Math.abs(y) > Math.abs(x)) moveMode(Math.sign(y));
  else step(x < 0 ? 1 : -1);
});

bindSwipe(modeControl, (x, y) => {
  if (Math.abs(y) >= 24 && Math.abs(y) >= Math.abs(x)) moveMode(Math.sign(y));
}, (distance) => {
  if (distance === null) {
    modeControl.style.removeProperty("--drag-offset");
    modeControl.classList.remove("dragging");
    return;
  }
  modeControl.style.setProperty("--drag-offset", distance + "px");
  modeControl.classList.add("dragging");
});

for (const id of ["previous", "shoulder-left"]) $(id).addEventListener("click", () => step(-1));
for (const id of ["next", "shoulder-right"]) $(id).addEventListener("click", () => step(1));
for (const section of modes) $(`${section}-mode`).addEventListener("click", () => setMode(section));
$("power").addEventListener("click", togglePower);
$("menu-exit").addEventListener("click", exitMenu);
dial.addEventListener("input", () => select(dial.valueAsNumber - 1));

const navigationActions = {
  left: { radio: "previous", playlist: -1, volume: -5 },
  right: { radio: "next", playlist: 1, volume: 5 },
  up: { radio: "modeUp", playlist: -1, volume: 5 },
  down: { radio: "modeDown", playlist: 1, volume: -5 },
  leftStickUpRight: { radio: "next", playlist: -1, volume: 1 },
  leftStickDownLeft: { radio: "previous", playlist: 1, volume: -1 },
};

const radioActions = {
  previous: () => step(-1),
  next: () => step(1),
  modeUp: () => moveMode(-1),
  modeDown: () => moveMode(1),
  previousTrack: () => $("song-previous").click(),
  nextTrack: () => $("song-next").click(),
  togglePlaylist: () => $("playlist-toggle").click(),
  toggleVolume: () => $("volume-toggle").click(),
  toggleSettings: () => $("settings-toggle").click(),
  togglePower,
  exitMenu,
};

wireControls({
  isActive: () => !document.body.hasAttribute("data-loading-covers"),
  getRemoteGamepad: controllerPairing.nextGamepad,
  subscribeRemoteGamepad: controllerPairing.subscribeGamepad,
  getContext() {
    if (settingsControl.isOpen() && controllerPairing.isOpen()) return "controller-pairing";
    if (settingsControl.isOpen()) return "settings";
    if (volumeControl.isOpen()) return volumeControl.isAdjusting() ? "volume-adjust" : "volume";
    return playbackBar.isOpen() ? "playlist" : "radio";
  },
  onAction(action, source) {
    const navigation = navigationActions[action];
    if (settingsControl.isOpen()) {
      if (controllerPairing.isOpen()) {
        if (action === "exitMenu" || action === "toggleSettings") settingsControl.back();
        return true;
      }
      if (action === "exitMenu" || action === "toggleSettings") settingsControl.close();
      else if (navigation) settingsControl.moveSelection(navigation.playlist);
      else if (action === "modeUp" || action === "modeDown") settingsControl.moveSelection(action === "modeUp" ? -1 : 1);
      else if (action === "confirm" || action === "cross") {
        animateControlPress("settingsSelect");
        settingsControl.confirm();
      }
      return true;
    }
    const volumeOpen = volumeControl.isOpen();
    const playlistOpen = playbackBar.isOpen();
    const menuOpen = volumeOpen || playlistOpen;
    if (menuOpen && (action === "togglePlaylist" || action === "toggleVolume")) return true;
    if (!menuOpen && action === "exitMenu") return false;
    if (volumeOpen && action !== "exitMenu" && action !== "toggleSettings") {
      if (navigation) {
        if (volumeControl.isAdjusting()) volumeControl.adjust(navigation.volume);
      } else if (action === "confirm" || action === "cross") {
        animateControlPress("volumeSelect");
        volumeControl.confirm();
      }
      return true;
    }
    if (playlistOpen) {
      const direction = navigation?.playlist;
      if (direction) {
        playbackBar.moveSelection(direction, { focus: source === "keyboard" });
        return true;
      }
      if (action === "confirm" || action === "cross") {
        animateControlPress("playlistSelect");
        playbackBar.playSelection();
        return true;
      }
    }
    const radioAction = navigation?.radio ?? (action === "cross" ? "togglePower" : action);
    const run = radioActions[radioAction];
    if (!run) return false;
    animateControlPress(radioAction);
    run();
    return true;
  },
});

preloadCovers().then(() => {
  render();
  document.body.removeAttribute("data-loading-covers");
});
