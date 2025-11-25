# File Location: chat-dashboard/Dockerfile

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all frontend files
COPY . .

# Expose port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev", "--", "--host"]