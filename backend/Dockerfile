FROM node:26-alpine
WORKDIR /app
RUN apk add --no-cache python3 py3-pip ffmpeg
RUN pip install --break-system-packages --no-cache-dir -U yt-dlp
COPY package*.json ./
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "dev"]
