const audioExtensions = /\.(aac|aif|aiff|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm|wma)$/i;
const lyricExtensions = /\.(lrc|vtt|srt)$/i;

function parseLrc(source) {
  const offset = Number(source.match(/\[offset\s*:\s*([+-]?\d+)\]/i)?.[1] ?? 0) / 1000;
  const cues = new Map();

  for (const line of source.split(/\r?\n/)) {
    const timestamps = [...line.matchAll(/\[(\d+):([0-5]?\d(?:[.,]\d+)?)\]/g)];
    if (!timestamps.length) continue;

    const last = timestamps.at(-1);
    const text = line.slice(last.index + last[0].length).trim();
    for (const [, minutes, seconds] of timestamps) {
      const start = Math.max(0, Number(minutes) * 60 + Number(seconds.replace(",", ".")) + offset);
      const existing = cues.get(start);
      cues.set(start, existing && text ? `${existing}\n${text}` : text || existing || "");
    }
  }

  return [...cues].map(([start, text]) => ({ start, end: Infinity, text }));
}

function subtitleTime(value) {
  const parts = value.replace(",", ".").split(":").map(Number);
  return parts.reduce((time, part) => time * 60 + part, 0);
}

function parseSubtitles(source) {
  const cues = [];
  const timing = /^\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})(?:\s|$)/;

  for (const block of source.split(/\r?\n\s*\r?\n/)) {
    const lines = block.split(/\r?\n/);
    const index = lines.findIndex((line) => timing.test(line));
    if (index < 0) continue;

    const [, from, to] = lines[index].match(timing);
    const start = subtitleTime(from);
    const end = subtitleTime(to);
    const text = lines.slice(index + 1).join("\n").replace(/<[^>]*>/g, "").trim();
    if (end > start && text) cues.push({ start, end, text });
  }

  return cues;
}

function lyricWindow(cues, time) {
  let firstLater = 0;
  let high = cues.length;

  while (firstLater < high) {
    const middle = Math.floor((firstLater + high) / 2);
    if (cues[middle].start <= time) firstLater = middle + 1;
    else high = middle;
  }

  const latest = cues[firstLater - 1];
  const active = latest && time < latest.end;
  return {
    lyric: active ? latest.text : "",
    previousLyric: cues[firstLater - (active ? 2 : 1)]?.text ?? "",
    nextLyric: cues[firstLater]?.text ?? "",
  };
}

export function createPlayer(audio, notify) {
  const slots = new Map();
  let id = null;
  let slot = null;
  let generation = 0;
  let error = "";

  function hasMetadata() {
    return Boolean(slot?.url && audio.readyState >= 1);
  }

  function getDuration() {
    return hasMetadata() && Number.isFinite(audio.duration) ? audio.duration : 0;
  }

  function emit() {
    const time = hasMetadata() ? audio.currentTime : slot?.time ?? 0;
    const cues = slot?.cues ?? [];
    notify({
      id,
      hasAudio: Boolean(slot?.url),
      playing: Boolean(slot?.url && !audio.paused && !audio.ended),
      time,
      duration: getDuration(),
      volume: audio.volume,
      hasLyrics: cues.length > 0,
      ...lyricWindow(cues, time),
      error,
      fileName: slot?.fileName ?? "",
    });
  }

  async function play() {
    if (!slot?.url) return false;

    const expected = generation;
    error = "";
    try {
      await audio.play();
      return expected === generation;
    } catch (failure) {
      if (expected !== generation || failure?.name === "AbortError") return false;

      error = failure?.name === "NotAllowedError"
        ? "Pulsa reproducir para iniciar el audio."
        : "El navegador no pudo reproducir este archivo.";
      emit();
      return false;
    }
  }

  function swapSource() {
    generation += 1;
    audio.pause();
    if (slot?.url) audio.src = slot.url;
    else audio.removeAttribute("src");
    audio.load();
  }

  function select(nextId, { autoplay } = {}) {
    if (nextId === id) {
      if (autoplay && slot?.url && audio.paused) void play();
      return;
    }

    const keepPlaying = autoplay ?? Boolean(slot?.url && !audio.paused && !audio.ended);
    if (hasMetadata()) slot.time = audio.currentTime;

    id = nextId;
    if (!slots.has(id)) slots.set(id, { time: 0, cues: [], lyricRequest: 0 });
    slot = slots.get(id);
    error = "";
    swapSource();
    if (keepPlaying && slot.url) void play();
    emit();
  }

  function loadAudio(file) {
    if (!file || !slot) return false;
    if (!file.size || (!file.type?.startsWith("audio/") && !audioExtensions.test(file.name))) {
      error = "Selecciona un archivo de audio válido.";
      emit();
      return false;
    }

    let url;
    try {
      url = URL.createObjectURL(file);
    } catch {
      error = "No se pudo abrir el archivo de audio.";
      emit();
      return false;
    }

    const previousUrl = slot.url;
    slot.url = url;
    slot.fileName = file.name;
    slot.time = 0;
    error = "";
    swapSource();
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    void play();
    emit();
    return true;
  }

  async function loadLyrics(file) {
    if (!file || !slot) return false;
    const target = slot;
    const request = ++target.lyricRequest;

    try {
      if (!file.size || !lyricExtensions.test(file.name)) {
        throw new Error("Selecciona un archivo de letras LRC, VTT o SRT.");
      }
      const source = (await file.text()).replace(/^\uFEFF/, "");
      const cues = (/\.lrc$/i.test(file.name) ? parseLrc(source) : parseSubtitles(source))
        .sort((left, right) => left.start - right.start);
      if (!cues.length) throw new Error("El archivo de letras no contiene marcas de tiempo válidas.");
      if (request !== target.lyricRequest) return false;

      target.cues = cues;
      if (slot === target) {
        error = "";
        emit();
      }
      return true;
    } catch (failure) {
      if (slot === target && request === target.lyricRequest) {
        error = failure?.message || "No se pudo leer el archivo de letras.";
        emit();
      }
      return false;
    }
  }

  function toggle() {
    if (!slot?.url) return false;
    if (audio.paused || audio.ended) {
      void play();
    } else {
      audio.pause();
    }
    emit();
    return true;
  }

  function seek(seconds) {
    if (!slot?.url || !Number.isFinite(seconds)) return;

    const duration = getDuration();
    slot.time = Math.max(0, duration ? Math.min(duration, seconds) : seconds);
    if (hasMetadata()) audio.currentTime = slot.time;
    emit();
  }

  function setVolume(volume) {
    if (!Number.isFinite(volume)) return;
    audio.volume = Math.min(1, Math.max(0, volume));
    emit();
  }

  for (const event of ["timeupdate", "durationchange", "play", "pause", "ended", "seeked", "volumechange"]) {
    audio.addEventListener(event, emit);
  }

  audio.addEventListener("loadedmetadata", () => {
    if (hasMetadata() && slot.time > 0) {
      audio.currentTime = Math.min(slot.time, getDuration() || slot.time);
    }
    emit();
  });

  audio.addEventListener("error", () => {
    if (!slot?.url || !audio.error) return;
    error = "No se pudo cargar el audio. Prueba con otro archivo.";
    emit();
  });

  return { select, loadAudio, loadLyrics, toggle, seek, setVolume };
}
