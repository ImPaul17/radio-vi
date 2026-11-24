import { radioShelf, demandShelf } from "./covers.js";
import { wireControls } from "./controls.js";

const $ = (id) => document.getElementById(id);
const shelves = { radio: radioShelf, demand: demandShelf };
const positions = { radio: radioShelf.findIndex(({ id }) => id === "la-ola"), demand: 0 };
const photos = ["coast", "marsh", "city", "harbor", "road", "club"];
const scenes = [...document.querySelectorAll(".scene-photo")];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const cards = $("cards");
const dial = $("dial");
const modeControl = $("mode-control");

let mode = "radio";
let off = false;
let sceneIndex = 0;
let sceneSource = "";

function currentShelf() {
  return shelves[mode];
}

function wrap(index) {
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

function stationCard(station, index, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "card";
  button.dataset.station = station.id;
  button.setAttribute("aria-label", station.name);
  button.title = station.name;
  if (active) button.setAttribute("aria-current", "true");

  const placeholder = document.createElement("span");
  placeholder.className = "placeholder";
  placeholder.textContent = station.monogram;
  placeholder.setAttribute("aria-hidden", "true");

  if (station.cover) {
    const image = new Image();
    image.src = station.cover;
    image.alt = "";
    image.draggable = false;
    image.addEventListener("error", () => image.replaceWith(placeholder), { once: true });
    button.append(image);
  } else {
    button.append(placeholder);
  }

  button.addEventListener("click", () => select(index));
  return button;
}

function renderCards(direction) {
  const focusWasInCards = cards.contains(document.activeElement);
  const previous = new Map([...cards.children].map((card) => [card.dataset.station, card.getBoundingClientRect()]));
  const selected = positions[mode];
  const visible = [-2, -1, 0, 1, 2].map((offset) => {
    const index = wrap(selected + offset);
    return stationCard(currentShelf()[index], index, offset === 0);
  });
  cards.replaceChildren(...visible);
  if (focusWasInCards) visible[2].focus({ preventScroll: true });

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

function render(direction = 0) {
  const station = currentShelf()[positions[mode]];
  modeControl.dataset.mode = mode;
  $("radio-mode").setAttribute("aria-pressed", String(mode === "radio"));
  $("demand-mode").setAttribute("aria-pressed", String(mode === "demand"));
  $("station-name").textContent = off ? "Radio apagada" : station.name;
  $("station-track").textContent = off ? "" : [station.track, station.artist].filter(Boolean).join(" · ");
  $("power-label").textContent = off ? "Encender" : "Apagar";
  document.body.toggleAttribute("data-off", off);
  dial.max = currentShelf().length;
  dial.value = positions[mode] + 1;
  dial.setAttribute("aria-valuetext", station.name + ", " + dial.value + " de " + dial.max);
  renderCards(direction);
  changeScene(station);
}

function select(index, direction = Math.sign(index - positions[mode])) {
  const selected = wrap(index);
  if (selected === positions[mode]) return;
  positions[mode] = selected;
  render(direction);
}

function step(direction) {
  select(positions[mode] + direction, direction);
}

function setMode(nextMode) {
  if (mode === nextMode) return;
  mode = nextMode;
  render(mode === "demand" ? 1 : -1);
}

function togglePower() {
  off = !off;
  render();
}

function bindSwipe(element, onSwipe, showDrag) {
  let gesture;
  let swallowClick = false;

  element.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    swallowClick = false;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.target.setPointerCapture?.(event.pointerId);
  });
  element.addEventListener("pointermove", (event) => {
    if (gesture?.id !== event.pointerId) return;
    showDrag?.(event.clientY - gesture.y);
  });
  element.addEventListener("pointerup", (event) => {
    if (gesture?.id !== event.pointerId) return;
    const x = event.clientX - gesture.x;
    const y = event.clientY - gesture.y;
    gesture = undefined;
    showDrag?.(null);
    if (Math.max(Math.abs(x), Math.abs(y)) >= 24) {
      swallowClick = true;
      onSwipe(x, y);
    }
  });
  element.addEventListener("pointercancel", () => {
    gesture = undefined;
    showDrag?.(null);
  });
  element.addEventListener("click", (event) => {
    if (!swallowClick || !event.detail) return;
    swallowClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true });
}

bindSwipe(cards, (x, y) => {
  if (Math.abs(y) > Math.abs(x)) setMode(y > 0 ? "demand" : "radio");
  else step(x < 0 ? 1 : -1);
});

bindSwipe(modeControl, (x, y) => {
  if (Math.abs(y) >= 24 && Math.abs(y) >= Math.abs(x)) setMode(y > 0 ? "demand" : "radio");
}, (distance) => {
  if (distance === null) {
    modeControl.style.removeProperty("--drag-position");
    modeControl.classList.remove("dragging");
    return;
  }
  const start = mode === "demand" ? 34 : 0;
  const position = Math.max(0, Math.min(34, start + distance));
  modeControl.style.setProperty("--drag-position", position + "px");
  modeControl.classList.add("dragging");
});

for (const id of ["previous", "shoulder-left"]) $(id).addEventListener("click", () => step(-1));
for (const id of ["next", "shoulder-right"]) $(id).addEventListener("click", () => step(1));
$("radio-mode").addEventListener("click", () => setMode("radio"));
$("demand-mode").addEventListener("click", () => setMode("demand"));
$("power").addEventListener("click", togglePower);
dial.addEventListener("input", () => select(dial.valueAsNumber - 1));

wireControls({
  previous: () => step(-1),
  next: () => step(1),
  showRadio: () => setMode("radio"),
  showDemand: () => setMode("demand"),
  togglePower,
});

render();
