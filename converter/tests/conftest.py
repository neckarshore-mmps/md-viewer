from __future__ import annotations

import shutil
from collections.abc import Callable
from pathlib import Path

import pytest

from md_converter.runner import InvokeResult

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def sources(tmp_path: Path) -> Path:
    """A source collection in its own folder, separate from any output root."""
    folder = tmp_path / "sources"
    folder.mkdir()
    for pdf in FIXTURES.glob("*.pdf"):
        shutil.copyfile(pdf, folder / pdf.name)
    return folder


@pytest.fixture
def out_root(tmp_path: Path) -> Path:
    return tmp_path / "out"


def fake_invoke(
    results: dict[str, InvokeResult], calls: list[tuple[str, Path]] | None = None
) -> Callable[[str, Path, float], InvokeResult]:
    """An invoke that returns canned (code, stdout, stderr) per tool, no subprocess."""

    def invoke(tool: str, pdf: Path, timeout: float) -> InvokeResult:
        if calls is not None:
            calls.append((tool, pdf))
        return results[tool]

    return invoke


def no_check(pdf: Path) -> None:
    return None
