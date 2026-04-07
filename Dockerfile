

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

# Copy file konfigurasi pnpm
COPY package.json pnpm-lock.yaml* ./

# PENTING: Set config agar pnpm tidak pakai symlink (bikin node_modules fisik)
RUN pnpm config set node-linker hoisted
RUN pnpm install --frozen-lockfile --ignore-scripts

# Stage 2: Build aplikasi
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

# Copy node_modules dari stage deps
COPY --from=deps /app/node_modules ./node_modules
# Copy semua source code
COPY . .

# Jalankan build icons dan build aplikasi
RUN pnpm run build:icons
RUN pnpm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Copy hasil build saja
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 4003
CMD ["pnpm", "start"]
