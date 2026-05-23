FROM node:22-slim

# Install OpenSSL for Prisma Client compatibility
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all packages including devDependencies for build time compilation
RUN npm install --include=dev

# Copy application source (includes .env for database credentials)
COPY . .

# Generate Prisma Client for PostgreSQL mapping
RUN npx prisma generate

# Run Vite static build and esbuild server bundler
RUN npm run build

# Env runtime settings
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Boot CRM web app
CMD ["npm", "run", "start"]
