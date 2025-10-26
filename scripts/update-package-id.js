#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read JSON from stdin
let input = '';

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const result = JSON.parse(input);

    // Extract package ID from published objects
    const publishedObjects = result.objectChanges?.filter(
      (obj) => obj.type === 'published'
    );

    if (!publishedObjects || publishedObjects.length === 0) {
      console.error('❌ No published objects found in transaction');
      process.exit(1);
    }

    const packageId = publishedObjects[0].packageId;

    if (!packageId) {
      console.error('❌ Could not extract package ID');
      process.exit(1);
    }

    console.log(`✅ Contract deployed successfully!`);
    console.log(`📦 Package ID: ${packageId}`);

    // Update .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Replace or add NEXT_PUBLIC_TIME_AUCTION_PACKAGE_ID
    const packageIdRegex = /^NEXT_PUBLIC_TIME_AUCTION_PACKAGE_ID=.*/m;
    const newLine = `NEXT_PUBLIC_TIME_AUCTION_PACKAGE_ID=${packageId}`;

    if (packageIdRegex.test(envContent)) {
      envContent = envContent.replace(packageIdRegex, newLine);
    } else {
      envContent += envContent.endsWith('\n') ? newLine + '\n' : '\n' + newLine + '\n';
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Updated .env.local with new package ID`);
    console.log(`\n🔄 Restart your dev server for changes to take effect`);

  } catch (error) {
    console.error('❌ Error parsing deployment output:', error.message);
    process.exit(1);
  }
});
