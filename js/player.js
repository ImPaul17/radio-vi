import { extraRadioShelf } from "./covers.js";
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

function shuffleTracks(tracks) {
  const shuffled = [...tracks];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

export function createRadioPlayer({ audio, tune, onChange, onUpdate = () => {} }) {
  const positions = new Map();
  const queues = new Map();
  let library;
  let requestedStation;
  let loadedStation;
  let trackIndex = 0;
  let playRequest = 0;
  let playbackMessage;
  let displayed;

  tune.src = new URL("tune.wav", mediaDirectory);

  loadLibrary().then((manifest) => {
    library = manifest;
    for (const { id } of extraRadioShelf) {
      if (Array.isArray(library[id])) library[id] = shuffleTracks(library[id]);
    }
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

  function playQueueEntry(id, selection) {
    const entry = queueFor(id)[selection];
    if (!entry) return;
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

  function stepQueue(id, direction) {
    const { queue, active, index, time } = getPlayback(id);
    if (!queue.length) return;
    let next = active + direction;
    if (active < 0) {
      next = direction > 0
        ? queue.findIndex((entry) => entry.index > index || (entry.index === index && entry.start > time))
        : queue.findLastIndex((entry) => entry.index < index || (entry.index === index && entry.start < time));
      if (next < 0 && direction > 0) next = 0;
    }
    playQueueEntry(id, (next + queue.length) % queue.length);
  }

  function seek(id, seconds) {
    if (requestedStation !== id || loadedStation !== id || !Number.isFinite(seconds)) return;
    const { start, duration } = getPlayback(id);
    audio.currentTime = start + Math.max(0, Math.min(seconds, duration));
    updateCaption();
    onUpdate();
  }

  audio.addEventListener("ended", () => {
    if (!requestedStation || loadedStation !== requestedStation || !audio.ended) return;
    const playlist = library[loadedStation];
    loadTrack(playlist, (trackIndex + 1) % playlist.length);
  });

  audio.addEventListener("error", () => {
    if (audio.error && requestedStation && loadedStation === requestedStation) showTrack("Audio no disponible");
  });

  for (const event of ["timeupdate", "seeked", "loadedmetadata"]) {
    audio.addEventListener(event, () => {
      updateCaption();
      onUpdate();
    });
  }

  return { playStation, pause, playTune, getPlayback, playQueueEntry, stepQueue, seek };
}
