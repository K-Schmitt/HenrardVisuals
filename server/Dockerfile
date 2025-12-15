FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["npm", "start"]
