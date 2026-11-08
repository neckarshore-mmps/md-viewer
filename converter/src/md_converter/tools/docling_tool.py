"""Docling (MIT), local, OCR off.

Backend: pypdfium. Measured on the M2mini (8 GB) on 2026-11-07 with a 39-page text PDF,
warm model cache: pypdfium 19 s at 0.85 GB peak RSS, the default docling-parse backend
23 s at 1.5 GB. Same output length, half the memory, which matters for the planned move
to a smaller machine. OCR stays off: a PDF without a text layer yields empty output,
which the comparison view shows as "No text layer, OCR not available".
"""

from __future__ import annotations

from pathlib import Path


def convert(pdf: Path) -> str:
    try:
        import docling  # noqa: F401
    except ImportError as exc:
        raise RuntimeError("docling is not installed; run `uv sync --extra docling`") from exc
    from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import DocumentConverter, PdfFormatOption

    options = PdfPipelineOptions(do_ocr=False)
    converter = DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options, backend=PyPdfiumDocumentBackend)}
    )
    # raises_on_error defaults to True: a failed conversion is an exception, never a
    # silently empty document.
    result = converter.convert(pdf)
    return str(result.document.export_to_markdown())
