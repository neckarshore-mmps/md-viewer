"""The file contract with the md-viewer comparison view (md.neckarshore.ai/compare).

The view labels a result by its filename: ``<doc>.<label>.md`` next to ``<doc>.pdf``
(see ``src/compare.js``, ``labelFor``). It loads every ``.md``, ``.markdown`` and ``.txt``
it is given as a candidate, so a result folder must hold nothing else under those
extensions. Everything that names a file on disk goes through this module.
"""

from __future__ import annotations

import re
from pathlib import Path

#: Extensions the comparison view treats as a result (compare.js ``isResult``).
RESULT_SUFFIXES = (".md", ".markdown", ".txt")

#: A tool name becomes the label in the view, so it must be a single dotless segment.
_TOOL_NAME = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def doc_stem(pdf: Path) -> str:
    """``report.v2.pdf`` -> ``report.v2`` (only the last suffix is the extension)."""
    return pdf.name[: -len(pdf.suffix)] if pdf.suffix else pdf.name


def is_pdf(path: Path) -> bool:
    return path.suffix.lower() == ".pdf"


def result_name(stem: str, tool: str, suffix: str = ".md") -> str:
    """``("report", "docling")`` -> ``report.docling.md``."""
    if not _TOOL_NAME.match(tool):
        raise ValueError(f"tool name {tool!r} must match {_TOOL_NAME.pattern}")
    if suffix not in RESULT_SUFFIXES:
        raise ValueError(f"suffix {suffix!r} is not one of {RESULT_SUFFIXES}")
    return f"{stem}.{tool}{suffix}"


def temp_name(final_name: str) -> str:
    """A name the view never picks up: hidden, and not ending in a result suffix."""
    return f".{final_name}.partial"


def doc_dir(out_root: Path, pdf: Path) -> Path:
    """One folder per document, so each folder holds one PDF and its results only."""
    return out_root / doc_stem(pdf)
