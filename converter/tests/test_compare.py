from __future__ import annotations

import base64
import json
import re
from pathlib import Path

import pytest

from md_converter.cli import EXIT_FAILED, EXIT_OK, EXIT_USAGE, main
from md_converter.compare_page import DEFAULT_TEMPLATE, PRELOAD_MARKER, build_page, page_files
from md_converter.runner import InvokeResult
from tests.conftest import fake_invoke

OK: dict[str, InvokeResult] = {"markitdown": (0, b"# mid", ""), "docling": (0, b"# doc", "")}
TEMPLATE = (
    '<!doctype html><html><head><title>t</title></head><body class="cmp"><!--mdv-compare-preload-->'
    "<main></main><script>var lib = '<body>';</script></body></html>"
)


def _payload(html: str) -> list[dict[str, str]]:
    match = re.search(r"window\.__MDV_COMPARE_FILES__ = (.*?);</script>", html, re.S)
    assert match, "no preload script in the page"
    data: list[dict[str, str]] = json.loads(match.group(1))
    return data


@pytest.fixture
def template(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "compare.html"
    path.write_text(TEMPLATE, encoding="utf-8")
    monkeypatch.setenv("MD_CONVERTER_COMPARE_TEMPLATE", str(path))
    return path


def test_build_page_embeds_files_right_after_body(tmp_path: Path) -> None:
    a = tmp_path / "r.pdf"
    a.write_bytes(b"%PDF-1.4 x")
    b = tmp_path / "r.docling.md"
    b.write_text("# Ü", encoding="utf-8")
    html = build_page(TEMPLATE, [a, b])
    # At the marker, not at the first "<body" (the inlined library also contains one).
    assert '<body class="cmp"><script>window.__MDV_COMPARE_FILES__' in html
    assert PRELOAD_MARKER not in html
    payload = _payload(html)
    assert [f["name"] for f in payload] == ["r.pdf", "r.docling.md"]
    assert base64.b64decode(payload[1]["b64"]).decode("utf-8") == "# Ü"


@pytest.mark.parametrize("template", ["<html><body></body></html>", PRELOAD_MARKER * 2])
def test_template_without_exactly_one_marker_is_refused(template: str) -> None:
    with pytest.raises(ValueError):
        build_page(template, [])


def test_page_files_take_the_pdf_and_only_its_own_results(tmp_path: Path) -> None:
    for name in ["r.pdf", "r.docling.md", "r.markitdown.md", "r.paperless.txt", "rx.docling.md", "notes.md"]:
        (tmp_path / name).write_text("x")
    names = [p.name for p in page_files(tmp_path, "r.pdf")]
    assert names == ["r.pdf", "r.docling.md", "r.markitdown.md", "r.paperless.txt"]


def test_compare_converts_then_opens_a_prefilled_page(
    sources: Path, out_root: Path, template: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    opened: list[str] = []
    code = main(
        ["compare", str(sources / "text-layer.pdf"), "--out", str(out_root)],
        invoke=fake_invoke(OK),
        opener=opened.append,
    )
    assert code == EXIT_OK
    page = Path(capsys.readouterr().out.strip())
    assert opened == [page.as_uri()]
    names = [f["name"] for f in _payload(page.read_text(encoding="utf-8"))]
    assert names == ["text-layer.pdf", "text-layer.docling.md", "text-layer.markitdown.md"]


def test_compare_reuses_existing_results(sources: Path, out_root: Path, template: Path) -> None:
    main(["compare", str(sources / "text-layer.pdf"), "--out", str(out_root), "--no-open"], invoke=fake_invoke(OK))
    calls: list[tuple[str, Path]] = []
    code = main(
        ["compare", str(sources / "text-layer.pdf"), "--out", str(out_root), "--no-open"],
        invoke=fake_invoke(OK, calls),
    )
    assert code == EXIT_OK
    assert calls == []


def test_compare_default_out_root_comes_from_the_environment(
    sources: Path, tmp_path: Path, template: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = tmp_path / "env-root"
    monkeypatch.setenv("MD_CONVERTER_OUT", str(root))
    assert main(["compare", str(sources / "text-layer.pdf"), "--no-open"], invoke=fake_invoke(OK)) == EXIT_OK
    assert (root / "text-layer" / "text-layer.markitdown.md").is_file()


def test_compare_opens_what_exists_when_a_tool_fails(sources: Path, out_root: Path, template: Path) -> None:
    mixed: dict[str, InvokeResult] = {"markitdown": OK["markitdown"], "docling": (1, b"", "docling: boom")}
    opened: list[str] = []
    code = main(
        ["compare", str(sources / "text-layer.pdf"), "--out", str(out_root)],
        invoke=fake_invoke(mixed),
        opener=opened.append,
    )
    assert code == EXIT_FAILED
    assert len(opened) == 1


def test_compare_unreadable_pdf_opens_nothing(tmp_path: Path, out_root: Path, template: Path) -> None:
    src = tmp_path / "src"
    src.mkdir()
    bad = src / "broken.pdf"
    bad.write_bytes(b"%PDF-1.4 garbage")
    opened: list[str] = []
    assert main(["compare", str(bad), "--out", str(out_root)], invoke=fake_invoke(OK), opener=opened.append) == 1
    assert opened == []


def test_compare_usage_errors(tmp_path: Path, sources: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    assert main(["compare", str(tmp_path / "missing.pdf")], invoke=fake_invoke(OK)) == EXIT_USAGE
    monkeypatch.setenv("MD_CONVERTER_COMPARE_TEMPLATE", str(tmp_path / "nope.html"))
    assert main(["compare", str(sources / "text-layer.pdf")], invoke=fake_invoke(OK)) == EXIT_USAGE


def test_the_real_compare_page_has_the_preload_hook() -> None:
    # Couples this package to md-viewer's built page: if the hook or the body tag goes,
    # the quick action would open an empty page.
    html = DEFAULT_TEMPLATE.read_text(encoding="utf-8")
    assert html.count(PRELOAD_MARKER) == 1
    # The assignment, not just the name: the name also appears in a comment.
    assert "var preload = window.__MDV_COMPARE_FILES__;" in html
