# --- Stage 1: Build the React Frontend ---
FROM node:18-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend source code
COPY . .

# Build the frontend application
RUN npm run build

# --- Stage 2: Final Production Image ---
FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Install Nginx
RUN apt-get update && apt-get install -y nginx

# Copy the Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Copy the built frontend assets from the build stage
COPY --from=build /app/dist ./dist

# Copy only the backend requirements file first
COPY ./backend/requirements.txt ./backend/requirements.txt

# Install backend dependencies
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Now copy the rest of the backend code
COPY ./backend ./backend

# Expose the port Nginx will listen on
EXPOSE 8080

# Set the entrypoint to the startup script
ENTRYPOINT ["/start.sh"]
