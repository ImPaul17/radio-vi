const keyBindings = new Map([
  ["arrowleft", "left"],
  ["arrowright", "right"],
  ["arrowup", "up"],
  ["arrowdown", "down"],
  ["[", "previous"],
  ["]", "next"],
  [" ", "cross"],
  ["enter", "confirm"],
]);

const buttonBindings = new Map([
  [0, "cross"],
  [1, "exitMenu"],
  [2, "toggleVolume"],
  [3, "togglePlaylist"],
  [4, "previous"],
  [5, "next"],
  [6, "previousTrack"],
  [7, "nextTrack"],
  [8, "toggleSettings"],
  [9, "toggleSettings"],
  [12, "up"],
  [13, "down"],
  [14, "left"],
  [15, "right"],
]);

const stickBindings = [
  [0, 1, "leftStickUpRight"],
  [0, -1, "leftStickDownLeft"],
  [1, -1, "modeUp"],
  [1, 1, "modeDown"],
];

const repeatableActions = new Set([
  "left", "right", "up", "down", "previous", "next",
  "leftStickUpRight", "leftStickDownLeft", "modeUp", "modeDown", "previousTrack", "nextTrack",
]);
const initialRepeatDelay = 350;
const navigationRepeatInterval = 145;
const trackRepeatInterval = 220;
const nativeKeyboardControls = "input:not([type='range'], [data-setting]), select, textarea, audio, video, [role='textbox'], [role='slider'], [role='combobox']";

function repeatInterval(action, context, heldFor) {
  if (context === "volume-adjust" && (action === "leftStickUpRight" || action === "leftStickDownLeft")) {
    if (heldFor >= 1400) return 46;
    if (heldFor >= 700) return 82;
  }
  if (action === "previousTrack" || action === "nextTrack") return trackRepeatInterval;
  return navigationRepeatInterval;
}

export function bindSwipe(element, onSwipe, showDrag) {
  let gesture;
  let swallowClick = false;

  element.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    swallowClick = false;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.target.setPointerCapture?.(event.pointerId);
  });
  element.addEventListener("pointermove", (event) => {
    if (gesture?.id !== event.pointerId) return;
    showDrag?.(event.clientY - gesture.y);
  });
  element.addEventListener("pointerup", (event) => {
    if (gesture?.id !== event.pointerId) return;
    const x = event.clientX - gesture.x;
    const y = event.clientY - gesture.y;
    gesture = undefined;
    showDrag?.(null);
    if (Math.max(Math.abs(x), Math.abs(y)) >= 24) {
      swallowClick = true;
      onSwipe(x, y);
    }
  });
  function cancel(event) {
    if (gesture?.id !== event.pointerId) return;
    gesture = undefined;
    showDrag?.(null);
  }
  element.addEventListener("pointercancel", cancel);
  element.addEventListener("lostpointercapture", cancel);
  element.addEventListener("click", (event) => {
    if (!swallowClick || !event.detail) return;
    swallowClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true });
}

