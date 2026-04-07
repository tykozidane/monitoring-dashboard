# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
# Copy prisma schema agar bisa generate client
COPY prisma ./prisma/

RUN pnpm config set node-linker hoisted
RUN pnpm install --frozen-lockfile --ignore-scripts

# Stage 2: Build aplikasi
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client (Wajib karena ada dependensi @prisma/client)
RUN pnpm prisma generate

# Jalankan build
RUN pnpm run build:icons
RUN pnpm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Agar bisa diakses dari luar container
ENV HOSTNAME "0.0.0.0"
ENV PORT 4003

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose port sesuai script "start" di package.json
EXPOSE 4003

CMD ["npx", "pnpm", "start"]
