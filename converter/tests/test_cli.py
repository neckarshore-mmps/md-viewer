from __future__ import annotations

from pathlib import Path

import pytest

from md_converter.cli import EXIT_FAILED, EXIT_OK, EXIT_USAGE, main
from md_converter.runner import InvokeResult
from tests.conftest import fake_invoke

OK: dict[str, InvokeResult] = {"markitdown": (0, b"text", ""), "docling": (0, b"text", "")}


def test_folder_input_converts_every_top_level_pdf(
    sources: Path, out_root: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    code = main(["convert", str(sources), "--out", str(out_root)], invoke=fake_invoke(OK))
    assert code == EXIT_OK
    written = capsys.readouterr().out.split()
    assert len(written) == 4  # two PDFs x two tools, one path per line on stdout
    assert sorted(p.name for p in out_root.iterdir()) == ["no-text-layer", "text-layer"]


def test_tool_selection(sources: Path, out_root: Path) -> None:
    code = main(
        ["convert", str(sources / "text-layer.pdf"), "--out", str(out_root), "--tools", "markitdown"],
        invoke=fake_invoke(OK),
    )
    assert code == EXIT_OK
    assert sorted(p.name for p in (out_root / "text-layer").iterdir()) == ["text-layer.markitdown.md", "text-layer.pdf"]


def test_a_tool_failure_sets_exit_1(sources: Path, out_root: Path, capsys: pytest.CaptureFixture[str]) -> None:
    failing: dict[str, InvokeResult] = {"markitdown": (1, b"", "markitdown: boom"), "docling": OK["docling"]}
    code = main(["convert", str(sources / "text-layer.pdf"), "--out", str(out_root)], invoke=fake_invoke(failing))
    assert code == EXIT_FAILED
    assert "FAILED  text-layer.pdf [markitdown] markitdown: boom" in capsys.readouterr().err


@pytest.mark.parametrize(
    "argv",
    [
        ["convert", "missing.pdf", "--out", "x"],
        ["convert", ".", "--out", "x", "--tools", "tesseract"],
        ["convert", "."],
        [],
    ],
)
def test_usage_errors_exit_2(tmp_path: Path, argv: list[str]) -> None:
    assert main(argv, invoke=fake_invoke(OK)) == EXIT_USAGE


def test_empty_folder_is_a_usage_error(tmp_path: Path) -> None:
    empty = tmp_path / "empty"
    empty.mkdir()
    assert main(["convert", str(empty), "--out", str(tmp_path / "o")], invoke=fake_invoke(OK)) == EXIT_USAGE
