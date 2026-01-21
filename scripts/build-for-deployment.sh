#!/bin/bash

# Billoo Travel Management System - Deployment Builder
# This script builds both frontend and backend for production deployment

echo "🚀 Building Billoo Travel Management System for Deployment..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf deploy-package/backend-deploy.zip
rm -rf deploy-package/frontend-deploy.zip
rm -rf deploy-package/backend-deploy/*
rm -rf deploy-package/frontend-deploy/*

# Build Backend
echo "📦 Building Backend..."
cd backend
npm install --production
npm run build

# Copy backend files
echo "📋 Copying backend files..."
mkdir -p ../deploy-package/backend-deploy
cp -r dist ../deploy-package/backend-deploy/
cp package.json ../deploy-package/backend-deploy/
cp .env.example ../deploy-package/backend-deploy/

# Build Frontend
echo "🎨 Building Frontend..."
cd ../frontend
npm install
npm run build

# Copy frontend files
echo "📋 Copying frontend files..."
mkdir -p ../deploy-package/frontend-deploy
cp -r dist/* ../deploy-package/frontend-deploy/

# Create .htaccess for frontend
cat > ../deploy-package/frontend-deploy/.htaccess << 'EOF'
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# API Proxy
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]

# React Router
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
EOF

# Create deployment ZIPs
echo "🗜️  Creating deployment packages..."
cd ../deploy-package
zip -r backend-deploy.zip backend-deploy/
zip -r frontend-deploy.zip frontend-deploy/

echo "✅ Deployment packages created successfully!"
echo ""
echo "📦 Files ready for upload:"
echo "  - deploy-package/backend-deploy.zip"
echo "  - deploy-package/frontend-deploy.zip"
echo ""
echo "📝 Next steps:"
echo "  1. Download these ZIP files"
echo "  2. Upload to your Namecheap server"
echo "  3. Extract in appropriate folders"
echo "  4. Restart Node.js app (backend only)"
echo ""
echo "🎉 Happy deploying!"
