FROM oven/bun:1
WORKDIR /app
COPY package.json ./
COPY src ./src
RUN bun test src/clinic-system.test.ts src/patient-registration.test.ts src/unified-ui.test.ts
RUN bun build ./src/unified-views.js ./src/unified-consult.js ./src/unified.js --target browser --outdir /tmp/durva-ui-check
RUN bun build ./src/console.js --target browser --outdir /tmp/durva-console-check
ENV NODE_ENV=production
EXPOSE 3000
USER bun
CMD ["bun", "run", "src/main.ts"]
