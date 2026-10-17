# Medicine purchase invoice importer

**Scope:** preview and human-approved creation of medicine catalogue entries and batch-linked purchase receipts. No patient records or live prescriptions are modified by uploading a purchase invoice.

Supported input:
- PDF supplier invoices, including scanned PDFs if legible to the AI model.
- XLSX spreadsheets, including Tally/Marg exports saved as XLSX.
- CSV exports; old XLS must first be saved as XLSX.

The importer is flexible across invoice column layouts; it cannot guarantee every layout will be read perfectly. Low-confidence values and omissions need review.

## Configuration

Set OPENAI_API_KEY in the application service's Railway Variables. It is a separate API credential, not your ChatGPT subscription. OPENAI_INVOICE_MODEL is optional and defaults to gpt-4.1-mini.

Supplier invoice files are submitted to the OpenAI Responses API with store:false after a specific consent checkbox. File bytes are not stored in Durva's database; extracted drafts are encrypted. Review third-party data processing and retention requirements before deploying.

## Workflow

1. Sign in and open More -> Medicines in your clinic -> Import invoice.
2. Choose PDF/XLSX/CSV (maximum 15 MB); authorize external invoice processing.
3. The backend extracts all pages/sheets and saves a review draft. Batch, pack and expiry are not blindly trusted.
4. Edit medicine identity, strength, form, route, physical stock units, batch and expiry. Exclude unrelated items. Confirm each included line against the original document.
5. Approve. A transaction inserts medicines and receipts and increments stock, or rolls back if checks fail.
6. Prevent duplicate uploads by file hash and repeat supplier invoice numbers.
7. Reconcile existing medicines with unknown stock rather than silently overwriting the stock count.

**Important:** AI never selects medicine dosage or makes treatment decisions. The importer does not automatically subtract dispensed stock; dispensing and inventory reconciliation are separate work.

## Sample acceptance

The example Marg ERP invoice is four pages with 29 item lines and fractional boxes (0.5 x 1000) and standalone five-unit test cards. Automated tests cover fractional packages, strips, single-unit packs, no inferred strength/route and 29-row data preservation. A live extraction test against the example PDF still requires an API key and a dedicated staging database.

Do not merge/deploy to the live Durva clinic until real invoice extraction, authentication/isolation and the end-to-end browser workflow have been tested in staging.
