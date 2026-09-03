FROM node:20-bookworm-slim

WORKDIR /app

# Installo prima le dipendenze per sfruttare la cache Docker quando cambia solo il codice.
COPY package*.json ./
RUN npm ci

# Copio solo le parti necessarie al backend e agli script di import/verifica.
COPY server ./server
COPY scripts ./scripts

EXPOSE 3000

CMD ["npm", "run", "server"]
