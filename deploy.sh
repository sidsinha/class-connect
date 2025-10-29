#!/bin/bash

echo "🚀 ClassConnect - App Store Deployment Script"
echo "=============================================="
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if user is logged in to Expo
echo "🔐 Checking Expo login status..."
if ! eas whoami &> /dev/null; then
    echo "📝 Please login to Expo:"
    npx expo login
fi

echo ""
echo "📋 Deployment Checklist:"
echo "1. ✅ EAS CLI installed"
echo "2. ✅ App configuration updated"
echo "3. ⏳ Next steps:"
echo ""

echo "🎯 Next Steps:"
echo "1. Create app icons (see APP_STORE_DEPLOYMENT_GUIDE.md)"
echo "2. Run: eas init"
echo "3. Run: eas build:configure"
echo "4. Run: eas build --platform ios --profile production"
echo "5. Run: eas submit --platform ios"
echo ""

echo "📖 For detailed instructions, see: APP_STORE_DEPLOYMENT_GUIDE.md"
echo ""

# Ask if user wants to start the process
read -p "Do you want to start the EAS initialization? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting EAS initialization..."
    eas init
    echo ""
    echo "✅ EAS initialized! Next:"
    echo "   eas build:configure"
    echo "   eas build --platform ios --profile production"
else
    echo "⏸️  Skipped EAS initialization. Run 'eas init' when ready."
fi

echo ""
echo "🎉 Setup complete! Check APP_STORE_DEPLOYMENT_GUIDE.md for full instructions."
