FROM oven/bun:1
WORKDIR /app
COPY package.json ./
COPY src ./src
ENV NODE_ENV=production
EXPOSE 3000
USER bun
CMD ["bun", "run", "src/main.ts"]
