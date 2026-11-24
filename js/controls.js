const keyBindings = new Map([
  ["arrowleft", "previous"],
  ["arrowright", "next"],
  ["arrowup", "showRadio"],
  ["arrowdown", "showDemand"],
  ["[", "previous"],
  ["]", "next"],
  [" ", "togglePower"],
]);

const buttonBindings = new Map([
  [0, "togglePower"],
  [4, "previous"],
  [5, "next"],
  [12, "showRadio"],
  [13, "showDemand"],
  [14, "previous"],
  [15, "next"],
]);

const nativeKeyboardControls = "input, select, textarea, audio, video, [role='textbox'], [role='slider'], [role='combobox']";
const spaceControls = "button, a[href], summary, [role='button'], [role='checkbox'], [role='switch']";

export function wireControls({ previous, next, togglePower, showRadio, showDemand, isActive = () => true, onGamepadChange }) {
  const actions = { previous, next, togglePower, showRadio, showDemand };
  let connected = false;
  let previousButtons = new Map();
  let frameId = null;
  let skipGamepadActions = false;

  function handleKeyDown(event) {
    if (!isActive() || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    const target = event.target;
    if (target?.isContentEditable || target?.closest?.(nativeKeyboardControls)) {
      return;
    }
    if (event.key === " " && target?.closest?.(spaceControls)) {
      return;
    }

    const action = actions[keyBindings.get(event.key.toLowerCase())];
    if (!action) {
      return;
    }

    event.preventDefault();
    if (!event.repeat) {
      action();
    }
  }

  function pauseGamepadActions() {
    skipGamepadActions = true;
  }

  function scheduleGamepadPoll() {
    if (frameId === null) {
      frameId = window.requestAnimationFrame(pollGamepads);
    }
  }

  function pollGamepads() {
    frameId = null;

    let gamepads = [];
    try {
      gamepads = window.navigator.getGamepads();
    } catch {
      // The browser can block gamepad access in embedded contexts.
    }

    const pressedByGamepad = new Map();
    const newActions = new Set();
    for (const gamepad of gamepads) {
      if (!gamepad?.connected || gamepad.mapping !== "standard") {
        continue;
      }

      const pressed = new Set();
      const previous = previousButtons.get(gamepad.index);
      pressedByGamepad.set(gamepad.index, pressed);
      for (const [buttonIndex, action] of buttonBindings) {
        if (gamepad.buttons[buttonIndex]?.pressed) {
          pressed.add(buttonIndex);
          if (!previous?.has(buttonIndex)) {
            newActions.add(action);
          }
        }
      }

      const rightStickY = gamepad.axes?.[3] ?? 0;
      for (const [direction, magnitude, action] of [
        ["right-stick-up", -rightStickY, "showRadio"],
        ["right-stick-down", rightStickY, "showDemand"],
      ]) {
        const held = previous?.has(direction);
        if (magnitude > (held ? 0.35 : 0.65)) {
          pressed.add(direction);
          if (!held) newActions.add(action);
        }
      }
    }

    previousButtons = pressedByGamepad;
    const hasGamepad = pressedByGamepad.size > 0;
    const canRunActions = !skipGamepadActions && !document.hidden && document.hasFocus() && isActive();
    skipGamepadActions = false;
    if (hasGamepad) {
      scheduleGamepadPoll();
    }
    if (connected !== hasGamepad) {
      connected = hasGamepad;
      onGamepadChange?.(connected);
    }
    if (canRunActions) {
      for (const action of newActions) {
        actions[action]?.();
      }
    }
  }

  window.addEventListener("keydown", handleKeyDown);
  onGamepadChange?.(false);
  if (typeof window.navigator.getGamepads === "function") {
    window.addEventListener("gamepadconnected", scheduleGamepadPoll);
    window.addEventListener("gamepaddisconnected", scheduleGamepadPoll);
    window.addEventListener("blur", pauseGamepadActions);
    scheduleGamepadPoll();
  }

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("gamepadconnected", scheduleGamepadPoll);
    window.removeEventListener("gamepaddisconnected", scheduleGamepadPoll);
    window.removeEventListener("blur", pauseGamepadActions);
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
    }
  };
}
