"""Serve Radio VI locally with seekable audio."""

import argparse
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path, PurePosixPath
import re
from urllib.parse import unquote


AUDIO_TYPES = {".opus": "audio/ogg", ".m4a": "audio/mp4"}
MEDIA_DIRECTORY = "media/radio-local"


def public_files(root, *, media_only=False):
    manifest_path = f"{MEDIA_DIRECTORY}/manifest.json"
    paths = {
        "media/fonts/GTAArtDeco-Condensed-Bold.ttf",
        f"{MEDIA_DIRECTORY}/power.wav",
        f"{MEDIA_DIRECTORY}/tune.wav",
        manifest_path,
    }
    directories = [("media/logos/png", {".png"})]
    if not media_only:
        paths.update(("index.html", "style.css"))
        directories.extend([("assets", {".png", ".webp"}), ("js", {".js"})])
    for directory, suffixes in directories:
        paths.update(
            path.relative_to(root).as_posix()
            for path in (root / directory).iterdir()
            if path.suffix.lower() in suffixes
        )
    manifest = json.loads((root / manifest_path).read_text(encoding="utf-8-sig"))
    for tracks in manifest.values():
        for track in tracks:
            source = unquote(track["src"])
            relative = PurePosixPath(source)
            if not relative.is_absolute() and ".." not in relative.parts and "\\" not in source:
                if relative.suffix.lower() in AUDIO_TYPES:
                    paths.add(f"{MEDIA_DIRECTORY}/{relative.as_posix()}")
    return paths


class RadioHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, allowed_files=None, media_only=False, **kwargs):
        self.allowed_files = allowed_files
        self.media_only = media_only
        super().__init__(*args, **kwargs)

    def public_path_allowed(self, path):
        root = Path(self.directory)
        if path == root:
            path /= "index.html"
        try:
            return (
                path.relative_to(root).as_posix() in self.allowed_files
                and path.resolve() == path
                and path.is_file()
            )
        except (OSError, ValueError):
            return False

    def end_headers(self):
        if self.media_only:
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Expose-Headers", "Accept-Ranges, Content-Range")
        super().end_headers()

    def do_OPTIONS(self):
        if not self.media_only:
            self.send_error(HTTPStatus.NOT_IMPLEMENTED)
            return
        if not self.public_path_allowed(Path(self.translate_path(self.path))):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Range, If-Range")
        self.end_headers()

    def send_head(self):
        self.remaining = None
        path = Path(self.translate_path(self.path))
        if self.allowed_files is not None and not self.public_path_allowed(path):
            self.send_error(HTTPStatus.NOT_FOUND)
            return None

        content_type = AUDIO_TYPES.get(path.suffix.lower())
        if not content_type or not path.is_file():
            return super().send_head()

        try:
            audio = path.open("rb")
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND)
            return None

        stat = os.fstat(audio.fileno())
        modified = self.date_time_string(stat.st_mtime)
        request = self.headers.get("Range", "")
        match = re.fullmatch(r"bytes=(\d{0,20})-(\d{0,20})", request)
        if self.command == "GET" and match and any(match.groups()) and self.headers.get("If-Range", modified) == modified:
            first, last = match.groups()
            start = int(first) if first else max(0, stat.st_size - int(last))
            end = min(int(last), stat.st_size - 1) if first and last else stat.st_size - 1
            if start > end:
                audio.close()
                self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                self.send_header("Content-Range", f"bytes */{stat.st_size}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return None

            audio.seek(start)
            self.remaining = end - start + 1
            self.send_response(HTTPStatus.PARTIAL_CONTENT)
            self.send_header("Content-Range", f"bytes {start}-{end}/{stat.st_size}")
        else:
            self.send_response(HTTPStatus.OK)

        self.send_header("Content-Type", content_type)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(stat.st_size if self.remaining is None else self.remaining))
        self.send_header("Last-Modified", modified)
        self.end_headers()
        return audio

    def copyfile(self, source, outputfile):
        try:
            if self.remaining is None:
                super().copyfile(source, outputfile)
                return

            while self.remaining:
                block = source.read(min(self.remaining, 64 * 1024))
                if not block:
                    break
                outputfile.write(block)
                self.remaining -= len(block)
        except (BrokenPipeError, ConnectionResetError):
            # The browser cancels requests when the listener switches stations.
            pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4174)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--public", action="store_true", help="Only serve the files used by Radio VI.")
    mode.add_argument("--media-only", action="store_true", help="Only serve media files, with cross-origin access.")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    allowed_files = public_files(root, media_only=args.media_only) if args.public or args.media_only else None
    handler = partial(RadioHandler, directory=root, allowed_files=allowed_files, media_only=args.media_only)
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Radio VI en http://127.0.0.1:{server.server_port}/", flush=True)
        server.serve_forever()
