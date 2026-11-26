const buttonsCount = 17;
const axesCount = 4;
const heartbeatInterval = 1200;
const phoneSessionKey = "radio-vi-controller";
const roomPattern = /^[\w-]{16}$/;
const tokenPattern = /^[\w-]{32}$/;

function neutralFrame() {
  return { buttons: Array(buttonsCount).fill(false), axes: Array(axesCount).fill(0) };
}

function axisBand(value) {
  const magnitude = Math.abs(value);
  return Math.sign(value) * (magnitude > 0.65 ? 2 : magnitude > 0.35 ? 1 : 0);
}

function relayBase(value) {
  if (!value) throw new Error("Falta la dirección del servidor del mando.");
  const base = new URL(value, location.href);
  if ((base.protocol !== "https:" && base.protocol !== "http:") || base.username || base.password ||
      base.search || base.hash || (location.protocol === "https:" && base.protocol !== "https:")) {
    throw new Error("La dirección del servidor del mando no es válida.");
  }
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  return base;
}

async function send(base, path, body, { signal, timeout = 12000, keepalive = false } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeout);
  try {
    const response = await fetch(new URL(`controller/${path}`, base), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", keepalive,
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error(`El servidor del mando respondió con ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

function invalidSession(error) {
  return [400, 403, 404, 409, 410].includes(error.status);
}

function notifyChanges(onStatus) {
  let previous;
  return (status) => {
    if (status === previous) return;
    previous = status;
    onStatus?.(status);
  };
}

export function createHostController({ relay, page, onStatus, onFrame }) {
  const notify = notifyChanges(onStatus);
  let current;

  function finish(session, status) {
    if (current !== session) return;
    current = undefined;
    session.abort.abort();
    onFrame?.(neutralFrame());
    notify(status);
  }

  async function poll(session) {
    const { base, auth, abort: { signal } } = session;
    let revision = 0;
    let previouslyConnected = false;
    let recovering = false;
    while (!signal.aborted) {
      try {
        const response = await send(base, "poll", { ...auth, since: revision }, { signal });
        if (signal.aborted) return;
        if (!Number.isSafeInteger(response.revision) || !Array.isArray(response.frames)) {
          throw new Error("El servidor del mando devolvió un estado no válido.");
        }
        revision = response.revision;
        if (response.connected) {
          notify("connected");
          previouslyConnected = true;
          // After a network interruption, ignore presses already followed by a release.
          const frames = recovering ? response.frames.slice(-1) : response.frames;
          for (const frame of frames) onFrame?.(frame);
        } else {
          notify(previouslyConnected ? "disconnected" : "waiting");
          if (response.frames.length) onFrame?.(neutralFrame());
        }
        recovering = false;
      } catch (error) {
        if (signal.aborted) return;
        if (invalidSession(error) && error.status !== 409) {
          finish(session, "error");
          return;
        }
        if (!recovering) onFrame?.(neutralFrame());
        recovering = true;
        notify("disconnected");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  async function open(session) {
    try {
      const base = relayBase(relay);
      const { room, hostToken, joinToken } = await send(base, "session", {}, { signal: session.abort.signal });
      if (!roomPattern.test(room ?? "") || !tokenPattern.test(hostToken ?? "") || !tokenPattern.test(joinToken ?? "")) {
        throw new Error("El servidor devolvió un emparejamiento no válido.");
      }
      session.base = base;
      session.auth = { room, hostToken };
      if (session.abort.signal.aborted) {
        void send(base, "close", session.auth, { keepalive: true, timeout: 3000 }).catch(() => {});
        throw new DOMException("Emparejamiento cancelado.", "AbortError");
      }
      const link = page ? new URL(page, location.href) : new URL("../controller.html", import.meta.url);
      link.hash = new URLSearchParams({ relay: base.href, room, token: joinToken });
      notify("waiting");
      void poll(session);
      return link;
    } catch (error) {
      finish(session, "error");
      throw error;
    }
  }

  function close() {
    const session = current;
    if (!session) return Promise.resolve();
    finish(session, "closed");
    if (!session.auth) return Promise.resolve();
    return send(session.base, "close", session.auth, { keepalive: true, timeout: 3000 }).catch(() => {});
  }

  window.addEventListener("pagehide", close);
  return {
    start() {
      if (current) return current.ready;
      const session = { abort: new AbortController() };
      current = session;
      notify("connecting");
      session.ready = open(session);
      return session.ready;
    },
    close,
  };
}

function readPhoneSession(base, room) {
  try {
    const session = JSON.parse(sessionStorage.getItem(phoneSessionKey));
    if (session?.room === room && session.relay === base.href && tokenPattern.test(session.phoneToken ?? "")) {
      return session.phoneToken;
    }
  } catch {
    // Pairing still works if storage is disabled.
  }
  return undefined;
}

function savePhoneSession(base, room, phoneToken, params) {
  try {
    sessionStorage.setItem(phoneSessionKey, JSON.stringify({ relay: base.href, room, phoneToken }));
    params.delete("token");
    const url = new URL(location.href);
    url.hash = params;
    history.replaceState(history.state, "", url);
  } catch {
    // The controller remains paired for this page when storage is unavailable.
  }
}

export function createMobileController({ onStatus } = {}) {
  const notify = notifyChanges(onStatus);
  const abort = new AbortController();
  const held = neutralFrame();
  const queued = [];
  let base;
  let auth;
  let heartbeat;
  let ready = false;
  let sending = false;
  let suspended = false;

  function clearInput() {
    held.buttons.fill(false);
    held.axes.fill(0);
    queued.length = 0;
  }

  function stop(status) {
    ready = false;
    clearInput();
    abort.abort();
    clearInterval(heartbeat);
    window.removeEventListener("pagehide", suspend);
    window.removeEventListener("pageshow", resume);
    notify(status);
  }

  async function flush() {
    if (!auth || sending || abort.signal.aborted) return;
    sending = true;
    try {
      while (queued.length && !abort.signal.aborted) {
        const { frame } = queued.shift();
        await send(base, "state", { ...auth, ...frame }, { signal: abort.signal, timeout: 2400 });
        if (!abort.signal.aborted && !suspended) {
          ready = true;
          notify("connected");
        }
      }
    } catch (error) {
      if (!abort.signal.aborted) {
        if (invalidSession(error)) stop("invalid");
        else {
          ready = false;
          clearInput();
          notify("disconnected");
        }
      }
    } finally {
      sending = false;
    }
  }

  function enqueue(analog = false) {
    const frame = { buttons: [...held.buttons], axes: [...held.axes] };
    const tail = queued.at(-1);
    // Preserve threshold crossings so a quick flick still reaches the host.
    const sameBands = analog && tail?.analog && frame.axes.every((axis, index) => axisBand(axis) === axisBand(tail.frame.axes[index]));
    if (sameBands) queued[queued.length - 1] = { frame, analog };
    else if (queued.length < 48) queued.push({ frame, analog });
    else {
      // Drop stale input if the network falls far behind.
      clearInput();
      queued.push({ frame: neutralFrame(), analog: false });
    }
    void flush();
  }

  function releaseAll() {
    const hadInput = held.buttons.some(Boolean) || held.axes.some(Boolean) || queued.length > 0;
    clearInput();
    if (auth && hadInput && !abort.signal.aborted) enqueue();
  }

  function suspend() {
    suspended = true;
    ready = false;
    clearInput();
    if (auth) void send(base, "disconnect", auth, { keepalive: true, timeout: 2000 }).catch(() => {});
  }

  function keepConnected() {
    if (auth && !sending && !suspended && !abort.signal.aborted) enqueue();
  }

  function resume() {
    suspended = false;
    keepConnected();
  }

  async function connect() {
    notify("connecting");
    const params = new URLSearchParams(location.hash.slice(1));
    const room = params.get("room");
    const token = params.get("token");
    try {
      base = relayBase(params.get("relay"));
      if (!roomPattern.test(room ?? "")) throw new Error("Código de sala no válido.");
      let phoneToken = readPhoneSession(base, room);
      if (!phoneToken) {
        if (!tokenPattern.test(token ?? "")) throw new Error("Código de emparejamiento no válido.");
        ({ phoneToken } = await send(base, "join", { room, joinToken: token }, { signal: abort.signal }));
        if (!tokenPattern.test(phoneToken ?? "")) throw new Error("Credencial de mando no válida.");
      }
      if (abort.signal.aborted) return;
      auth = { room, phoneToken };
      savePhoneSession(base, room, phoneToken, params);
      heartbeat = setInterval(keepConnected, heartbeatInterval);
      window.addEventListener("pagehide", suspend);
      window.addEventListener("pageshow", resume);
      enqueue();
    } catch {
      if (!abort.signal.aborted) stop("invalid");
    }
  }

  function storeAxis(index, value) {
    if (!Number.isInteger(index) || index < 0 || index >= axesCount || !Number.isFinite(value)) return false;
    const next = Math.round(Math.min(1, Math.max(-1, value)) * 100) / 100;
    if (next === held.axes[index]) return false;
    held.axes[index] = next;
    return true;
  }

  void connect();
  return {
    setButton(index, pressed) {
      if (!ready || !Number.isInteger(index) || index < 0 || index >= buttonsCount || held.buttons[index] === Boolean(pressed)) return;
      held.buttons[index] = Boolean(pressed);
      enqueue();
    },
    setAxis(index, value) {
      if (ready && storeAxis(index, value)) enqueue(true);
    },
    setStick(index, x, y) {
      if (!ready || (index !== 0 && index !== 1)) return;
      const horizontal = storeAxis(index * 2, x);
      const vertical = storeAxis(index * 2 + 1, y);
      if (horizontal || vertical) enqueue(true);
    },
    releaseAll,
    close() {
      if (abort.signal.aborted) return;
      suspend();
      stop("closed");
    },
  };
}
