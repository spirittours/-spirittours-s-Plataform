#!/usr/bin/env python3
"""
Fix relative imports in API files to use absolute imports
"""

import os
import re
from pathlib import Path

def fix_imports_in_file(filepath):
    """Fix relative imports in a single file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Replace double-dot relative imports with absolute imports
    # from ..config.database -> from config.database
    content = re.sub(r'from \.\.(config|models|services|database|utils|auth)', 
                     r'from \1', content)
    
    # Replace single-dot relative imports if needed
    # from .something -> from api.something (for files in api/)
    if '/api/' in str(filepath):
        content = re.sub(r'from \.([\w_]+) import', 
                        r'from api.\1 import', content)
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed imports in: {filepath}")
        return True
    return False

def main():
    """Fix all import issues in backend"""
    backend_dir = Path('/home/user/webapp/backend')
    
    # Fix imports in all Python files in api directory
    api_dir = backend_dir / 'api'
    fixed_count = 0
    
    for py_file in api_dir.glob('*.py'):
        if fix_imports_in_file(py_file):
            fixed_count += 1
    
    print(f"\nTotal files fixed: {fixed_count}")

if __name__ == "__main__":
    main()