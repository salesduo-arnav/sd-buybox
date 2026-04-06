# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production

# Copy built code
COPY --from=builder /app/dist ./dist
# Copy migration files
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/config ./config
COPY --from=builder /app/.sequelizerc .

RUN mkdir -p /app/logs && chown -R node:node /app/logs

USER node
EXPOSE 5003
CMD ["npm", "start"]
