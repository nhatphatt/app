#!/usr/bin/env python3
"""
Script to remove all data-testid attributes from React components
"""
import re
import os
from pathlib import Path

def remove_testids_from_file(file_path):
    """Remove all data-testid attributes from a file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Pattern 1: data-testid="value" or data-testid='value'
        content = re.sub(r'\s+data-testid=(["\']).*?\1', '', content)

        # Pattern 2: data-testid={variable}
        content = re.sub(r'\s+data-testid=\{[^}]+\}', '', content)

        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    frontend_src = Path(r"D:\Minitake\app\frontend\src")

    files_to_clean = [
        "pages/CustomerMenu.js",
        "pages/admin/OrdersManagement.js",
        "components/AdminLayout.js",
        "pages/admin/TablesManagement.js",
        "pages/admin/MenuManagement.js",
        "pages/admin/StoreSettings.js",
        "pages/admin/AdminDashboard.js",
        "pages/admin/AdminLogin.js",
        "pages/admin/AdminRegister.js"
    ]

    cleaned_count = 0
    for file_rel_path in files_to_clean:
        file_path = frontend_src / file_rel_path
        if file_path.exists():
            if remove_testids_from_file(file_path):
                print(f"✓ Cleaned: {file_rel_path}")
                cleaned_count += 1
            else:
                print(f"- No changes: {file_rel_path}")
        else:
            print(f"✗ Not found: {file_rel_path}")

    print(f"\n✅ Cleaned {cleaned_count} files")

if __name__ == "__main__":
    main()
