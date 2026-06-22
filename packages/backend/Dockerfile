FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy configuration files
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./

# Copy packages
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

# Install dependencies (ignoring scripts)
RUN pnpm install --no-frozen-lockfile --prod=false

# Build packages
RUN pnpm --filter @mini-apty/shared build
RUN pnpm --filter @mini-apty/backend build

# Expose port
EXPOSE 3000

WORKDIR /app/packages/backend
CMD ["node", "dist/index.js"]
