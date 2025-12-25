# ==================================
# Build stage - Build React app
# ==================================
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy all source code and config files
COPY . .

# Build React app (Vite)
RUN npm run build

# ==================================
# Run stage - Serve with NGINX
# ==================================
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/dist /etc/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

