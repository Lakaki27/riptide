FROM node:26
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 ffmpeg && rm -rf /var/lib/apt/lists/*
RUN pip3 install --break-system-packages yt-dlp || (apt-get update && apt-get install -y --no-install-recommends yt-dlp)
COPY package*.json ./
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "dev"]
