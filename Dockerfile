# -----------------------------
# Stage 1: Install Dependencies
# -----------------------------
FROM node:20-alpine AS deps

# Set working directory
WORKDIR /app

# Install build tools required for node-gyp
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# -----------------------------
# Stage 2: Build & Test
# -----------------------------
FROM deps AS builder

# Copy full source code
COPY . .

# Run linting and unit tests
RUN npm run lint && npm test

# -----------------------------
# Stage 3: Production Image
# -----------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user
RUN addgroup -S nodejs && adduser -S fragments -G nodejs

# Copy only package files first to install prod deps
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /root/.npm /root/.node-gyp /tmp/*

# Copy source code with proper ownership
COPY --chown=fragments:nodejs src/ ./src/

# Switch to non-root user
USER fragments

# Expose port
EXPOSE 8080

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# Start the application
CMD ["npm", "start"]
