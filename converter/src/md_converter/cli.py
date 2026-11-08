"""``md-converter convert <pdf|folder>... --out <root>`` and ``md-converter compare <pdf>``.

``convert`` writes the result folders. ``compare`` converts one PDF if its results are
missing, then opens a pre-filled comparison page in the default browser; it is what the
Finder quick action (macOS) and the "Send to" entry (Windows) call.

Exit codes: 0 every requested result is written or skipped, 1 at least one document or
tool failed, 2 usage error. ``convert`` prints written result paths to stdout (one per
line, for scripting), ``compare`` prints the page path; the per-tool report goes to stderr.
"""

from __future__ import annotations

import argparse
import os
import sys
import webbrowser
from collections.abc import Callable, Sequence
from pathlib import Path

from md_converter.compare_page import build_page, page_files, template_path, write_page
from md_converter.contract import doc_stem, is_pdf
from md_converter.runner import DEFAULT_TIMEOUT_S, DocOutcome, Invoke, convert_document, subprocess_invoke
from md_converter.tools import TOOLS

EXIT_OK = 0
EXIT_FAILED = 1
EXIT_USAGE = 2

Opener = Callable[[str], object]


def default_out_root() -> Path:
    """Where ``compare`` writes results when no ``--out`` is given."""
    return Path(os.environ.get("MD_CONVERTER_OUT", str(Path.home() / "md-converter")))


def _tool_list(value: str) -> list[str]:
    names = [n.strip() for n in value.split(",") if n.strip()]
    unknown = [n for n in names if n not in TOOLS]
    if not names or unknown:
        raise argparse.ArgumentTypeError(f"unknown tool(s) {', '.join(unknown) or '(none)'}; known: {', '.join(TOOLS)}")
    return list(dict.fromkeys(names))


def _common(p: argparse.ArgumentParser) -> None:
    p.add_argument("--tools", type=_tool_list, default=list(TOOLS), help=f"comma list, default {','.join(TOOLS)}")
    p.add_argument("--force", action="store_true", help="re-run tools whose result exists")
    p.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT_S, help="seconds per tool and PDF")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="md-converter",
        description="Convert PDFs to Markdown with local open-source tools, one result per tool.",
    )
    sub = parser.add_subparsers(dest="command", required=True)
    convert = sub.add_parser("convert", help="convert PDFs into <out>/<doc>/<doc>.<tool>.md")
    convert.add_argument("inputs", nargs="+", type=Path, help="PDF files or folders (top level)")
    convert.add_argument("--out", required=True, type=Path, help="output root, outside the sources")
    _common(convert)
    compare = sub.add_parser("compare", help="convert one PDF if needed and open it in the comparison view")
    compare.add_argument("pdf", type=Path, help="the PDF to compare")
    compare.add_argument(
        "--out", type=Path, default=None, help="output root, default $MD_CONVERTER_OUT or ~/md-converter"
    )
    compare.add_argument("--no-open", action="store_true", help="print the page path, do not open a browser")
    _common(compare)
    return parser


def _collect(inputs: Sequence[Path]) -> list[Path]:
    pdfs: list[Path] = []
    for item in inputs:
        if item.is_dir():
            pdfs.extend(sorted(p for p in item.iterdir() if p.is_file() and is_pdf(p)))
        elif item.is_file() and is_pdf(item):
            pdfs.append(item)
        else:
            raise FileNotFoundError(f"{item} is neither a PDF file nor a folder")
    return pdfs


def _report(pdf: Path, result: DocOutcome, *, print_paths: bool) -> bool:
    """Print the per-tool report; return True if anything failed."""
    if result.error:
        print(f"FAIL {pdf.name}: {result.error}", file=sys.stderr)
        return True
    failed = False
    for tool in result.tools:
        print(f"{tool.status.upper():7} {pdf.name} [{tool.tool}] {tool.reason}".rstrip(), file=sys.stderr)
        if print_paths and tool.status == "written" and tool.path is not None:
            print(tool.path)
        failed = failed or tool.status == "failed"
    for warning in result.warnings:
        print(f"WARN    {pdf.name}: {warning}", file=sys.stderr)
    return failed


def _run_convert(args: argparse.Namespace, invoke: Invoke) -> int:
    try:
        pdfs = _collect(args.inputs)
    except FileNotFoundError as exc:
        print(f"md-converter: {exc}", file=sys.stderr)
        return EXIT_USAGE
    if not pdfs:
        print("md-converter: no PDF found in the given inputs", file=sys.stderr)
        return EXIT_USAGE
    failed = False
    for pdf in pdfs:
        result = convert_document(pdf, args.out, args.tools, force=args.force, timeout=args.timeout, invoke=invoke)
        failed = _report(pdf, result, print_paths=True) or failed
    return EXIT_FAILED if failed else EXIT_OK


def _run_compare(args: argparse.Namespace, invoke: Invoke, opener: Opener) -> int:
    pdf: Path = args.pdf
    if not (pdf.is_file() and is_pdf(pdf)):
        print(f"md-converter: {pdf} is not a PDF file", file=sys.stderr)
        return EXIT_USAGE
    template = template_path()
    if not template.is_file():
        print(f"md-converter: comparison page not found at {template}; run md-viewer's build.sh", file=sys.stderr)
        return EXIT_USAGE
    out_root: Path = args.out or default_out_root()
    result = convert_document(pdf, out_root, args.tools, force=args.force, timeout=args.timeout, invoke=invoke)
    failed = _report(pdf, result, print_paths=False)
    if result.error or result.folder is None:
        return EXIT_FAILED
    files = page_files(result.folder, pdf.name)
    page = write_page(build_page(template.read_text(encoding="utf-8"), files), doc_stem(pdf))
    print(page)
    if not args.no_open:
        opener(page.as_uri())
    # A failed tool still opens the page with the results that exist; the exit code says it.
    return EXIT_FAILED if failed else EXIT_OK


def main(
    argv: Sequence[str] | None = None,
    invoke: Invoke = subprocess_invoke,
    opener: Opener = webbrowser.open,
) -> int:
    try:
        args = _parser().parse_args(argv)
    except SystemExit as exc:
        return EXIT_OK if exc.code == 0 else EXIT_USAGE
    if args.command == "compare":
        return _run_compare(args, invoke, opener)
    return _run_convert(args, invoke)


if __name__ == "__main__":
    raise SystemExit(main())
