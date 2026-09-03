FROM node:20-bookworm-slim

WORKDIR /app

# Installo le dipendenze del frontend usando il lock file dedicato al client.
COPY package*.json ./
RUN npm ci

COPY index.html ./
COPY vite.config.js ./
COPY src ./src

EXPOSE 5173

CMD ["npm", "run", "dev"]
