# ---- Build Stage ----
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source and build
COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# ---- Runtime Stage ----
FROM node:20-slim AS runtime

# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Run as non-root user for security
RUN addgroup --system --gid 1001 taskflow && \
    adduser --system --uid 1001 --ingroup taskflow taskflow

WORKDIR /app

# Copy only what's needed for production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY openapi.yaml ./openapi.yaml

# Switch to non-root user
USER taskflow

EXPOSE 3000

# Default command — overridden per service in docker-compose.yml
CMD ["node", "dist/server.js"]
