"""Convert one PDF with every requested tool, under the comparison-view contract.

Guarantees, each covered by a test in ``tests/test_runner.py``:

1. The source PDF is never written. It is hashed before and after; a difference is a
   hard error. The tools never see it: they read a verified copy in the result folder.
2. The source folder is never written. An output root inside it is refused.
3. One folder per document, holding the PDF copy and ``<doc>.<tool>.md`` files only.
   Files are written as hidden ``.partial`` names and renamed into place, so a crash
   never leaves a half-written candidate for the view to load.
4. No text layer -> an empty result file (the view says "No text layer, OCR not
   available"). A damaged PDF or a failing tool -> no result file and a failed
   outcome, so a crash is never shown as "no text layer" (Founder decision 2026-11-07).
"""

from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import sys
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from md_converter.contract import RESULT_SUFFIXES, doc_dir, doc_stem, result_name, temp_name

#: (exit code, stdout bytes, stderr text) for one tool run on one PDF.
InvokeResult = tuple[int, bytes, str]
Invoke = Callable[[str, Path, float], InvokeResult]
Check = Callable[[Path], None]

DEFAULT_TIMEOUT_S = 1800.0
EXIT_TIMEOUT = 124


class SourceModifiedError(RuntimeError):
    """The source PDF changed while it was being converted. Never expected; never ignored."""


@dataclass
class ToolOutcome:
    tool: str
    status: Literal["written", "skipped", "failed"]
    path: Path | None = None
    reason: str = ""


@dataclass
class DocOutcome:
    source: Path
    folder: Path | None = None
    error: str = ""
    tools: list[ToolOutcome] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.error and all(t.status != "failed" for t in self.tools)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def preflight(pdf: Path) -> None:
    """Raise if the file is not a PDF that a PDF engine can open (damaged, encrypted, empty)."""
    import pypdfium2

    document = pypdfium2.PdfDocument(pdf)
    try:
        if len(document) == 0:
            raise ValueError("PDF has no pages")
    finally:
        document.close()


def subprocess_invoke(tool: str, pdf: Path, timeout: float) -> InvokeResult:
    command = [sys.executable, "-m", "md_converter.worker", tool, str(pdf)]
    try:
        proc = subprocess.run(command, capture_output=True, timeout=timeout, check=False)
    except subprocess.TimeoutExpired:
        return EXIT_TIMEOUT, b"", f"{tool}: timed out after {timeout:.0f} s"
    return proc.returncode, proc.stdout, proc.stderr.decode("utf-8", errors="replace")


def _atomic_write(target: Path, data: bytes) -> None:
    partial = target.with_name(temp_name(target.name))
    try:
        partial.write_bytes(data)
        os.replace(partial, target)
    finally:
        partial.unlink(missing_ok=True)


def _atomic_copy(source: Path, target: Path) -> None:
    partial = target.with_name(temp_name(target.name))
    try:
        shutil.copyfile(source, partial)
        os.replace(partial, target)
    finally:
        partial.unlink(missing_ok=True)


def _normalize(text: str) -> str:
    """Whitespace-only output is no text: write an empty file, never a lone newline."""
    if not text.strip():
        return ""
    return text if text.endswith("\n") else text + "\n"


def _last_line(stderr: str) -> str:
    lines = [line for line in stderr.strip().splitlines() if line.strip()]
    return lines[-1] if lines else "no error message"


def convert_document(
    source: Path,
    out_root: Path,
    tools: Sequence[str],
    *,
    force: bool = False,
    timeout: float = DEFAULT_TIMEOUT_S,
    invoke: Invoke = subprocess_invoke,
    check: Check = preflight,
) -> DocOutcome:
    source = source.resolve()
    out_root = out_root.resolve()
    outcome = DocOutcome(source=source)

    folder = doc_dir(out_root, source)
    if out_root.is_relative_to(source.parent) or folder == source.parent:
        outcome.error = (
            f"output {folder} would be written into the source folder {source.parent}; "
            "the source collection is never written"
        )
        return outcome

    before = sha256(source)
    try:
        check(source)
    except Exception as exc:  # noqa: BLE001 — any reason a PDF cannot be opened
        outcome.error = f"not a readable PDF: {type(exc).__name__}: {exc}"
        return outcome

    folder.mkdir(parents=True, exist_ok=True)
    outcome.folder = folder
    copy = folder / source.name

    if copy.exists():
        if sha256(copy) != before:
            outcome.error = f"{folder} already holds a different {source.name}; not overwritten"
            return outcome
    else:
        _atomic_copy(source, copy)
        if sha256(copy) != before:
            copy.unlink(missing_ok=True)
            outcome.error = f"copy of {source.name} does not match the source hash"
            return outcome

    stem = doc_stem(source)
    for tool in tools:
        target = folder / result_name(stem, tool)
        if target.exists() and not force:
            outcome.tools.append(ToolOutcome(tool, "skipped", target, "result exists, use --force"))
            continue
        code, out, err = invoke(tool, copy, timeout)
        if code != 0:
            outcome.tools.append(ToolOutcome(tool, "failed", None, _last_line(err)))
            continue
        try:
            text = out.decode("utf-8")
        except UnicodeDecodeError as exc:
            outcome.tools.append(ToolOutcome(tool, "failed", None, f"output is not UTF-8: {exc}"))
            continue
        _atomic_write(target, _normalize(text).encode("utf-8"))
        outcome.tools.append(ToolOutcome(tool, "written", target))

    expected = {copy.name} | {result_name(stem, t) for t in tools}
    for entry in sorted(folder.iterdir()):
        if entry.name not in expected and entry.suffix.lower() in RESULT_SUFFIXES:
            outcome.warnings.append(f"{entry.name} is not a result of this run; the comparison view will list it")

    if sha256(source) != before:
        raise SourceModifiedError(f"{source} changed during conversion")
    return outcome
