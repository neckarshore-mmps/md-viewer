"""Converter registry. Each tool turns one readable PDF into Markdown text.

A tool runs inside the worker subprocess (``md_converter.worker``), so a heavy
import such as Docling's model stack is paid there and freed when the worker exits.
Adding a converter is one module plus one line here; the comparison view needs no
change, because it reads the label from the filename.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

ToolFn = Callable[[Path], str]


def _docling(pdf: Path) -> str:
    from md_converter.tools.docling_tool import convert

    return convert(pdf)


def _markitdown(pdf: Path) -> str:
    from md_converter.tools.markitdown_tool import convert

    return convert(pdf)


#: Order is the default run order: the light tool first, so its result exists early.
TOOLS: dict[str, ToolFn] = {
    "markitdown": _markitdown,
    "docling": _docling,
}
