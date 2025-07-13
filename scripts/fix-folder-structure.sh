#!/bin/bash

# Fix duplicate folder structures in microservices

echo "🔧 Fixing duplicate folder structures in microservices..."

# Function to fix duplicate folder structure
fix_duplicate_structure() {
    local service_path=$1
    local service_name=$(basename "$service_path")
    
    # Check if duplicate folder exists
    if [ -d "$service_path/$service_name" ]; then
        echo "📁 Fixing: $service_path/$service_name"
        
        # Move contents up one level
        if [ "$(ls -A "$service_path/$service_name")" ]; then
            mv "$service_path/$service_name"/* "$service_path/" 2>/dev/null || true
            mv "$service_path/$service_name"/.[^.]* "$service_path/" 2>/dev/null || true
        fi
        
        # Remove empty duplicate folder
        rmdir "$service_path/$service_name" 2>/dev/null || true
        
        echo "✅ Fixed: $service_path"
    fi
}

# Find all microservices with potential duplicate structures
for category in microservices/*; do
    if [ -d "$category" ]; then
        for service in "$category"/*; do
            if [ -d "$service" ]; then
                fix_duplicate_structure "$service"
            fi
        done
    fi
done

echo ""
echo "🎯 Checking for remaining issues..."

# Check for any remaining duplicate structures
duplicates_found=0
for category in microservices/*; do
    if [ -d "$category" ]; then
        for service in "$category"/*; do
            if [ -d "$service" ]; then
                service_name=$(basename "$service")
                if [ -d "$service/$service_name" ]; then
                    echo "⚠️  Still has duplicate structure: $service/$service_name"
                    duplicates_found=1
                fi
            fi
        done
    fi
done

if [ $duplicates_found -eq 0 ]; then
    echo "✅ All duplicate folder structures have been fixed!"
else
    echo "❌ Some duplicate structures remain. Please check manually."
fi