from __future__ import annotations

from pathlib import Path

import pytest

from md_converter.runner import (
    InvokeResult,
    SourceModifiedError,
    convert_document,
    preflight,
    sha256,
)
from tests.conftest import fake_invoke, no_check

OK: dict[str, InvokeResult] = {
    "markitdown": (0, "# Title\n\nbody äöü".encode(), ""),
    "docling": (0, b"## Title\n", ""),
}


def _tree(folder: Path) -> list[str]:
    return sorted(p.name for p in folder.iterdir())


def test_writes_one_result_per_tool_next_to_a_pdf_copy(sources: Path, out_root: Path) -> None:
    src = sources / "text-layer.pdf"
    result = convert_document(src, out_root, ["markitdown", "docling"], invoke=fake_invoke(OK), check=no_check)

    assert result.ok and not result.warnings
    folder = out_root / "text-layer"
    assert _tree(folder) == ["text-layer.docling.md", "text-layer.markitdown.md", "text-layer.pdf"]
    assert (folder / "text-layer.markitdown.md").read_text(encoding="utf-8") == "# Title\n\nbody äöü\n"
    assert sha256(folder / "text-layer.pdf") == sha256(src)


def test_source_folder_and_source_pdf_stay_unchanged(sources: Path, out_root: Path) -> None:
    before = {p.name: sha256(p) for p in sources.iterdir()}
    for pdf in sorted(sources.iterdir()):
        convert_document(pdf, out_root, ["markitdown"], invoke=fake_invoke(OK), check=no_check)
    assert {p.name: sha256(p) for p in sources.iterdir()} == before


def test_tools_read_the_copy_never_the_source(sources: Path, out_root: Path) -> None:
    calls: list[tuple[str, Path]] = []
    src = sources / "text-layer.pdf"
    convert_document(src, out_root, ["markitdown"], invoke=fake_invoke(OK, calls), check=no_check)
    assert calls == [("markitdown", out_root.resolve() / "text-layer" / "text-layer.pdf")]


def test_a_source_change_during_conversion_is_a_hard_error(sources: Path, out_root: Path) -> None:
    src = sources / "text-layer.pdf"

    def tampering(tool: str, pdf: Path, timeout: float) -> InvokeResult:
        src.write_bytes(src.read_bytes() + b"\n%tampered")
        return OK[tool]

    with pytest.raises(SourceModifiedError):
        convert_document(src, out_root, ["markitdown"], invoke=tampering, check=no_check)


@pytest.mark.parametrize("inside", [".", "out", "out/deeper"])
def test_output_root_inside_the_source_folder_is_refused(sources: Path, inside: str) -> None:
    src = sources / "text-layer.pdf"
    result = convert_document(src, sources / inside, ["markitdown"], invoke=fake_invoke(OK), check=no_check)
    assert not result.ok and "never written" in result.error
    assert _tree(sources) == ["no-text-layer.pdf", "text-layer.pdf"]


def test_rerunning_on_an_output_folder_is_refused(sources: Path, out_root: Path) -> None:
    convert_document(sources / "text-layer.pdf", out_root, ["markitdown"], invoke=fake_invoke(OK), check=no_check)
    copy = out_root / "text-layer" / "text-layer.pdf"
    result = convert_document(copy, out_root, ["markitdown"], invoke=fake_invoke(OK), check=no_check)
    assert "never written" in result.error


def test_no_text_layer_yields_an_empty_file(sources: Path, out_root: Path) -> None:
    blank: dict[str, InvokeResult] = {"markitdown": (0, b"\n \n", ""), "docling": (0, b"", "")}
    src = sources / "no-text-layer.pdf"
    result = convert_document(src, out_root, ["markitdown", "docling"], invoke=fake_invoke(blank), check=no_check)
    assert result.ok
    for tool in ("markitdown", "docling"):
        assert (out_root / "no-text-layer" / f"no-text-layer.{tool}.md").read_bytes() == b""


