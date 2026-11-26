import { createHostController } from "./controller-client.js";
import { QrCode } from "./qrcodegen.js";

const messages = {
  connecting: "Generando el código…",
  waiting: "Escanea el código con la cámara del móvil.",
  connected: "Mando conectado.",
  disconnected: "Se perdió la conexión. Vuelve a abrir el mando en el móvil para recuperarla.",
  closed: "Mando desconectado.",
  error: "No se pudo completar el emparejamiento.",
};

function drawCode(canvas, url) {
  const code = QrCode.encodeText(url.href, QrCode.Ecc.MEDIUM);
  const margin = 4;
  const cell = 5;
  canvas.width = canvas.height = (code.size + 2 * margin) * cell;
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#000";
  for (let y = 0; y < code.size; y++) {
    for (let x = 0; x < code.size; x++) {
      if (code.getModule(x, y)) context.fillRect((x + margin) * cell, (y + margin) * cell, cell, cell);
    }
  }
}

export function createControllerPairing({ relay, getScene, onViewChange, onPaired }) {
  const panel = document.getElementById("controller-pairing");
  const hint = document.getElementById("controller-pairing-status");
  const canvas = document.getElementById("controller-qr");
  const link = document.getElementById("controller-link");
  const retry = document.getElementById("controller-retry");
  const disconnect = document.getElementById("controller-disconnect");
  const frames = [];
  const pad = {
    index: -1, mapping: "standard", connected: true, axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
  };
  let state = "closed";
  let paired = false;
  let hasCode = false;
  let attempt = 0;
  let notifyGamepad;

  function render() {
    hint.textContent = messages[state];
    canvas.hidden = link.hidden = state !== "waiting" || !hasCode;
    disconnect.hidden = !paired || state === "closed" || state === "error";
    retry.hidden = state !== "error" && state !== "closed";
  }

  function clearFrames() {
    frames.length = 0;
    pad.axes.fill(0);
    for (const button of pad.buttons) button.pressed = false;
    notifyGamepad?.();
  }

  const host = createHostController({
    relay,
    onStatus(next) {
      state = next;
      if (state !== "connected") clearFrames();
      if (state === "connected" && !paired) {
        paired = true;
        link.removeAttribute("href");
        hasCode = false;
        onPaired();
      }
      render();
    },
    onFrame(frame) {
      if (state !== "connected" || document.hidden) return;
      // Preserve quick taps when a single poll returns both the press and release.
      if (frames.length >= 96) frames.shift();
      frames.push(frame);
      notifyGamepad?.();
    },
  });

  function endSession() {
    attempt++;
    paired = false;
    hasCode = false;
    link.removeAttribute("href");
    void host.close();
    clearFrames();
  }

  async function begin() {
    endSession();
    const request = attempt;
    try {
      const url = await host.start();
      if (request !== attempt || paired) return;
      const scene = getScene();
      if (scene) url.searchParams.set("scene", scene);
      drawCode(canvas, url);
      link.href = url.href;
      hasCode = true;
    } catch {
      if (request !== attempt) return;
      endSession();
      state = "error";
    }
    render();
  }

  retry.addEventListener("click", begin);
  disconnect.addEventListener("click", endSession);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearFrames();
  });

  return {
    open() {
      if (!panel.hidden) return;
      panel.hidden = false;
      onViewChange(true);
      render();
      if (state === "closed" || state === "error") void begin();
    },
    isOpen: () => !panel.hidden,
    closeView() {
      if (panel.hidden) return false;
      panel.hidden = true;
      onViewChange(false);
      if (!paired) endSession();
      return true;
    },
    nextGamepad() {
      if (state !== "connected") return undefined;
      const frame = frames.shift();
      if (frame) {
        pad.axes = frame.axes;
        for (const [index, button] of pad.buttons.entries()) button.pressed = frame.buttons[index];
      }
      return pad;
    },
    subscribeGamepad(listener) {
      notifyGamepad = listener;
      return () => { notifyGamepad = undefined; };
    },
  };
}
