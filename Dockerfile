# Stage 1: Dependencies and Testing
FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

# Stage 2: Testing
FROM deps AS builder

COPY . .
RUN npm run lint && npm run test

# Stage 3: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN addgroup -S nodejs && adduser -S fragments -G nodejs

COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /root/.npm /root/.node-gyp /tmp/*

COPY --chown=fragments:nodejs src/ ./src/

USER fragments

EXPOSE 8080

# REMOVE HEALTHCHECK — ECS WILL HANDLE IT

CMD ["npm", "start"]
