FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY mobile/package.json mobile/package.json
RUN npm ci --omit=dev --workspace @alltag/server --ignore-scripts && mkdir -p /app/server/data && chown -R node:node /app
COPY --chown=node:node server/src server/src
USER node
WORKDIR /app/server
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "src/index.mjs"]
