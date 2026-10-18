# Medicine purchase invoice import — offline OCR

**No OpenAI or Sarvam API key is required. No document is sent to a cloud AI provider.**

## Supported formats

- PDFs with embedded text: Poppler `pdftotext -layout` extracts rows locally
- Scanned/image-only PDFs: Poppler renders each page locally; Tesseract OCR reads it
- XLSX and CSV: read directly with spreadsheet column mapping, no OCR or AI
- Legacy XLS: export as XLSX first
- Maximum 15 MB and 15 PDF pages per upload

The software does **not** understand every supplier layout perfectly. Text-based Marg-format invoices with explicit item numbers, packs, quantities and GST columns are parsed using positional rules. For other PDFs the fallback is best-effort and may fail safely; Excel/CSV requires recognizable medicine and quantity headings. Missing/low-confidence fields require manual correction before any stock changes.

## Safety and privacy

Upload through authenticated clinic session. PDF pages and images are processed on the application server using temporary files that are removed after extraction; original files aren't saved to the database. Only encrypted review drafts and audited receipts are retained. Import must never be mistaken for a clinical prescription.

In **More → Medicines → Import invoice**, verify name, strength, form, route, pack conversion, quantity, batch, expiry and existing matches against the original. Approve each selected line. Medicine stock changes occur atomically only after confirmation. Duplicate file and supplier+invoice-number imports are blocked. Existing medicines with unknown starting stock must first be reconciled. Batch and expiry are stored with receipt metadata, not tracked as independently dispensable stock yet.

## Deployment

The Docker image installs `poppler-utils`, `tesseract-ocr` and `tesseract-ocr-eng`; bun and the existing ExcelJS dependency remain. No new secrets or API keys are needed. Some scanned PDFs can take significantly longer and may require corrections.

## Acceptance

Your example Marg ERP invoice has 29 line items across four pages, including half of a 1×1000 pack = 500 units, 20×10 = 200 and five standalone test cards = 5. Local parser tests cover table layouts and pack arithmetic; PDF extraction is best-effort. Test an authenticated upload of the real sample in isolated staging before merging this pull request into the live clinic.
