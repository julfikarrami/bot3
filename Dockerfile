FROM node:22-bullseye
RUN apt-get update && apt-get install -y chromium
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV WWEBJS_AUTH_DIR=/app/.wwebjs_auth
CMD ["node", "index.js"]
