"""Subprocess entry point: ``python -m md_converter.worker <tool> <pdf>``.

Writes the Markdown as UTF-8 to stdout and exits 0, or writes the reason to stderr and
exits non-zero. One tool, one PDF, one process: the memory a converter allocates is
returned to the system when the process ends, and a crash in one tool cannot take the
other tool's result with it.
"""

from __future__ import annotations

import sys
from pathlib import Path

from md_converter.tools import TOOLS

EXIT_OK = 0
EXIT_FAILED = 1
EXIT_USAGE = 2


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[0] not in TOOLS:
        print(f"usage: worker <{'|'.join(TOOLS)}> <pdf>", file=sys.stderr)
        return EXIT_USAGE
    tool, pdf = argv[0], Path(argv[1])
    try:
        text = TOOLS[tool](pdf)
    except Exception as exc:  # noqa: BLE001 — any converter failure is a failed result
        print(f"{tool}: {type(exc).__name__}: {exc}", file=sys.stderr)
        return EXIT_FAILED
    sys.stdout.buffer.write(text.encode("utf-8"))
    sys.stdout.buffer.flush()
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
