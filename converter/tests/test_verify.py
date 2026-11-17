"""QC-PDF-01: completeness of a PDF against its source Markdown (``md-converter verify``).

Synthetic fixtures only. The real regression case (a 7-page PDF that kept 19.5 % of its
source) is personal research data and stays out of the repository; its numbers are in
the pull request.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from md_converter.cli import EXIT_FAILED, EXIT_OK, EXIT_USAGE, main
from md_converter.runner import InvokeResult
from md_converter.verify import count_dates, count_words, verify_texts
from tests.conftest import fake_invoke

FILLER = "Der Abgeordnete sprach am Rednerpult über Haushalt und Bildung im Land. "

SOURCE = f"""# Personenprofil Beispiel

Einleitung ohne Kapitel. {FILLER}

## 1 Kurzüberblick

{FILLER * 4} Gewählt am 12.03.2021 [1].

## 2 Werdegang

{FILLER * 6} Seit März 2016 im Landtag [2], Ausschuss 2019 bis 2021 [3].

## 3 Offene Fragen und widersprüchliche Angaben

{FILLER * 5} Unklar, ob die Angabe vom 2018-05-04 stimmt [2].

## 4 Quellenverzeichnis

[1] Landtag, Abgeordnetenseite.
[2] Zeitung, Artikel.
[3] Ausschussprotokoll.
"""


def _pdf_text(source: str) -> str:
    """What Docling returns for a faithful PDF of SOURCE: flat headings, a running footer."""
    body = source.replace("# Personenprofil", "## Personenprofil")
    lines = []
    for i, line in enumerate(body.splitlines()):
        lines.append(line)
        if i % 6 == 5:
            lines.extend(["", "Politik-Tracker Entwurf", "", str(i // 6 + 1), ""])
    return "\n".join(lines)


def _check(report: dict[str, object], number: int) -> dict[str, object]:
    checks = report["checks"]
    assert isinstance(checks, list)
    return checks[number - 1]


def test_a_faithful_pdf_passes_all_five() -> None:
    report = verify_texts(SOURCE, _pdf_text(SOURCE))
    assert [c["passed"] for c in report["checks"]] == [True] * 5
    assert report["passed"] is True


def test_running_footers_and_page_numbers_are_not_counted() -> None:
    report = verify_texts(SOURCE, _pdf_text(SOURCE))
    assert report["words"]["pdf"] == report["words"]["source"]


def test_a_silent_short_version_fails_total_chapters_and_critical_chapter() -> None:
    short = SOURCE.replace(FILLER * 6, FILLER).replace(FILLER * 5, "")
    report = verify_texts(SOURCE, short)
    assert _check(report, 1)["passed"] is False
    assert _check(report, 2)["passed"] is False
    assert _check(report, 3)["passed"] is False
    assert report["passed"] is False


def test_a_missing_chapter_fails_check_2_even_when_the_total_holds() -> None:
    cut = SOURCE.split("## 4 Quellenverzeichnis")[0]
    report = verify_texts(SOURCE + "\n## 5 Anhang A\n\nkurz\n", cut + "\n" + FILLER)
    chapters = _check(report, 2)
    assert chapters["passed"] is False
    assert "5 Anhang A" in str(chapters["detail"])


def test_the_critical_chapter_fails_alone() -> None:
    critical_cut = SOURCE.replace(FILLER * 5, FILLER * 4)
    report = verify_texts(SOURCE, critical_cut)
    assert _check(report, 3)["passed"] is False


def test_lost_dates_fail_check_4() -> None:
    no_dates = SOURCE.replace("12.03.2021", "damals").replace("März 2016", "damals").replace("2018-05-04", "damals")
    report = verify_texts(SOURCE, no_dates)
    assert _check(report, 4)["passed"] is False


def test_a_lost_marker_fails_check_5() -> None:
    report = verify_texts(SOURCE, SOURCE.replace("[3].", "."))
    assert _check(report, 5)["passed"] is False


def test_a_dropped_bibliography_entry_fails_check_5() -> None:
    report = verify_texts(SOURCE, SOURCE.replace("[3] Ausschussprotokoll.\n", ""))
    assert _check(report, 5)["passed"] is False


def test_numbered_list_bibliography_from_docling_counts_as_entries() -> None:
    as_list = SOURCE.replace("[1] Landtag", "1. Landtag").replace("[2] Zeitung", "2. Zeitung")
    as_list = as_list.replace("[3] Ausschuss", "3. Ausschuss")
    report = verify_texts(SOURCE, as_list)
    assert _check(report, 5)["passed"] is True


def test_docling_list_items_and_split_appendix_headings_are_read() -> None:
    source = SOURCE + "\n## Anhang A: Kanalregister\n\n" + FILLER * 2 + "\n"
    pdf = source.replace("[1] Landtag", "- 1 Landtag").replace("[2] Zeitung", "- 2 Zeitung")
    pdf = pdf.replace("[3] Ausschuss", "- 3 Ausschuss").replace(
        "## Anhang A: Kanalregister", "## ANHANG A\n\n## Kanalregister"
    )
    report = verify_texts(source, pdf)
    assert report["passed"] is True, report["checks"]


def test_a_structured_source_list_with_source_number_counts_as_entries() -> None:
    block = (
        '```yaml\n{"sources": [{"title": "a", "source_number": 1}, {"source_number": 2}, {"source_number": 3}]}\n```\n'
    )
    source = SOURCE.replace("[1] Landtag, Abgeordnetenseite.\n[2] Zeitung, Artikel.\n[3] Ausschussprotokoll.\n", block)
    pdf = SOURCE.replace("[3] Ausschussprotokoll.\n", "")
    check = _check(verify_texts(source, pdf), 5)
    assert check["passed"] is False
    assert "entries lost [3]" in str(check["detail"])


def test_no_critical_chapter_in_the_source_is_not_a_failure() -> None:
    plain = SOURCE.replace("Offene Fragen und widersprüchliche Angaben", "Ausblick")
    check = _check(verify_texts(plain, plain), 3)
    assert check["passed"] is True
    assert "not in the source" in str(check["detail"])


def test_word_count_ignores_urls_and_link_targets() -> None:
    assert count_words("Siehe [Quelle](https://example.org/a/b?c=1) und https://x.y/z hier") == 4


def test_a_full_date_counts_once_not_as_date_plus_year() -> None:
    assert count_dates("am 12.03.2021, im März 2016, am 2018-05-04 und 1999") == 4


def _write(tmp_path: Path, source: str, pdf_md: str) -> tuple[Path, Path, Path]:
    (tmp_path / "src").mkdir(exist_ok=True)
    pdf = tmp_path / "src" / "profil.pdf"
    pdf.write_bytes(b"%PDF-1.4 stub")
    md = tmp_path / "profil.md"
    md.write_text(source, encoding="utf-8")
    converted = tmp_path / "profil.docling.md"
    converted.write_text(pdf_md, encoding="utf-8")
    return pdf, md, converted


def test_cli_with_a_given_conversion_exits_0_and_prints_the_five_results(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    pdf, md, converted = _write(tmp_path, SOURCE, _pdf_text(SOURCE))
    code = main(["verify", str(pdf), "--source", str(md), "--pdf-md", str(converted)])
    out = capsys.readouterr().out
    assert code == EXIT_OK
    assert sum(line.startswith("PASS ") for line in out.splitlines()) == 5
    assert "QC-PDF-01 PASSED" in out


def test_cli_fails_with_exit_1_on_a_short_version(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    pdf, md, converted = _write(tmp_path, SOURCE, SOURCE.replace(FILLER * 6, ""))
    code = main(["verify", str(pdf), "--source", str(md), "--pdf-md", str(converted), "--json"])
    assert code == EXIT_FAILED
    assert '"passed": false' in capsys.readouterr().out


def test_cli_converts_with_docling_when_no_conversion_is_given(tmp_path: Path) -> None:
    pdf, md, _ = _write(tmp_path, SOURCE, "")
    ok: dict[str, InvokeResult] = {"docling": (0, _pdf_text(SOURCE).encode(), "")}
    calls: list[tuple[str, Path]] = []
    code = main(
        ["verify", str(pdf), "--source", str(md), "--out", str(tmp_path / "out")],
        invoke=fake_invoke(ok, calls),
        check=lambda _pdf: None,
    )
    assert code == EXIT_OK
    assert [tool for tool, _ in calls] == ["docling"]


def test_cli_usage_errors_exit_2(tmp_path: Path) -> None:
    pdf, _, _ = _write(tmp_path, SOURCE, "")
    assert main(["verify", str(pdf), "--source", str(tmp_path / "missing.md")]) == EXIT_USAGE
    assert main(["verify", str(tmp_path / "missing.pdf"), "--source", str(pdf)]) == EXIT_USAGE
