#!/bin/bash

# Ensure the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Error: This script must be run as root." >&2
  exit 1
fi

echo "Running as root. Bootstrapping environment..."

# Bootstrap environment files if they don't exist
if [ ! -f backend/.env ]; then
  echo "Creating backend/.env..."
  cp backend/.env.example backend/.env
fi

if [ ! -f frontend/.env ]; then
  echo "Creating frontend/.env..."
  cp frontend/.env.example frontend/.env
fi

# Run docker compose
echo "Starting docker compose..."
docker compose up --build
