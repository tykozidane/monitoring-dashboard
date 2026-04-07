# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Instal pnpm di dalam container
RUN npm install -g pnpm

# Copy file konfigurasi pnpm
COPY package.json pnpm-lock.yaml* ./

# Instal dependencies menggunakan pnpm
RUN pnpm install --frozen-lockfile

# Stage 2: Build aplikasi
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm run build

# Stage 3: Runner (Tetap sama seperti sebelumnya)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 4003
CMD ["npm", "start"]
