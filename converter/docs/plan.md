# md-converter — plan and decisions

Planned and built by Bob on 2026-11-07, on the Founder's work order: md-viewer only
displays, conversion is its own program; plan first, zero cost, no paid AI API.

## Contract with the comparison view

| # | Rule | Where it is enforced |
|---|------|----------------------|
| 1 | One output per tool, `<doc>.<tool>.md`, next to `<doc>.pdf` | `contract.result_name`, `runner.convert_document` |
| 2 | UTF-8 Markdown; a plain-text reference is `<doc>.<tool>.txt` | worker writes UTF-8; non-UTF-8 output is a failure |
| 3 | No text layer -> empty file (or only `<!-- image -->`), never a crash | `runner._normalize`; integration tests |
| 4 | The folder holds only the PDF and its results | one folder per document; `.partial` temp names; foreign `.md/.txt` reported |
| 5 | The original PDF stays unchanged | sha256 before and after (hard error); tools read a verified copy; output inside the source folder refused |

## Founder decisions (2026-11-07)

| # | Question | Decision |
|---|----------|----------|
| 1 | CLI or Claude skill | CLI. A skill can wrap it later. |
| 2 | Machine | Develop on the M2mini; move to the M1 or the Hostinger VPS later. |
| 3 | Repository | A `converter/` package inside md-viewer, not its own repo: the file contract is the one interface between the two programs and lives in one place. |
| 4 | Damaged PDF or tool crash | No result file, exit code not 0, reason on stderr. |

## Measurements behind the choices

M2mini, 8 GB RAM, macOS 27.2, `/usr/bin/time -l`, warm model cache:

| # | Run | Time | Peak RSS |
|---|-----|------|----------|
| 1 | Docling, default backend, 39-page text PDF | 23 s | 1.5 GB |
| 2 | Docling, pypdfium backend, same PDF | 19 s | 0.85 GB |
| 3 | Docling, pypdfium, arXiv 2408.09869v5 (9 table rows) | 18 s | 1.0 GB |
| 4 | Docling, pypdfium, arXiv 1706.03762v7 (54 table rows) | 23 s | 1.0 GB |
| 5 | MarkItDown, 39-page text PDF | 4 s | 0.17 GB |

Rows 3 and 4 are measured through `uv run`; the figure is the largest child process.

Consequences: Docling uses the pypdfium backend (half the memory, same output length). The
6.2 GB peak quoted in the research did not reproduce on these documents.

## Two findings that shaped the code

1. MarkItDown's generic `MarkItDown().convert()` returned the raw bytes of a damaged PDF as
   "Markdown" with no error (a fallback to its plain-text converter). The tool calls
   `PdfConverter` directly, and a pypdfium2 preflight rejects unreadable PDFs before any
   tool runs. Both layers are covered by tests that were made to fail on purpose.
2. Docling pulls torch, and on Linux 15 NVIDIA CUDA packages (`uv.lock`). It is an optional
   extra; CI runs MarkItDown only, Docling tests live in `heavy_tests/` and run locally.

## Not built yet

| # | Item | Condition |
|---|------|-----------|
| 1 | `<doc>.paperless.txt`, the OCR text from Paperless as a reference (API field `content`, read-only) | The Founder releases access to his archive |
| 2 | Move to the M1 or the Hostinger VPS | Measure that machine's RAM first; on the VPS the documents leave the house, which is a GDPR question for Dr. Sommer before real documents run there |
| 3 | OCR for scans (for example Docling with an OCR engine) | Not asked for; would change contract rule 3 |
| 4 | A claude skill wrapping the CLI | If calling it from a session is wanted |
