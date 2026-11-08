from __future__ import annotations

from pathlib import Path

import pytest

from md_converter.contract import (
    RESULT_SUFFIXES,
    doc_dir,
    doc_stem,
    is_pdf,
    result_name,
    temp_name,
)


def test_result_name_follows_the_view_contract() -> None:
    assert result_name("report", "docling") == "report.docling.md"
    assert result_name("report", "paperless", ".txt") == "report.paperless.txt"


def test_doc_stem_keeps_inner_dots() -> None:
    # compare.js strips the PDF stem as a prefix, so "report.v2" must stay whole.
    assert doc_stem(Path("report.v2.pdf")) == "report.v2"
    assert result_name(doc_stem(Path("report.v2.pdf")), "markitdown") == "report.v2.markitdown.md"


@pytest.mark.parametrize("bad", ["", "Docling", "doc.ling", "doc ling", "-x", "../x"])
def test_tool_name_must_be_one_lowercase_segment(bad: str) -> None:
    with pytest.raises(ValueError):
        result_name("report", bad)


def test_suffix_must_be_one_the_view_loads() -> None:
    with pytest.raises(ValueError):
        result_name("report", "docling", ".log")


def test_temp_name_is_never_loaded_by_the_view() -> None:
    name = temp_name("report.docling.md")
    assert name.startswith(".")
    assert not name.lower().endswith(RESULT_SUFFIXES)


def test_is_pdf_is_case_insensitive() -> None:
    assert is_pdf(Path("A.PDF"))
    assert not is_pdf(Path("a.md"))


def test_one_folder_per_document() -> None:
    assert doc_dir(Path("/out"), Path("/src/report.pdf")) == Path("/out/report")
