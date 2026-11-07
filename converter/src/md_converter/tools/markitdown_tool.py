"""MarkItDown (MIT), PDF converter only.

Called through ``PdfConverter`` directly, not through ``MarkItDown().convert()``.
Measured 2026-11-07: the generic entry point, given a damaged PDF, falls back to a
plain-text converter and returns the raw file bytes as "Markdown" (``%PDF-1.4 ...``)
with no error. The direct converter raises instead. No plugins, no LLM client, no
Azure Document Intelligence: nothing here reads a key or calls a paid service.
"""

from __future__ import annotations

from pathlib import Path


def convert(pdf: Path) -> str:
    from markitdown import StreamInfo
    from markitdown.converters import PdfConverter

    with pdf.open("rb") as stream:
        result = PdfConverter().convert(stream, StreamInfo(extension=".pdf", mimetype="application/pdf"))
    return str(result.markdown)
