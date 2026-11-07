"""A local, pre-filled copy of the comparison view for one converted PDF.

Used by ``md-converter compare <pdf>`` and therefore by the Finder quick action on macOS
and the "Send to" entry on Windows. The page is md-viewer's own ``web/compare.html`` with
the PDF and its results embedded as base64 in ``window.__MDV_COMPARE_FILES__``, which
``src/compare.js`` hands to the same code path a drop uses. Nothing is uploaded: the file
lives in a temp folder and opens in the default browser.
"""

from __future__ import annotations

import base64
import json
import os
import re
import tempfile
from pathlib import Path

from md_converter.contract import RESULT_SUFFIXES, doc_stem

#: md-viewer/web/compare.html, two levels above this package's ``src`` folder.
DEFAULT_TEMPLATE = Path(__file__).resolve().parents[3] / "web" / "compare.html"

_BODY_OPEN = re.compile(r"<body[^>]*>", re.IGNORECASE)


def template_path() -> Path:
    override = os.environ.get("MD_CONVERTER_COMPARE_TEMPLATE")
    return Path(override) if override else DEFAULT_TEMPLATE


def page_files(folder: Path, pdf_name: str) -> list[Path]:
    """The PDF copy first, then every ``<doc>.<label>.<md|markdown|txt>`` in the folder."""
    stem = doc_stem(Path(pdf_name))
    results = sorted(
        p
        for p in folder.iterdir()
        if p.is_file() and p.name.startswith(stem + ".") and p.suffix.lower() in RESULT_SUFFIXES
    )
    return [folder / pdf_name, *results]


def build_page(template_html: str, files: list[Path]) -> str:
    payload = [{"name": f.name, "b64": base64.b64encode(f.read_bytes()).decode("ascii")} for f in files]
    # "</" inside a JSON string would end the script element early; "<\/" is the same string.
    data = json.dumps(payload).replace("</", "<\\/")
    script = f"<script>window.__MDV_COMPARE_FILES__ = {data};</script>"
    match = _BODY_OPEN.search(template_html)
    if match is None:
        raise ValueError("compare template has no <body> tag")
    return template_html[: match.end()] + script + template_html[match.end() :]


def write_page(html: str, stem: str) -> Path:
    folder = Path(tempfile.mkdtemp(prefix="md-compare-"))
    out = folder / f"{stem}.compare.html"
    out.write_text(html, encoding="utf-8")
    return out
