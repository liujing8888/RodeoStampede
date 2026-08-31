FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/var/data

COPY package.json server.js ./
COPY index.html ./index.html
COPY css ./css
COPY js ./js
COPY assets ./assets
COPY data ./data

EXPOSE 8080

CMD ["node", "server.js"]