import { mediaUrl } from "./media-url.js";

const mediaDirectory = mediaUrl("media/radio-local/");

async function loadLibrary() {
  try {
    const response = await fetch(new URL("manifest.json", mediaDirectory));
    if (response.ok) return await response.json() ?? {};
  } catch {
    // The local media directory may be missing on a fresh checkout.
  }
  return {};
}

function shuffleDeck(length, active = -1) {
  const shuffled = Array.from({ length }, (_, index) => index).filter((index) => index !== active);
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

export function createRadioPlayer({ audio, tune, onChange, onUpdate = () => {} }) {
  const positions = new Map();
  const queues = new Map();
  const shuffleStates = new Map();
  let library;
  let requestedStation;
  let loadedStation;
  let trackIndex = 0;
  let playRequest = 0;
  let playbackMessage;
  let displayed;
  let shuffleEnabled = false;
  let chapterEnd;

  tune.src = new URL("tune.wav", mediaDirectory);

  loadLibrary().then((manifest) => {
    library = manifest;
    if (requestedStation) playStation(requestedStation);
    onUpdate();
  });

  function updateCaption() {
    if (!requestedStation) return;
    const track = library?.[requestedStation]?.[trackIndex];
    const chapter = track?.chapters?.findLast(({ start }) => start <= audio.currentTime);
    const credits = chapter ?? track;
    const title = playbackMessage ?? credits?.title ?? "En emisión";
    const artist = playbackMessage ? "" : credits?.artist ?? "";
    const writers = playbackMessage ? "" : credits?.writers ?? "";

    if (
      displayed?.station === requestedStation && displayed.title === title &&
      displayed.artist === artist && displayed.writers === writers
    ) return;
    displayed = { station: requestedStation, title, artist, writers };
    onChange({ title, artist, writers });
  }

  function showTrack(message) {
    playbackMessage = message;
    updateCaption();
    onUpdate();
  }

  function play() {
    const request = ++playRequest;
    prepareShuffle();
    showTrack();
    audio.play().catch((error) => {
      if (request !== playRequest || error.name === "AbortError") return;
      showTrack(error.name === "NotAllowedError" ? "Pulsa la portada para escuchar" : "Audio no disponible");
    });
  }

  function loadTrack(playlist, index, time = 0) {
    trackIndex = index;
    audio.src = new URL(playlist[index].src, mediaDirectory);
    audio.currentTime = time;
    play();
  }

  function activateStation(id) {
    requestedStation = id;
    if (!library) {
      showTrack("Cargando audio…");
      return null;
    }

    const playlist = library[id];
    if (!playlist?.length) {
      audio.pause();
      ++playRequest;
      showTrack("Audio no disponible");
      return null;
    }
    return playlist;
  }

  function changeStation(id) {
    if (loadedStation) positions.set(loadedStation, { index: trackIndex, time: audio.currentTime });
    loadedStation = id;
  }

  function playStation(id) {
    const playlist = activateStation(id);
    if (!playlist) return;

    if (loadedStation === id) {
      if (audio.error) loadTrack(playlist, trackIndex);
      else play();
      return;
    }

    changeStation(id);
    const position = positions.get(id);
    if (shuffleEnabled && !position) {
      const queue = queueFor(id);
      if (queue.length) {
        const entry = queue[shuffleSelection(id, 1, queue.length, -1)];
        loadTrack(playlist, entry.index, entry.start);
        return;
      }
    }
    loadTrack(playlist, position?.index ?? 0, position?.time);
  }

  function pause() {
    requestedStation = undefined;
    displayed = undefined;
    ++playRequest;
    audio.pause();
    tune.pause();
    onUpdate();
  }

  function playTune() {
    if (tune.muted) return;
    tune.currentTime = 0;
    tune.play().catch(() => {});
  }

  function queueFor(id) {
    const playlist = library?.[id];
    if (!playlist) return [];
    if (queues.has(id)) return queues.get(id);

    const hasMusic = playlist.some((item) => item.src.includes("/Musica/"));
    const queue = playlist.flatMap((item, index) => {
      if (item.chapters?.length) {
        return item.chapters
          .filter((chapter) => chapter.trackId !== 6666)
          .map((chapter) => ({ ...chapter, index }));
      }
      if (hasMusic && !item.src.includes("/Musica/") && !item.artist) return [];
      return [{ ...item, index, start: 0 }];
    });
    queues.set(id, queue);
    return queue;
  }

  function getPlayback(id) {
    const loaded = loadedStation === id;
    const playing = requestedStation === id && loaded && !audio.paused && !audio.ended;
    const position = loaded ? { index: trackIndex, time: audio.currentTime } : positions.get(id);
    const { index, time } = position ?? { index: 0, time: 0 };
    const item = library?.[id]?.[index];
    const chapter = item?.chapters?.findLast((part) => part.start <= time);
    const start = chapter?.start ?? 0;
    const end = item?.chapters?.find((part) => part.start > time)?.start ??
      (loaded && Number.isFinite(audio.duration) ? audio.duration : (item?.durationMs ?? 0) / 1000);
    const queue = queueFor(id);
    const active = queue.findIndex((entry) => entry.index === index && entry.start === start);
    return {
      queue, active, playing, index, time, start,
      elapsed: Math.max(0, time - start), duration: Math.max(0, end - start),
    };
  }

  function shuffleState(id, length, active) {
    if (!shuffleStates.has(id)) {
      const history = active < 0 ? [] : [active];
      shuffleStates.set(id, {
        remaining: shuffleDeck(length, active),
        history,
        cursor: history.length - 1,
      });
    }
    return shuffleStates.get(id);
  }

  function shuffleSelection(id, direction, length, active) {
    const state = shuffleState(id, length, active);
    if (direction < 0 && state.cursor >= 0) {
      state.cursor = Math.max(0, state.cursor - 1);
      return state.history[state.cursor];
    }
    if (state.cursor < state.history.length - 1) return state.history[++state.cursor];

    const previous = state.history[state.cursor];
    if (!state.remaining.length) {
      state.remaining = shuffleDeck(length);
      const last = length - 1;
      if (last > 0 && state.remaining[last] === previous) {
        const other = Math.floor(Math.random() * last);
        [state.remaining[last], state.remaining[other]] = [state.remaining[other], state.remaining[last]];
      }
    }
    const next = state.remaining.pop();
    state.history.push(next);
    state.cursor++;
    return next;
  }

  function prepareShuffle() {
    chapterEnd = undefined;
    if (!shuffleEnabled || !loadedStation || requestedStation !== loadedStation) return;
    const { queue, active, time } = getPlayback(loadedStation);
    if (!queue.length) return;
    shuffleState(loadedStation, queue.length, active);
    chapterEnd = library[loadedStation][trackIndex]?.chapters?.find(({ start }) => start > time)?.start;
  }

  function setShuffle(enabled) {
    if (shuffleEnabled === enabled) return;
    shuffleEnabled = enabled;
    shuffleStates.clear();
    prepareShuffle();
  }

  function playEntry(id, entry) {
    const playlist = activateStation(id);
    if (!playlist) return;
    if (loadedStation === id && trackIndex === entry.index && !audio.error) {
      audio.currentTime = entry.start;
      play();
      return;
    }
    if (loadedStation !== id) changeStation(id);
    loadTrack(playlist, entry.index, entry.start);
  }

  function playQueueEntry(id, selection) {
    const { queue, active } = getPlayback(id);
    const entry = queue[selection];
    if (!entry) return;
    if (shuffleEnabled) {
      const state = shuffleState(id, queue.length, active);
      if (state.history[state.cursor] !== selection) {
        state.history.splice(state.cursor + 1, state.history.length, selection);
        state.cursor++;
        state.remaining = state.remaining.filter((index) => index !== selection);
      }
    }
    playEntry(id, entry);
  }

  function stepQueue(id, direction) {
    const { queue, active, index, time } = getPlayback(id);
    if (!queue.length) return;
    if (shuffleEnabled) {
      playEntry(id, queue[shuffleSelection(id, direction, queue.length, active)]);
      return;
    }
    let next = active + direction;
    if (active < 0) {
      next = direction > 0
        ? queue.findIndex((entry) => entry.index > index || (entry.index === index && entry.start > time))
        : queue.findLastIndex((entry) => entry.index < index || (entry.index === index && entry.start < time));
      if (next < 0 && direction > 0) next = 0;
    }
    playEntry(id, queue[(next + queue.length) % queue.length]);
  }

  function seek(id, seconds) {
    if (requestedStation !== id || loadedStation !== id || !Number.isFinite(seconds)) return;
    const { start, duration } = getPlayback(id);
    const time = start + Math.max(0, Math.min(seconds, duration));
    if (chapterEnd !== undefined && time >= chapterEnd) {
      stepQueue(id, 1);
      return;
    }
    audio.currentTime = time;
    updateCaption();
    onUpdate();
  }

  audio.addEventListener("ended", () => {
    if (!requestedStation || loadedStation !== requestedStation || !audio.ended) return;
    if (shuffleEnabled && queueFor(loadedStation).length) {
      stepQueue(loadedStation, 1);
      return;
    }
    const playlist = library[loadedStation];
    loadTrack(playlist, (trackIndex + 1) % playlist.length);
  });

  audio.addEventListener("error", () => {
    if (audio.error && requestedStation && loadedStation === requestedStation) showTrack("Audio no disponible");
  });

  for (const event of ["timeupdate", "seeked", "loadedmetadata"]) {
    audio.addEventListener(event, () => {
      if (chapterEnd !== undefined && requestedStation && loadedStation === requestedStation &&
          !audio.paused && !audio.seeking && audio.currentTime >= chapterEnd) {
        stepQueue(loadedStation, 1);
        return;
      }
      updateCaption();
      onUpdate();
    });
  }

  return { playStation, pause, playTune, getPlayback, playQueueEntry, stepQueue, seek, setShuffle };
}
