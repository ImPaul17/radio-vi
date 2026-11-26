"""Short-lived, one-to-one sessions for Radio VI's phone controller."""

from collections import deque
from dataclasses import dataclass, field
from http import HTTPStatus
import math
from secrets import compare_digest, token_urlsafe
from threading import Condition
from time import monotonic


RELAY_ROUTES = frozenset(f"/controller/{action}" for action in (
    "session", "join", "state", "poll", "close", "disconnect",
))
MAX_ROOMS = 32
MAX_FRAMES = 128
HOST_TIMEOUT = 90
PHONE_TIMEOUT = 5
POLL_TIMEOUT = 8
BUTTON_COUNT = 17
AXIS_COUNT = 4
NEUTRAL = ((False,) * BUTTON_COUNT, (0,) * AXIS_COUNT)


class RelayError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


@dataclass
class Room:
    host_token: str
    join_token: str | None
    last_host: float
    phone_token: str | None = None
    last_phone: float = 0
    connected: bool = False
    polling: bool = False
    revision: int = 0
    state: tuple = NEUTRAL
    frames: deque = field(default_factory=lambda: deque(maxlen=MAX_FRAMES))


def authorize(token, expected):
    if expected is None or not isinstance(token, str) or not token.isascii() or not compare_digest(token, expected):
        raise RelayError(HTTPStatus.FORBIDDEN, "Credenciales del mando no válidas.")


def read_state(payload):
    buttons, axes = payload.get("buttons"), payload.get("axes")
    if not isinstance(buttons, list) or len(buttons) != BUTTON_COUNT or any(type(button) is not bool for button in buttons):
        raise RelayError(HTTPStatus.BAD_REQUEST, "Estado de botones no válido.")
    if not isinstance(axes, list) or len(axes) != AXIS_COUNT or any(
        type(axis) not in (float, int) or not -1 <= axis <= 1 or not math.isfinite(axis) for axis in axes
    ):
        raise RelayError(HTTPStatus.BAD_REQUEST, "Estado de sticks no válido.")
    return tuple(buttons), tuple(axes)


def frame_json(frame):
    buttons, axes = frame
    return {"buttons": buttons, "axes": axes}


class ControllerRelay:
    def __init__(self):
        self.rooms = {}
        self.changed = Condition()

    def _publish(self, room, state, connected):
        if room.state == state and room.connected == connected:
            return
        room.connected = connected
        room.state = state
        room.revision += 1
        room.frames.append((room.revision, state))
        self.changed.notify_all()

    def _prune(self, now):
        expired = [name for name, room in self.rooms.items() if now - room.last_host >= HOST_TIMEOUT]
        for name in expired:
            del self.rooms[name]
        if expired:
            self.changed.notify_all()

    def _expire_phone(self, room, now):
        if room.connected and now - room.last_phone >= PHONE_TIMEOUT:
            self._publish(room, NEUTRAL, False)

    def _create(self, now):
        if len(self.rooms) >= MAX_ROOMS:
            raise RelayError(HTTPStatus.SERVICE_UNAVAILABLE, "Hay demasiados mandos conectados. Inténtalo en un momento.")
        name = token_urlsafe(12)
        room = Room(token_urlsafe(24), token_urlsafe(24), now)
        self.rooms[name] = room
        return {"room": name, "hostToken": room.host_token, "joinToken": room.join_token}

    def _poll(self, name, room, since, now):
        if type(since) is not int or not 0 <= since <= room.revision:
            raise RelayError(HTTPStatus.BAD_REQUEST, "Revisión del mando no válida.")
        if room.polling:
            raise RelayError(HTTPStatus.CONFLICT, "Ya hay una consulta del mando abierta.")
        room.last_host = now
        room.polling = True
        deadline = now + POLL_TIMEOUT
        try:
            while True:
                if self.rooms.get(name) is not room:
                    raise RelayError(HTTPStatus.NOT_FOUND, "La sesión del mando ha terminado.")
                now = monotonic()
                self._expire_phone(room, now)
                if since < room.revision or now >= deadline:
                    break
                wake_at = min(deadline, room.last_phone + PHONE_TIMEOUT) if room.connected else deadline
                self.changed.wait(wake_at - now)
            room.last_host = now
            if room.frames and since < room.frames[0][0] - 1:
                # An interrupted receiver must release old inputs before resuming.
                frames = [NEUTRAL, room.state]
            else:
                frames = [frame for revision, frame in room.frames if revision > since]
            return {"connected": room.connected, "revision": room.revision, "frames": list(map(frame_json, frames))}
        finally:
            room.polling = False

    def handle(self, path, payload):
        with self.changed:
            now = monotonic()
            self._prune(now)
            if path == "/controller/session":
                return self._create(now)

            name = payload.get("room")
            room = self.rooms.get(name) if isinstance(name, str) else None
            if room is None:
                raise RelayError(HTTPStatus.NOT_FOUND, "La sesión del mando no existe o ha caducado.")
            self._expire_phone(room, now)

            if path == "/controller/join":
                if room.phone_token is not None:
                    raise RelayError(HTTPStatus.CONFLICT, "Este código ya se ha usado. Genera otro desde Radio VI.")
                authorize(payload.get("joinToken"), room.join_token)
                room.join_token = None
                room.phone_token = token_urlsafe(24)
                room.last_phone = now
                self._publish(room, NEUTRAL, True)
                return {"phoneToken": room.phone_token}

            if path == "/controller/poll":
                authorize(payload.get("hostToken"), room.host_token)
                return self._poll(name, room, payload.get("since"), now)
            if path == "/controller/close":
                authorize(payload.get("hostToken"), room.host_token)
                del self.rooms[name]
                self.changed.notify_all()
                return {}

            authorize(payload.get("phoneToken"), room.phone_token)
            if path == "/controller/state":
                state = read_state(payload)
                room.last_phone = now
                self._publish(room, state, True)
            else:
                self._publish(room, NEUTRAL, False)
            return {}
