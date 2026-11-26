export function createVolumeControl({ audio, onToggle }) {
  const toggle = document.getElementById("volume-toggle");
  const panel = document.getElementById("volume-panel");
  const level = document.getElementById("volume-level");
  const percent = document.getElementById("volume-percent");
  const mute = document.getElementById("volume-mute");
  const icon = document.getElementById("volume-icon");
  let lastAudible = 100;

  function setLevel(value) {
    level.valueAsNumber = value;
    if (value > 0) lastAudible = value;

    const label = `${value}%`;
    const muted = value === 0;
    const iconName = muted ? "muted" : value < 50 ? "min" : "max";
    percent.value = label;
    level.setAttribute("aria-valuetext", label);
    level.style.setProperty("--range-position", label);
    mute.setAttribute("aria-label", muted ? "Restaurar volumen" : "Silenciar");
    const iconSource = `assets/volume-${iconName}.png`;
    if (icon.getAttribute("src") !== iconSource) icon.src = iconSource;

    for (const element of audio) element.volume = value / 100;
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
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
    adjust(delta) {
      const current = level.valueAsNumber;
      const next = Math.max(0, Math.min(100, current + delta));
      if (next !== current) setLevel(next);
    },
  };
}