def test_a_failing_tool_writes_no_file_and_keeps_the_other_result(sources: Path, out_root: Path) -> None:
    mixed: dict[str, InvokeResult] = {
        "markitdown": OK["markitdown"],
        "docling": (1, b"", "Traceback ...\ndocling: ConversionError: broken"),
    }
    src = sources / "text-layer.pdf"
    result = convert_document(src, out_root, ["markitdown", "docling"], invoke=fake_invoke(mixed), check=no_check)

    assert not result.ok
    failed = [t for t in result.tools if t.status == "failed"]
    assert [t.tool for t in failed] == ["docling"]
    assert failed[0].reason == "docling: ConversionError: broken"
    assert _tree(out_root / "text-layer") == ["text-layer.markitdown.md", "text-layer.pdf"]


def test_non_utf8_output_is_a_failure_not_a_file(sources: Path, out_root: Path) -> None:
    bad: dict[str, InvokeResult] = {"markitdown": (0, b"\xff\xfe broken", "")}
    result = convert_document(
        sources / "text-layer.pdf", out_root, ["markitdown"], invoke=fake_invoke(bad), check=no_check
    )
    assert result.tools[0].status == "failed"
    assert _tree(out_root / "text-layer") == ["text-layer.pdf"]


def test_unreadable_pdf_creates_no_folder(tmp_path: Path, out_root: Path) -> None:
    src_dir = tmp_path / "src"
    src_dir.mkdir()
    bad = src_dir / "broken.pdf"
    bad.write_bytes(b"%PDF-1.4 garbage")
    result = convert_document(bad, out_root, ["markitdown"], invoke=fake_invoke(OK), check=preflight)
    assert result.error.startswith("not a readable PDF")
    assert not out_root.exists()


def test_existing_results_are_skipped_unless_forced(sources: Path, out_root: Path) -> None:
    src = sources / "text-layer.pdf"
    convert_document(src, out_root, ["markitdown"], invoke=fake_invoke(OK), check=no_check)
    newer: dict[str, InvokeResult] = {"markitdown": (0, b"newer", "")}

    skipped = convert_document(src, out_root, ["markitdown"], invoke=fake_invoke(newer), check=no_check)
    assert skipped.tools[0].status == "skipped"

    forced = convert_document(src, out_root, ["markitdown"], force=True, invoke=fake_invoke(newer), check=no_check)
    assert forced.tools[0].status == "written"
    assert (out_root / "text-layer" / "text-layer.markitdown.md").read_text() == "newer\n"


def test_a_different_pdf_with_the_same_name_is_not_overwritten(tmp_path: Path, sources: Path, out_root: Path) -> None:
    convert_document(sources / "text-layer.pdf", out_root, ["markitdown"], invoke=fake_invoke(OK), check=no_check)
    other_dir = tmp_path / "other"
    other_dir.mkdir()
    other = other_dir / "text-layer.pdf"
    other.write_bytes((sources / "no-text-layer.pdf").read_bytes())

    result = convert_document(other, out_root, ["markitdown"], invoke=fake_invoke(OK), check=no_check)
    assert "different text-layer.pdf" in result.error
    assert sha256(out_root / "text-layer" / "text-layer.pdf") == sha256(sources / "text-layer.pdf")


def test_foreign_result_files_in_the_folder_are_reported(sources: Path, out_root: Path) -> None:
    folder = out_root / "text-layer"
    folder.mkdir(parents=True)
    (folder / "README.md").write_text("not a result")
    result = convert_document(
        sources / "text-layer.pdf", out_root, ["markitdown"], invoke=fake_invoke(OK), check=no_check
    )
    assert result.warnings == ["README.md is not a result of this run; the comparison view will list it"]


def test_no_partial_files_are_left_behind(sources: Path, out_root: Path) -> None:
    convert_document(
        sources / "text-layer.pdf", out_root, ["markitdown", "docling"], invoke=fake_invoke(OK), check=no_check
    )
    assert not [p for p in (out_root / "text-layer").iterdir() if p.name.startswith(".")]
