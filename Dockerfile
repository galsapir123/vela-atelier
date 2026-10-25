FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY client ./client
COPY vite.config.js ./
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && mkdir -p server/data && chown -R node:node /app
COPY --chown=node:node server ./server
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3001
VOLUME ["/app/server/data"]
CMD ["node", "server/index.js"]
