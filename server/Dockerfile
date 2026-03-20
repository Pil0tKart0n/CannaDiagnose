FROM node:20-alpine AS builder

# Build tools needed for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

# ── Runtime stage (no build tools) ──
FROM node:20-alpine

WORKDIR /app

# Copy only production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY index.js ./
COPY prompts.js ./
COPY fertilizers.js ./
COPY admin.html ./

RUN mkdir -p /app/data && \
    addgroup -S leafscan && \
    adduser -S leafscan -G leafscan && \
    chown -R leafscan:leafscan /app

USER leafscan

EXPOSE 4000

CMD ["node", "index.js"]
