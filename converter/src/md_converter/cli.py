"""``md-converter convert <pdf|folder>... --out <root>``

Exit codes: 0 every requested result is written or skipped, 1 at least one document or
tool failed, 2 usage error. Written result paths go to stdout (one per line, for
scripting); the per-tool report goes to stderr.
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from pathlib import Path

from md_converter.contract import is_pdf
from md_converter.runner import DEFAULT_TIMEOUT_S, Invoke, convert_document, subprocess_invoke
from md_converter.tools import TOOLS

EXIT_OK = 0
EXIT_FAILED = 1
EXIT_USAGE = 2


def _tool_list(value: str) -> list[str]:
    names = [n.strip() for n in value.split(",") if n.strip()]
    unknown = [n for n in names if n not in TOOLS]
    if not names or unknown:
        raise argparse.ArgumentTypeError(f"unknown tool(s) {', '.join(unknown) or '(none)'}; known: {', '.join(TOOLS)}")
    return list(dict.fromkeys(names))


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="md-converter",
        description="Convert PDFs to Markdown with local open-source tools, one result per tool.",
    )
    sub = parser.add_subparsers(dest="command", required=True)
    convert = sub.add_parser("convert", help="convert PDFs into <out>/<doc>/<doc>.<tool>.md")
    convert.add_argument("inputs", nargs="+", type=Path, help="PDF files or folders (top level)")
    convert.add_argument("--out", required=True, type=Path, help="output root, outside the sources")
    convert.add_argument("--tools", type=_tool_list, default=list(TOOLS), help=f"comma list, default {','.join(TOOLS)}")
    convert.add_argument("--force", action="store_true", help="re-run tools whose result exists")
    convert.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT_S, help="seconds per tool and PDF")
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


def main(argv: Sequence[str] | None = None, invoke: Invoke = subprocess_invoke) -> int:
    try:
        args = _parser().parse_args(argv)
    except SystemExit as exc:
        return EXIT_OK if exc.code == 0 else EXIT_USAGE
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
        if result.error:
            failed = True
            print(f"FAIL {pdf.name}: {result.error}", file=sys.stderr)
            continue
        for tool in result.tools:
            print(f"{tool.status.upper():7} {pdf.name} [{tool.tool}] {tool.reason}".rstrip(), file=sys.stderr)
            if tool.status == "written" and tool.path is not None:
                print(tool.path)
            failed = failed or tool.status == "failed"
        for warning in result.warnings:
            print(f"WARN    {pdf.name}: {warning}", file=sys.stderr)
    return EXIT_FAILED if failed else EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
