FROM oven/bun:1
# Local-only document extraction; no third-party OCR credentials or network calls.
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-eng && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN bun install --production
COPY src ./src
RUN bun test src/clinic-system.test.ts src/patient-registration.test.ts src/unified-ui.test.ts src/clinic-medicines.test.ts src/invoice-import.test.ts
RUN bun build ./src/console-invoice.js --target browser --outdir /tmp/durva-invoice-check
RUN bun build ./src/unified-views.js ./src/unified-consult.js ./src/unified.js --target browser --outdir /tmp/durva-ui-check
RUN bun build ./src/console.js --target browser --outdir /tmp/durva-console-check
ENV NODE_ENV=production
EXPOSE 3000
USER bun
CMD ["bun", "run", "src/main.ts"]
