FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache sqlite
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/ ./dist/
COPY src/dashboard/public/ ./dist/dashboard/public/
RUN mkdir -p /data
VOLUME ["/data"]
ENV DB_PATH=/data/monitor.db
ENV DASHBOARD_PORT=8080
EXPOSE 8080
CMD ["node", "dist/serve.js"]