export function wireControls({ onAction, getContext, isActive = () => true, onGamepadChange }) {
  const heldKeys = new Map();
  let connected = false;
  let previousGamepads = new Map();
  let frameId = null;
  let skipGamepadActions = false;

  function handleKeyDown(event) {
    if (!isActive() || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    const target = event.target;
    if (target?.isContentEditable || target?.closest?.(nativeKeyboardControls)) return;

    const action = keyBindings.get(event.key.toLowerCase());
    if (!action) return;

    const key = event.code || event.key;
    const context = getContext();
    const held = heldKeys.get(key);
    if (!event.repeat) heldKeys.set(key, { context, blocked: false });
    else if (!held || held.blocked || held.context !== context || !repeatableActions.has(action)) {
      if (held) held.blocked = true;
      event.preventDefault();
      return;
    }

    if (target?.closest?.("#song-progress")) return;
    if (action === "cross" && target?.closest?.("[data-playback-controls] button, #settings-dialog button, [data-setting]")) return;
    if (action === "confirm" && target?.closest?.("button, a[href]")) return;
    if (onAction(action, "keyboard")) event.preventDefault();
  }

  function handleKeyUp(event) {
    heldKeys.delete(event.code || event.key);
  }

  function pauseControls() {
    heldKeys.clear();
    skipGamepadActions = true;
  }

  function scheduleGamepadPoll() {
    if (frameId === null) {
      frameId = window.requestAnimationFrame(pollGamepads);
    }
  }

  function pollGamepads(time) {
    frameId = null;

    let gamepads = [];
    try {
      gamepads = window.navigator.getGamepads();
    } catch {
      // The browser can block gamepad access in embedded contexts.
    }

    const currentGamepads = new Map();
    const newActions = new Set();
    const canRunActions = !skipGamepadActions && !document.hidden && document.hasFocus() && isActive();
    const context = getContext();
    skipGamepadActions = false;

    function recordPress(button, action, previous, pressed) {
      const held = previous?.get(button);
      const press = held ?? {
        context,
        startedAt: time,
        repeatAt: repeatableActions.has(action) ? time + initialRepeatDelay : Infinity,
      };
      if (!canRunActions || press.context !== context) {
        press.repeatAt = Infinity;
      } else if (!held || time >= press.repeatAt) {
        newActions.add(action);
        if (held) press.repeatAt = time + repeatInterval(action, context, time - press.startedAt);
      }
      pressed.set(button, press);
    }

    for (const gamepad of gamepads) {
      if (!gamepad?.connected || gamepad.mapping !== "standard") {
        continue;
      }

      const pressed = new Map();
      const previousPad = previousGamepads.get(gamepad.index);
      const previous = previousPad?.pressed;
      for (const [buttonIndex, action] of buttonBindings) {
        if (gamepad.buttons[buttonIndex]?.pressed) {
          recordPress(buttonIndex, action, previous, pressed);
        }
      }

      const leftX = gamepad.axes?.[0] ?? 0;
      const leftY = gamepad.axes?.[1] ?? 0;
      const previousStickContext = previousPad?.leftStickContext;
      const stickHeld = Math.max(Math.abs(leftX), Math.abs(leftY)) > (previousStickContext === undefined ? 0.65 : 0.35);
      let leftStickContext;
      if (stickHeld) {
        const sameContext = previousStickContext === undefined || previousStickContext === context;
        leftStickContext = canRunActions && sameContext ? context : null;
      }
      currentGamepads.set(gamepad.index, { pressed, leftStickContext });

      const useHorizontalVolume = context === "volume-adjust" && Math.abs(leftX) > Math.abs(leftY);
      const useHorizontalStick = context === "radio" || useHorizontalVolume;
      const stickPositions = [useHorizontalStick ? leftX : -leftY, gamepad.axes?.[3] ?? 0];
      for (const [stick, sign, action] of stickBindings) {
        if (stick === 0 && leftStickContext !== context) continue;
        const magnitude = sign * stickPositions[stick];
        const held = previous?.has(action);
        if (magnitude > (held ? 0.35 : 0.65)) {
          recordPress(action, action, previous, pressed);
        }
      }
    }

    previousGamepads = currentGamepads;
    const hasGamepad = currentGamepads.size > 0;
    if (hasGamepad) {
      scheduleGamepadPoll();
    }
    if (connected !== hasGamepad) {
      connected = hasGamepad;
      onGamepadChange?.(connected);
    }
    for (const action of newActions) {
      if (getContext() !== context) break;
      onAction(action, "gamepad");
    }
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", pauseControls);
  onGamepadChange?.(false);
  if (typeof window.navigator.getGamepads === "function") {
    window.addEventListener("gamepadconnected", scheduleGamepadPoll);
    window.addEventListener("gamepaddisconnected", scheduleGamepadPoll);
    scheduleGamepadPoll();
  }

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("gamepadconnected", scheduleGamepadPoll);
    window.removeEventListener("gamepaddisconnected", scheduleGamepadPoll);
    window.removeEventListener("blur", pauseControls);
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
    }
  };
}
