"""QC-PDF-01: is a PDF a complete rendering of its source Markdown?

Both sides are Markdown: the source as written, the PDF after a conversion back to
Markdown (Docling by default). The five checks, each with a threshold of 0.95:

1. words in total, PDF / source;
2. words per chapter, every chapter of the source present and at or above the threshold;
3. the critical chapter ("Offene Fragen ...") on its own, so it can never be the one cut;
4. dates and years, PDF / source;
5. citation markers ``[n]``: the same set in the text, every marker in the PDF has an
   entry in the PDF's bibliography, and no bibliography entry of the source is lost.

A chapter is a heading at the source's chapter level: the smallest heading level that
occurs at least twice (a single title heading is not a chapter). Docling flattens heading
levels, so on the PDF side a chapter starts at any line whose normalized text equals a
source chapter title, with or without heading markup.

Running headers and footers are removed from the PDF side before counting: a short line
that repeats three or more times, and a line that is only a page number.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

THRESHOLD = 0.95
CRITICAL_DEFAULT = "Offene Fragen"
BIBLIOGRAPHY = re.compile(r"quellen|literatur|references|sources|bibliograph", re.IGNORECASE)

_HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
_URL = re.compile(r"https?://\S+")
_LINK_TARGET = re.compile(r"\]\([^)]*\)")
_HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
_WORD = re.compile(r"[^\W_]+(?:[-'\u2019.][^\W_]+)*")
_MARKER = re.compile(r"\[(\d{1,4})\]")
# A bibliography entry: "[3] ...", "3. ...", "3) ...", or a list item "- 3 ..." (Docling's rendering
# of a numbered source list), or a structured block's "source_number": 3.
_ENTRY = re.compile(
    r"^\s*(?:[-*+]\s+)?(?:\[(\d{1,4})\]|(\d{1,4})[.)])\s"
    r"|^\s*[-*+]\s+(\d{1,4})\s"
)
_SOURCE_NUMBER = re.compile(r"\"?source_number\"?\s*:\s*(\d{1,4})")
# "Kapitel 9", "Anhang A:", "Appendix B." in front of a title: Docling often splits it into its own line.
_TITLE_PREFIX = re.compile(r"^(?:kapitel|anhang|chapter|appendix|teil|part)\s+[0-9a-z]{1,3}\b[:.]?\s*", re.IGNORECASE)
_PAGE_NUMBER = re.compile(r"^(?:(?:seite|page)\s+)?\d{1,4}(?:\s*(?:/|von|of)\s*\d{1,4})?$", re.IGNORECASE)
_MONTHS = (
    "Januar|Jänner|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|"
    "January|February|March|May|June|July|October|December"
)
_DATE = re.compile(
    r"\b\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}\b"
    r"|\b\d{4}-\d{2}-\d{2}\b"
    rf"|\b(?:\d{{1,2}}\.\s?)?(?:{_MONTHS})\s+\d{{4}}\b"
    r"|\b(?:1[89]\d{2}|20\d{2})\b"
)


def count_words(text: str) -> int:
    text = _HTML_COMMENT.sub(" ", text)
    text = _LINK_TARGET.sub("]", text)
    text = _URL.sub(" ", text)
    return len(_WORD.findall(text))


def count_dates(text: str) -> int:
    return len(_DATE.findall(text))


def normalize_title(title: str) -> str:
    title = re.sub(r"[*_`]", "", title)
    title = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", title)
    title = re.sub(r"^\s*\d+(?:\.\d+)*\.?\s*", "", title)
    stripped = _TITLE_PREFIX.sub("", title.strip())
    title = stripped if re.search(r"[^\W_]", stripped) else title
    return " ".join(re.findall(r"[^\W_]+", title.lower()))


@dataclass
class Chapter:
    title: str
    words: int = 0
    lines: list[str] = field(default_factory=list)


@dataclass
class Document:
    words: int
    dates: int
    chapters: dict[str, Chapter]
    markers: set[int]
    entries: set[int] | None


def strip_running_lines(text: str) -> str:
    lines = text.splitlines()
    short = Counter(s for s in (line.strip() for line in lines) if s and len(s) <= 80 and not _HEADING.match(s))
    repeated = {s for s, n in short.items() if n >= 3}
    kept = [line for line in lines if line.strip() not in repeated and not _PAGE_NUMBER.match(line.strip())]
    return "\n".join(kept)


def chapter_titles(source: str) -> list[str]:
    levels = [len(m.group(1)) for m in map(_HEADING.match, source.splitlines()) if m]
    counts = Counter(levels)
    candidates = [level for level, n in counts.items() if n >= 2]
    if not candidates:
        return []
    level = min(candidates)
    return [m.group(2) for m in map(_HEADING.match, source.splitlines()) if m and len(m.group(1)) == level]


def parse(text: str, titles: list[str], *, flat: bool) -> Document:
    """Split TEXT into the chapters named by TITLES (source titles, in source order).

    flat=False (source): a chapter starts at its own heading line.
    flat=True (PDF side): a chapter starts at any line whose normalized text equals an
    unseen chapter title, heading markup or not.
    """
    wanted = {normalize_title(t): t for t in titles}
    chapters = {t: Chapter(title=t) for t in titles}
    as_heading = {normalize_title(m.group(2)) for m in map(_HEADING.match, text.splitlines()) if m}
    current: Chapter | None = None
    for line in text.splitlines():
        heading = _HEADING.match(line)
        candidate = normalize_title(heading.group(2) if heading else line.strip())
        # A plain line starts a chapter only when that title never appears as a heading,
        # so a table of contents at the top of a PDF cannot claim the chapters.
        starts = heading is not None or (flat and candidate not in as_heading)
        if candidate in wanted and starts:
            current = chapters[wanted.pop(candidate)]
            current.lines.append(line)
            continue
        if current is not None:
            current.lines.append(line)
    bibliography = next((c for c in chapters.values() if BIBLIOGRAPHY.search(c.title)), None)
    entries: set[int] | None = None
    body = text
    if bibliography is not None:
        entries = set()
        for line in bibliography.lines[1:]:
            if "source_number" in line:
                entries.update(int(n) for n in _SOURCE_NUMBER.findall(line))
                continue
            match = _ENTRY.match(line)
            if match:
                entries.add(int(next(g for g in match.groups() if g)))
        body = text.replace("\n".join(bibliography.lines), "")
    for chapter in chapters.values():
        chapter.words = count_words("\n".join(chapter.lines[1:]))
    return Document(
        words=count_words(text),
        dates=count_dates(text),
        chapters=chapters,
        markers={int(n) for n in _MARKER.findall(body)},
        entries=entries,
    )


def _ratio(part: int, whole: int) -> float:
    return 1.0 if whole == 0 else part / whole


def verify_texts(
    source: str, pdf_text: str, *, threshold: float = THRESHOLD, critical: str = CRITICAL_DEFAULT
) -> dict[str, Any]:
    titles = chapter_titles(source)
    src = parse(source, titles, flat=False)
    pdf = parse(strip_running_lines(pdf_text), titles, flat=True)
    checks: list[dict[str, Any]] = []

    total = _ratio(pdf.words, src.words)
    checks.append({"id": 1, "name": "words in total", "value": round(total, 3), "passed": total >= threshold})

    per_chapter = {t: _ratio(pdf.chapters[t].words, src.chapters[t].words) for t in titles if src.chapters[t].words}
    low = {t: round(r, 3) for t, r in per_chapter.items() if r < threshold}
    checks.append(
        {
            "id": 2,
            "name": "every chapter",
            "value": round(min(per_chapter.values(), default=1.0), 3),
            "passed": not low,
            "detail": "; ".join(f"{t}: {r}" for t, r in low.items()) or f"{len(per_chapter)} chapters",
        }
    )

    key = normalize_title(critical)
    crit = next((t for t in titles if key and key in normalize_title(t)), None)
    if crit is None or not src.chapters[crit].words:
        checks.append(
            {
                "id": 3,
                "name": "critical chapter",
                "value": None,
                "passed": True,
                "detail": f"'{critical}' not in the source",
            }
        )
    else:
        ratio = _ratio(pdf.chapters[crit].words, src.chapters[crit].words)
        checks.append(
            {
                "id": 3,
                "name": "critical chapter",
                "value": round(ratio, 3),
                "passed": ratio >= threshold,
                "detail": crit,
            }
        )

    dates = _ratio(pdf.dates, src.dates)
    checks.append(
        {
            "id": 4,
            "name": "dates",
            "value": round(dates, 3),
            "passed": dates >= threshold,
            "detail": f"{src.dates} -> {pdf.dates}",
        }
    )

    problems = []
    if pdf.markers != src.markers:
        problems.append(f"markers lost {sorted(src.markers - pdf.markers)}, added {sorted(pdf.markers - src.markers)}")
    if pdf.entries is not None and pdf.markers - pdf.entries:
        problems.append(f"markers without an entry {sorted(pdf.markers - pdf.entries)}")
    if src.entries:
        lost = src.entries - (pdf.entries or set())
        if lost:
            problems.append(f"bibliography entries lost {sorted(lost)}")
    checks.append(
        {
            "id": 5,
            "name": "citation markers",
            "value": f"{len(src.markers)} -> {len(pdf.markers)}",
            "passed": not problems,
            "detail": "; ".join(problems) or "identical",
        }
    )

    return {
        "words": {"source": src.words, "pdf": pdf.words},
        "chapters": {t: {"source": src.chapters[t].words, "pdf": pdf.chapters[t].words} for t in titles},
        "checks": checks,
        "passed": all(c["passed"] for c in checks),
    }
