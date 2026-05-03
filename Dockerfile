FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/

FROM base AS deps
RUN npm ci --ignore-scripts

FROM deps AS build-shared
COPY packages/shared/ ./packages/shared/
RUN npm run build -w packages/shared

FROM build-shared AS build-server
COPY packages/server/ ./packages/server/
RUN npm run build -w packages/server

FROM build-shared AS build-client
COPY packages/client/ ./packages/client/
RUN npm run build -w packages/client

FROM node:20-alpine
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser
WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/
RUN npm ci --omit=dev --ignore-scripts && chown -R appuser:appgroup /app

COPY --from=build-shared /app/packages/shared/dist/ ./packages/shared/dist/
COPY --from=build-server /app/packages/server/dist/ ./packages/server/dist/
COPY --from=build-server /app/packages/server/src/ai/prompts/ ./packages/server/dist/ai/prompts/
COPY --from=build-client /app/packages/client/dist/ ./packages/client/dist/

USER appuser
ENV DASHBOARD_PORT=8080
EXPOSE 8080
CMD ["node", "packages/server/dist/serve.js"]
