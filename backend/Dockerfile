# =========================
# Build stage
# =========================
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files (bao gồm package-lock.json)
COPY package*.json ./

# Cài đầy đủ deps cho build
RUN npm ci

# Copy source & config
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript (FAIL nếu lỗi)
RUN npx tsc

# =========================
# Production stage
# =========================
FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Chỉ cài deps cần cho runtime
RUN npm ci --omit=dev && npm cache clean --force

# Copy code đã build
COPY --from=builder /app/dist ./dist

# Thư mục upload (nếu có)
RUN mkdir -p uploads/attachments

# Chạy bằng user không phải root (an toàn)
RUN addgroup -S app && adduser -S app -G app
USER app

# Expose port backend
EXPOSE 5001

# Healthcheck - check if server is responding (allow any status except connection errors)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001', r => process.exit(0)).on('error', e => process.exit(1))"

# Start app
CMD ["node", "dist/server.js"]
