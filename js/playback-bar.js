import { bindSwipe } from "./controls.js";

function timeLabel(value) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
}

function trackRow(entry, index) {
  const row = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.index = index;
  const info = document.createElement("span");
  const title = document.createElement("strong");
  title.textContent = entry.title;
  info.append(title);
  const credits = [entry.artist, entry.album].filter(Boolean).join(" · ");
  if (credits) {
    const attribution = document.createElement("span");
    attribution.textContent = credits;
    if (entry.album) attribution.title = credits;
    info.append(attribution);
  }
  const time = document.createElement("span");
  time.className = "song-time";
  time.textContent = timeLabel(entry.trackId === undefined ? entry.durationMs / 1000 : entry.start);
  button.append(info, time);
  row.append(button);
  return row;
}

function trackStop(entry, index) {
  const stop = document.createElement("button");
  stop.type = "button";
  stop.className = "playlist-stop";
  stop.dataset.index = index;
  stop.tabIndex = -1;
  stop.setAttribute("aria-label", `Seleccionar ${entry.title}`);
  return stop;
}

const maxVisibleRows = 5;
const wheelDelay = 150;

export function createPlaybackBar({ onChoose, onStep, onSeek, onToggle }) {
  const $ = (id) => document.getElementById(id);
  const list = $("playlist-entries");
  const stops = $("playlist-stops");
  const panel = $("playlist-panel");
  const playlistWindow = $("playlist-window");
  const playlistStick = playlistWindow.querySelector(".playlist-stick");
  const selectButton = $("playlist-select");
  const toggle = $("playlist-toggle");
  const slider = $("song-progress");
  const elapsed = $("song-elapsed");
  let current;
  let queue = [];
  let playlistStation;
  let active = -1;
  let selected = -1;
  let firstVisible = 0;
  let renderedFirst = -1;
  let lastWheelTime = -Infinity;
  let lastWheelDirection = 0;
  let scrubKey = "";

  function renderWindow({ rebuild = false, focus = false } = {}) {
    const hadRowFocus = list.contains(document.activeElement);
    const visibleRows = Math.min(queue.length, maxVisibleRows);
    if (rebuild || renderedFirst !== firstVisible) {
      const tracks = queue.slice(firstVisible, firstVisible + visibleRows);
      list.replaceChildren(...tracks.map((track, row) => trackRow(track, firstVisible + row)));
      stops.replaceChildren(...tracks.map((track, row) => trackStop(track, firstVisible + row)));
      renderedFirst = firstVisible;
    }

    for (const [row, entry] of [...list.children].entries()) {
      const button = entry.firstElementChild;
      const index = firstVisible + row;
      const isSelected = index === selected;
      button.toggleAttribute("data-selected", isSelected);
      button.tabIndex = isSelected ? 0 : -1;
      stops.children[row].setAttribute("aria-pressed", String(isSelected));
      if (index === active) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    }

    playlistWindow.toggleAttribute("data-empty", !visibleRows);
    playlistWindow.style.setProperty("--playlist-last-row", String(Math.max(0, visibleRows - 1)));
    playlistWindow.style.setProperty("--playlist-selected-row", String(Math.max(0, selected - firstVisible)));
    selectButton.disabled = selected < 0;
    if (selected >= 0) selectButton.setAttribute("aria-label", `Reproducir ${queue[selected].title}`);
    if (focus || hadRowFocus) {
      const target = list.children[selected - firstVisible]?.firstElementChild ?? toggle;
      if (target !== document.activeElement) target.focus({ preventScroll: true });
    }
  }

  function resetSelection(rebuild = false) {
    selected = queue.length ? Math.min(queue.length - 1, Math.max(0, active)) : -1;
    firstVisible = Math.min(Math.max(0, selected - Math.floor(maxVisibleRows / 2)), Math.max(0, queue.length - maxVisibleRows));
    renderWindow({ rebuild });
  }

  function isOpen() {
    return !panel.hidden;
  }

  function selectSong(index, { focus = false } = {}) {
    if (!isOpen() || selected < 0) return false;

    const next = Math.min(queue.length - 1, Math.max(0, index));
    if (next === selected) {
      if (focus) renderWindow({ focus: true });
      return false;
    }

    selected = next;
    if (selected < firstVisible) firstVisible = selected;
    if (selected >= firstVisible + maxVisibleRows) firstVisible = selected - maxVisibleRows + 1;
    renderWindow({ focus });
    return true;
  }

  function moveSelection(direction, options) {
    const step = Math.sign(direction);
    return step ? selectSong(selected + step, options) : false;
  }

  function playSelection() {
    if (!isOpen() || selected < 0) return false;
    onChoose(selected);
    return true;
  }

  function showProgress(value) {
    elapsed.textContent = timeLabel(value);
    slider.setAttribute("aria-valuetext", elapsed.textContent + " de " + timeLabel(current.state.duration));
    slider.style.setProperty("--range-position", value / Number(slider.max) * 100 + "%");
  }

  function update({ station, state, off }) {
    const positionKey = station.id + ":" + state.index + ":" + state.start;
    current = { state, positionKey };
    if (playlistStation !== station.id || queue !== state.queue) {
      playlistStation = station.id;
      queue = state.queue;
      active = state.active;
      $("playlist-name").textContent = station.name;
      $("playlist-count").textContent = queue.length + (queue.length === 1 ? " pista" : " pistas");
      resetSelection(true);
    } else if (active !== state.active) {
      active = state.active;
      renderWindow();
    }
    toggle.disabled = !queue.length;
    $("song-previous").disabled = queue.length < 2;
    $("song-next").disabled = queue.length < 2;
    slider.disabled = off || !state.playing || !state.duration;
    if (scrubKey !== positionKey || slider.disabled) {
      scrubKey = "";
      slider.max = state.duration || 1;
      slider.value = state.elapsed;
      showProgress(state.elapsed);
    }
    $("song-duration").textContent = timeLabel(state.duration);
  }

  function setPlaylistOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  }

  function close() {
    if (panel.hidden) return false;
    setPlaylistOpen(false);
    return true;
  }

  toggle.addEventListener("click", () => {
    const closed = close();
    if (!closed) {
      setPlaylistOpen(true);
      lastWheelTime = -Infinity;
      resetSelection();
    }
    onToggle?.(!closed);
  });
  $("song-previous").addEventListener("click", () => onStep(-1));
  $("song-next").addEventListener("click", () => onStep(1));
  selectButton.addEventListener("click", playSelection);
  stops.addEventListener("click", (event) => {
    const stop = event.target.closest(".playlist-stop");
    if (stop) selectSong(Number(stop.dataset.index), { focus: true });
  });
  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-index]");
    if (!button || !isOpen()) return;
    selectSong(Number(button.dataset.index));
    playSelection();
  });
  panel.addEventListener("wheel", (event) => {
    if (!isOpen() || !event.deltaY || event.ctrlKey) return;
    event.preventDefault();
    const direction = Math.sign(event.deltaY);
    const now = performance.now();
    if (direction === lastWheelDirection && now - lastWheelTime < wheelDelay) return;
    lastWheelDirection = direction;
    lastWheelTime = now;
    moveSelection(direction);
  }, { passive: false });
  bindSwipe(playlistStick, (x, y) => {
    if (Math.abs(y) >= Math.abs(x)) moveSelection(Math.sign(y));
  }, (distance) => {
    if (distance === null || !isOpen()) {
      playlistWindow.style.removeProperty("--playlist-drag-offset");
      playlistWindow.classList.remove("dragging");
      return;
    }
    playlistWindow.style.setProperty("--playlist-drag-offset", `${distance}px`);
    playlistWindow.classList.add("dragging");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented || !isOpen()) return;
    event.preventDefault();
    close();
    toggle.focus({ preventScroll: true });
  });
  slider.addEventListener("input", () => {
    scrubKey = current.positionKey;
    showProgress(slider.valueAsNumber);
  });
  slider.addEventListener("change", () => {
    if (scrubKey === current.positionKey) onSeek(slider.valueAsNumber);
    scrubKey = "";
  });

  return { update, close, isOpen, moveSelection, playSelection };
}
