import { createMobileController } from "./controller-client.js";
import "./radio-font.js";

const screen = document.getElementById("controller-controls");
const statusLine = document.getElementById("controller-status");
const disconnectButton = document.getElementById("controller-disconnect");
const portrait = matchMedia("(orientation: portrait)");
const scene = new URLSearchParams(location.search).get("scene");
if (["coast", "marsh", "city", "harbor", "road", "club"].includes(scene)) {
  document.querySelector(".controller-photo").style.backgroundImage = `url("assets/${scene}.webp")`;
}
const responses = {
  connecting: "Conectando con Radio VI…",
  connected: "Mando conectado",
  disconnected: "Reconectando con Radio VI…",
  invalid: "Escanea un QR nuevo desde Ajustes",
  closed: "Mando desconectado",
};
const resetControls = [];
let connected = false;

const controller = createMobileController({
  onStatus(status) {
    connected = status === "connected";
    screen.inert = !connected;
    statusLine.textContent = responses[status] ?? responses.disconnected;
    disconnectButton.hidden = !connected && status !== "disconnected";
    if (!connected) resetControls.forEach((reset) => reset());
  },
});

function wireButton(button) {
  const index = Number(button.dataset.button);
  let pointerId = null;
  const keys = new Set();
  let accessibleTap;
  let pressed = false;

  function update() {
    const held = pointerId !== null || keys.size > 0 || accessibleTap !== undefined;
    if (pressed === held) return;
    pressed = held;
    button.toggleAttribute("data-held", held);
    controller.setButton(index, held);
  }

  function releasePointer(event) {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    update();
  }

  button.addEventListener("pointerdown", (event) => {
    if (!connected || event.button !== 0 || pointerId !== null) return;
    event.preventDefault();
    pointerId = event.pointerId;
    button.setPointerCapture(pointerId);
    update();
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(event, releasePointer);
  }
  button.addEventListener("keydown", (event) => {
    if (!connected || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    keys.add(event.key);
    update();
  });
  button.addEventListener("keyup", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    keys.delete(event.key);
    update();
  });
  button.addEventListener("blur", () => {
    keys.clear();
    update();
  });
  button.addEventListener("click", (event) => {
    if (!connected || event.detail !== 0) return;
    clearTimeout(accessibleTap);
    accessibleTap = setTimeout(() => {
      accessibleTap = undefined;
      update();
    }, 90);
    update();
  });
  resetControls.push(() => {
    if (pointerId !== null && button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
    pointerId = null;
    keys.clear();
    clearTimeout(accessibleTap);
    accessibleTap = undefined;
    pressed = false;
    button.removeAttribute("data-held");
  });
}

const arrowKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

function wireStick(stick) {
  const index = Number(stick.dataset.stick);
  const keys = new Set();
  let pointerId = null;

  function placeThumb(x, y) {
    const travel = stick.clientWidth * .18;
    stick.style.setProperty("--stick-x", `${x * travel}px`);
    stick.style.setProperty("--stick-y", `${y * travel}px`);
    stick.toggleAttribute("data-held", pointerId !== null || keys.size > 0);
  }

  function update(x, y) {
    const length = Math.max(1, Math.hypot(x, y));
    placeThumb(x / length, y / length);
    controller.setStick(index, x / length, y / length);
  }

  function movePointer(event) {
    if (event.pointerId !== pointerId) return;
    const box = stick.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const radius = box.width * .42;
    // In portrait the control surface is rotated clockwise to stay landscape.
    const x = portrait.matches ? dy : dx;
    const y = portrait.matches ? -dx : dy;
    update(x / radius, y / radius);
  }

  function updateKeys() {
    if (pointerId !== null) return;
    update(Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft")),
      Number(keys.has("ArrowDown")) - Number(keys.has("ArrowUp")));
  }

  stick.addEventListener("pointerdown", (event) => {
    if (!connected || event.button !== 0 || pointerId !== null) return;
    event.preventDefault();
    pointerId = event.pointerId;
    stick.setPointerCapture(pointerId);
    movePointer(event);
  });
  stick.addEventListener("pointermove", movePointer);
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    stick.addEventListener(event, (event) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      updateKeys();
    });
  }
  stick.addEventListener("keydown", (event) => {
    if (!connected || !arrowKeys.has(event.key)) return;
    event.preventDefault();
    keys.add(event.key);
    updateKeys();
  });
  stick.addEventListener("keyup", (event) => {
    if (!keys.delete(event.key)) return;
    event.preventDefault();
    updateKeys();
  });
  stick.addEventListener("blur", () => {
    keys.clear();
    updateKeys();
  });
  resetControls.push(() => {
    if (pointerId !== null && stick.hasPointerCapture(pointerId)) stick.releasePointerCapture(pointerId);
    pointerId = null;
    keys.clear();
    placeThumb(0, 0);
  });
}

function releaseInputs() {
  resetControls.forEach((reset) => reset());
  controller.releaseAll();
}

screen.querySelectorAll("[data-button]").forEach(wireButton);
screen.querySelectorAll("[data-stick]").forEach(wireStick);
window.addEventListener("blur", releaseInputs);
window.addEventListener("pagehide", releaseInputs);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseInputs();
});
portrait.addEventListener("change", releaseInputs);

function disconnect() {
  if (disconnectButton.hidden) return;
  releaseInputs();
  controller.close();
}

let disconnectPointer;
disconnectButton.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") disconnectPointer = event.pointerId;
});
disconnectButton.addEventListener("pointercancel", (event) => {
  if (event.pointerId === disconnectPointer) disconnectPointer = undefined;
});
disconnectButton.addEventListener("pointerup", (event) => {
  if (event.pointerId !== disconnectPointer) return;
  disconnectPointer = undefined;
  if (disconnectButton.contains(document.elementFromPoint(event.clientX, event.clientY))) disconnect();
});
disconnectButton.addEventListener("click", disconnect);
