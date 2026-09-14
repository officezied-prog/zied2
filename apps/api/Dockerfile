FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/
RUN npm install --omit=dev --no-audit --no-fund
COPY apps ./apps
ENV PORT=8787 NODE_ENV=production RABITH_DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8787
CMD ["node", "apps/api/src/server.js"]
