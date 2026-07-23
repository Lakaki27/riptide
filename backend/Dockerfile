FROM node:26-alpine
WORKDIR /app
RUN apk add --no-cache python3 ffmpeg yt-dlp
COPY package*.json ./
RUN npm install
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]
