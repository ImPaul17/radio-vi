import { bindSwipe } from "./controls.js";

const storageKey = "radio-vi-settings";

function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? {};
  } catch {
    return {};
  }
}

export function createSettingsControl({ onOpen, onClose, onMove, onSelect, onShuffleChange, onEffectsChange, onController, onBack }) {
  const toggle = document.getElementById("settings-toggle");
  const dialog = document.getElementById("settings-dialog");
  const options = document.getElementById("settings-options");
  const guide = document.getElementById("settings-guide");
  const selectButton = document.getElementById("settings-select");
  const exit = document.getElementById("settings-exit");
  const toggles = [
    { key: "shuffle", input: document.getElementById("shuffle-enabled"), onChange: onShuffleChange },
    { key: "effects", input: document.getElementById("effects-enabled"), onChange: onEffectsChange },
  ];
  const controller = document.getElementById("controller-settings");
  const choices = [...toggles.map(({ input }) => input), controller];
  const preferences = readPreferences();
  let selected = 0;
  options.style.setProperty("--guide-last", choices.length - 1);

  function select(index) {
    selected = index;
    options.style.setProperty("--guide-index", index);
    for (const [position, choice] of choices.entries()) {
      choice.closest(".settings-option").toggleAttribute("data-selected", position === index);
    }
    const input = choices[index];
    if (input === controller) {
      selectButton.setAttribute("aria-label", "Abrir mando móvil");
      return;
    }
    const label = document.getElementById(input.getAttribute("aria-labelledby")).textContent.trim().toLowerCase();
    selectButton.setAttribute("aria-label", `${input.checked ? "Desactivar" : "Activar"} ${label}`);
  }

  function confirm() {
    selectButton.focus({ preventScroll: true });
    choices[selected].click();
  }

  function moveSelection(direction) {
    const index = Math.max(0, Math.min(choices.length - 1, selected + direction));
    if (index === selected) return;
    select(index);
    selectButton.focus({ preventScroll: true });
    onMove();
  }

  bindSwipe(guide, (x, y) => {
    if (Math.abs(y) >= Math.abs(x)) moveSelection(Math.sign(y));
  }, (distance) => {
    options.classList.toggle("dragging", distance !== null);
    if (distance === null) options.style.removeProperty("--guide-drag-offset");
    else options.style.setProperty("--guide-drag-offset", `${distance}px`);
  });

  for (const [index, { key, input, onChange }] of toggles.entries()) {
    if (typeof preferences[key] === "boolean") input.checked = preferences[key];
    onChange(input.checked);
    input.addEventListener("focus", () => select(index));
    input.addEventListener("change", () => {
      select(index);
      onChange(input.checked);
      const settings = Object.fromEntries(toggles.map(({ key, input }) => [key, input.checked]));
      try {
        localStorage.setItem(storageKey, JSON.stringify(settings));
      } catch {
        // The current session still works when the browser blocks storage.
      }
      onSelect();
    });
  }
  controller.addEventListener("focus", () => select(choices.indexOf(controller)));
  controller.addEventListener("click", onController);

  toggle.addEventListener("click", () => {
    if (dialog.open) return;
    onOpen();
    select(0);
    dialog.showModal();
    toggle.setAttribute("aria-expanded", "true");
    selectButton.focus({ preventScroll: true });
  });
  selectButton.addEventListener("click", confirm);
  function back() {
    if (!onBack()) dialog.close();
  }

  exit.addEventListener("click", back);
  dialog.addEventListener("cancel", (event) => {
    if (onBack()) event.preventDefault();
  });
  dialog.addEventListener("close", () => {
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus({ preventScroll: true });
    onClose();
  });

  return {
    isOpen: () => dialog.open,
    close: () => dialog.close(),
    back,
    confirm,
    moveSelection,
  };
}
