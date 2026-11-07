"""Real Docling on the committed fixtures. Local only: ``uv sync --extra docling`` and
``uv run pytest heavy_tests``. Outside ``testpaths`` on purpose, so CI never collects it
and the gated count stays exactly what CI runs.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from md_converter.cli import EXIT_OK, main
from md_converter.runner import sha256

TOOL_MARKS = [pytest.param("docling", marks=pytest.mark.integration)]


@pytest.mark.parametrize("tool", TOOL_MARKS)
def test_text_layer_pdf_yields_its_text(tool: str, sources: Path, out_root: Path) -> None:
    src = sources / "text-layer.pdf"
    before = sha256(src)
    assert main(["convert", str(src), "--out", str(out_root), "--tools", tool]) == EXIT_OK
    text = (out_root / "text-layer" / f"text-layer.{tool}.md").read_text(encoding="utf-8")
    assert "quick brown fox" in text
    assert "äöü" in text
    assert sha256(src) == before


@pytest.mark.parametrize("tool", TOOL_MARKS)
def test_pdf_without_text_layer_yields_an_empty_file(tool: str, sources: Path, out_root: Path) -> None:
    src = sources / "no-text-layer.pdf"
    assert main(["convert", str(src), "--out", str(out_root), "--tools", tool]) == EXIT_OK
    text = (out_root / "no-text-layer" / f"no-text-layer.{tool}.md").read_text(encoding="utf-8")
    # The contract allows "empty, or only <!-- image -->".
    assert text.replace("<!-- image -->", "").strip() == ""
