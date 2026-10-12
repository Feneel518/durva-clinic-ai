# Durva Clinic — General OPD & AI Scribe

Mobile-first outpatient clinic management for Durva Clinic, deployed on Railway with PostgreSQL and Sarvam Gujarati/Hindi/English transcription. No credentials or patient records are committed to GitHub.

## One unified clinic workspace

- **Default console (all workflows):** https://durva-clinic-production-production.up.railway.app/
- Alternative link to the same console: https://durva-clinic-production-production.up.railway.app/clinic
- Previous unified interface (recovery only): https://durva-clinic-production-production.up.railway.app/classic
- Older transcription screen (recovery only): https://durva-clinic-production-production.up.railway.app/legacy

The default console combines patient lookup, consented multilingual voice registration, AI consultation dictation, doctor-controlled documentation, vitals, prescriptions, consultation billing, and follow-up scheduling without switching applications. It uses the **same authenticated account** and Railway database.

The design prioritizes clinical speed over animation: primary actions are visually prominent; repetitive actions are short; signed medications require explicit clinician review. The five-minute workflow is a design target, not a clinical time limit or service guarantee.

## Daily clinic workflow

1. **Settings**: configure the clinic name, treating clinician’s name and actual medical registration number, address, phone, and default consultation charge.
2. **Patient arrival**: search name, mobile number or patient ID in **Patients**. For new patients, open voice registration, obtain consent, dictate patient details and verify the populated fields before saving.
3. **OPD queue**: select the patient; book a future appointment or add an immediate walk-in. Change status through scheduled, waiting, in consultation and completed.
4. **Vitals and assessment**: record actual measured BP, pulse, temperature, SpO₂, weight, height, RBS and respiratory rate; enter patient history, examination, investigations and clinical plan.
5. **Consultation scribe**: tap AI Scribe after starting consultation to transcribe consented Gujarati/Hindi/English conversation. The doctor must correct and review AI notes.
6. **Prescription**: the licensed treating clinician manually enters diagnosis, investigations, medicine name, strength, route, frequency, duration, instructions and advice. Save the draft, check every entry, then sign and print the locked prescription.
7. **Billing**: create an itemized bill; record cash, UPI, card or bank payments. Partial payments are supported. Print receipt.
8. **Follow-ups**: set a review date and reason, then see pending follow-ups in the register.
9. **Daily report**: review OPD volumes, bills and collections, separately reconciling finances with the accountant.

## Included modules

- Patient master and search; multilingual voice patient registration.
- Appointments, walk-in queue, visit state transitions and patient encounter history.
- Clinical observations and vitals, existing AI consultation notes.
- Doctor-reviewed prescription drafting, signing and printable format.
- Itemized invoices, payment capture and receipts.
- Follow-up register, clinician/clinic configuration, OPD and financial summary.
- Basic write audit events.

## Not yet included

- Pharmacy inventory/dispensing and supplier purchasing.
- Lab integrations and imaging uploads.
- Automated patient WhatsApp/SMS reminders.
- Staff, receptionist and multiple-doctor permission isolation.
- Validated disaster recovery, full production privacy/security/regulatory review.

## Privacy and clinical use

- No patient data or keys are stored in this repository.
- Clinic patient and clinical fields are application-encrypted at rest; backups, access auditing, secrets management and retention require operational verification.
- Obtain explicit consent before sending voice recordings to Sarvam. Review applicable Indian patient privacy and records requirements.
- A registered practitioner must examine the patient, make all clinical decisions and sign prescriptions. AI output is a draft, not an independent diagnosis or medication order.
- Test all workflows with fictional patients before using real patient data.
- Change this repository’s visibility to PRIVATE. Maintain secure clinic devices, backups, patient consent and staff access controls before clinical rollout.

## Software deployment

- GitHub main branch automatically deploys to Railway durva-clinic-production.
- Dockerfile runs the Bun unit tests before building the production image.
- Railway pre-deploy smoke test checks the live server, app assets, protected endpoints, PostgreSQL OPD schema and Sarvam connectivity.
- Do not substitute a production database for a test database.

Useful files: src/clinic-system.ts, src/clinic-browser.js, src/clinic-system.test.ts, src/main.ts.
