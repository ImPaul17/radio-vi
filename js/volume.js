export function createVolumeControl({ music, onToggle, onSelect }) {
  const toggle = document.getElementById("volume-toggle");
  const panel = document.getElementById("volume-panel");
  const level = document.getElementById("volume-level");
  const percent = document.getElementById("volume-percent");
  const mute = document.getElementById("volume-mute");
  const icon = document.getElementById("volume-icon");
  const selectButton = document.getElementById("volume-select");
  let lastAudible = 100;
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

  function setAdjusting(value) {
    adjusting = value;
    panel.toggleAttribute("data-adjusting", value);
    selectButton.setAttribute("aria-label", value ? "Terminar el ajuste del volumen" : "Ajustar volumen de la música");
  }

  function confirm() {
    selectButton.focus({ preventScroll: true });
    setAdjusting(!adjusting);
    onSelect?.();
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) selectButton.focus({ preventScroll: true });
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
  mute.addEventListener("click", () => setLevel(level.valueAsNumber > 0 ? 0 : lastAudible));
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
  return {
    close,
    isOpen: () => !panel.hidden,
    isAdjusting: () => adjusting,
    confirm,
    adjust(delta) {
      const current = level.valueAsNumber;
      const next = Math.max(0, Math.min(100, current + delta));
      if (next !== current) setLevel(next);
    },
  };
}
