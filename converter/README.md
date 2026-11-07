# md-converter

Turns PDFs into Markdown with local open-source converters, one result per tool, laid out
so the md-viewer [comparison view](https://md.neckarshore.ai/compare) can show them next to
the original. It is a separate program from the viewer: the viewer only displays.

No paid service, no API key, no LLM. Everything runs on your machine.

## Install

Needs [uv](https://docs.astral.sh/uv/). From this folder:

```bash
uv sync --extra docling   # MarkItDown + Docling (Docling brings torch, about 1.3 GB)
uv sync                   # MarkItDown only
```

Docling downloads its layout models (about 0.8 GB, Apache-2.0 and CDLA-Permissive-2.0) from
Hugging Face on its first run, into `~/.cache/huggingface`. Free, but network traffic: run one
conversion while online before you work offline.

## Use

```bash
uv run md-converter convert ~/PDFs/report.pdf --out ~/converted
uv run md-converter convert ~/PDFs --out ~/converted --tools markitdown
```

Result, one folder per document:

```text
~/converted/report/
  report.pdf              a verified copy; the original is never written
  report.markitdown.md
  report.docling.md
```

Open the folder's files in md.neckarshore.ai/compare.

| # | Option | Meaning |
|---|--------|---------|
| 1 | `--force` | Re-run a tool whose result already exists (default: skip it). |
| 2 | `--out` | Output root. Refused if it lies inside the source folder. |
| 3 | `--timeout` | Seconds per tool and PDF, default 1800. |
| 4 | `--tools` | Comma list, default `markitdown,docling`. |

Exit codes: `0` all results written or skipped, `1` a document or tool failed, `2` usage error.
Written paths go to stdout, the per-tool report to stderr.

## What you get in each case

| # | PDF | Result file |
|---|-----|-------------|
| 1 | Has a text layer | Markdown of the text |
| 2 | No text layer (a scan) | Empty file; the view says "No text layer, OCR not available". Neither tool does OCR. |
| 3 | Damaged, encrypted or not a PDF | No folder, exit 1, reason on stderr |
| 4 | A tool crashes or times out | No file for that tool, the other tool's result stays, exit 1 |

Case 4 writes nothing on purpose: an empty file would show a crash as "no text layer".

## The converters

| # | Tool | Version | Licence | Measured on M2mini (8 GB), 2026-11-07 |
|---|------|---------|---------|----------------------------------------|
| 1 | [Docling](https://github.com/docling-project/docling), pypdfium backend, OCR off | 2.148.0 | MIT | 39-page text PDF: 19 s, 0.85 GB; table-heavy 15-page paper: 23 s, 1.0 GB |
| 2 | [MarkItDown](https://github.com/microsoft/markitdown) | 0.1.9 | MIT | 39-page text PDF: 4 s, 0.17 GB peak |

Each tool runs in its own subprocess per PDF, so Docling's memory is released after every
document. The full transitive dependency graph is permissive (MIT, BSD, Apache-2.0, PSF,
ISC; MPL-2.0 for certifi, pathspec and tqdm, used unmodified). Check with
`uv run pip-licenses --from=mixed --summary`.

Adding a converter: one module in `src/md_converter/tools/` and one line in its `TOOLS`
registry. The view needs no change, it reads the label from the filename.

## Develop

```bash
uv run ruff check . && uv run ruff format --check .
uv run mypy
uv run pytest                 # unit + real MarkItDown, as in CI
uv run pytest heavy_tests     # real Docling, local only (needs --extra docling)
scripts/fetch-corpus.sh ~/pdf-corpus   # public evaluation PDFs, hash-verified, not committed
```

Design and decisions: [docs/plan.md](docs/plan.md).
