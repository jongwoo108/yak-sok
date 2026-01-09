# Frontend Dockerfile
FROM node:20-alpine

# Set work directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project
COPY . .

# Expose port
EXPOSE 3000

# Default command (development)
CMD ["npm", "run", "dev"]
