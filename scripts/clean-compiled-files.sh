#!/bin/bash

# Clean compiled files from repository
echo "🧹 Cleaning compiled JavaScript and TypeScript declaration files..."

# Find and remove all .js, .js.map, .d.ts, and .d.ts.map files in src directories
find . -type f \( -name "*.js" -o -name "*.js.map" -o -name "*.d.ts" -o -name "*.d.ts.map" \) \
  -path "*/src/*" \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -exec rm -f {} \;

echo "✅ Compiled files cleaned successfully!"

# Clean empty directories
find . -type d -empty -delete 2>/dev/null || true

echo "🎉 Cleanup complete!"