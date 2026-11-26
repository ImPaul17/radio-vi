export function createVolumeControl({ music, effects, onToggle, onSelect }) {
  const toggle = document.getElementById("volume-toggle");
  const panel = document.getElementById("volume-panel");
  const level = document.getElementById("volume-level");
  const percent = document.getElementById("volume-percent");
  const mute = document.getElementById("volume-mute");
  const icon = document.getElementById("volume-icon");
  const effectsEnabled = document.getElementById("effects-enabled");
  const selectButton = document.getElementById("volume-select");
  const selectLabel = selectButton.querySelector("span");
  let lastAudible = 100;
  let selection = "music";
  let adjusting = false;

  function setLevel(value) {
    level.valueAsNumber = value;
    if (value > 0) lastAudible = value;

    const label = `${value}%`;
    const muted = value === 0;
    const iconName = muted ? "muted" : value < 50 ? "min" : "max";
    percent.value = label;
    level.setAttribute("aria-valuetext", label);
    level.style.setProperty("--range-position", label);
    mute.setAttribute("aria-label", muted ? "Restaurar volumen de la música" : "Silenciar música");
    const iconSource = `assets/volume-${iconName}.png`;
    if (icon.getAttribute("src") !== iconSource) icon.src = iconSource;

    music.volume = value / 100;
  }

  function applyEffectsSetting() {
    for (const effect of effects) {
      effect.muted = !effectsEnabled.checked;
      if (effect.muted) effect.pause();
    }
  }

  function setAdjusting(value) {
    adjusting = value;
    panel.toggleAttribute("data-adjusting", value);
    selectLabel.textContent = value ? "Listo" : "Seleccionar";
  }

  function select(option) {
    if (selection === option) return;
    selection = option;
    panel.dataset.selection = option;
    setAdjusting(false);
  }

  function focusOption(option) {
    select(option);
    const control = option === "music" ? level : effectsEnabled;
    control.focus({ preventScroll: true });
  }

  function confirm() {
    if (selection === "effects") {
      effectsEnabled.click();
      return;
    }
    setAdjusting(!adjusting);
    level.focus({ preventScroll: true });
    onSelect?.();
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) focusOption("music");
    else setAdjusting(false);
  }

  function close() {
    if (panel.hidden) return false;
    setOpen(false);
    return true;
  }

  toggle.addEventListener("click", () => {
    const open = panel.hidden;
    setOpen(open);
    onToggle?.(open);
  });

  level.addEventListener("input", () => setLevel(level.valueAsNumber));
  level.addEventListener("focus", () => select("music"));
  mute.addEventListener("focus", () => select("music"));
  mute.addEventListener("click", () => setLevel(level.valueAsNumber > 0 ? 0 : lastAudible));
  effectsEnabled.addEventListener("focus", () => select("effects"));
  effectsEnabled.addEventListener("change", () => {
    select("effects");
    applyEffectsSetting();
    onSelect?.();
  });
  selectButton.addEventListener("click", confirm);

  document.addEventListener("click", (event) => {
    if (!toggle.contains(event.target) && !panel.contains(event.target)) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !close()) return;
    event.preventDefault();
    if (toggle.getClientRects().length && getComputedStyle(toggle).visibility === "visible") {
      toggle.focus({ preventScroll: true });
    }
  });

  setLevel(level.valueAsNumber);
  applyEffectsSetting();
  return {
    close,
    isOpen: () => !panel.hidden,
    isAdjusting: () => adjusting,
    focusOption,
    confirm,
    adjust(delta) {
      const current = level.valueAsNumber;
      const next = Math.max(0, Math.min(100, current + delta));
      if (next !== current) setLevel(next);
    },
  };
}
