FROM node:20-alpine

# Build tools needed for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY index.js ./
RUN mkdir -p /app/data

EXPOSE 4000

CMD ["node", "index.js"]
