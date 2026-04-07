# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./

# Stage 2: Build aplikasi
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

# Ambil node_modules dari stage deps
COPY --from=deps /app/node_modules ./node_modules
# Sekarang copy SEMUA file (termasuk folder src)
COPY . .

# Sekarang jalankan build icons secara manual karena tadi di-ignore
# atau biarkan pnpm run build yang mengurusnya jika sudah masuk di script build
RUN pnpm run build:icons
RUN pnpm run build
