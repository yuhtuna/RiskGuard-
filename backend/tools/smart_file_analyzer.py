"""
Smart file analyzer that prioritizes important files for security scanning.
Reduces token usage by focusing on high-risk areas.
"""
import os
from typing import List, Dict, Set
import re


def get_file_priority_score(file_path: str, file_name: str) -> int:
    """
    Calculate priority score for a file (higher = more important to scan).
    """
    score = 0
    
    # High-risk file types
    high_risk_patterns = {
        'auth': 10, 'login': 10, 'password': 10, 'session': 8,
        'admin': 9, 'user': 7, 'api': 8, 'database': 9, 'db': 8,
        'config': 7, 'security': 9, 'crypto': 8, 'token': 8,
        'payment': 10, 'checkout': 9, 'order': 7,
        'upload': 8, 'download': 7, 'file': 6,
        'query': 8, 'sql': 9, 'exec': 8, 'eval': 9,
        'router': 6, 'controller': 7, 'handler': 6, 'middleware': 7
    }
    
    file_lower = file_name.lower()
    for pattern, points in high_risk_patterns.items():
        if pattern in file_lower:
            score += points
    
    # File extension priorities
    ext_priorities = {
        '.php': 8,      # Often vulnerable
        '.jsp': 8,
        '.asp': 8,
        '.aspx': 8,
        '.py': 7,       # Common backend
        '.java': 7,
        '.js': 6,       # Frontend/Node
        '.ts': 6,
        '.go': 7,
        '.rb': 7,
        '.cs': 7,
        '.c': 5,
        '.cpp': 5,
        '.sql': 9,      # Database
        '.xml': 5,
        '.json': 4,
        '.yaml': 4,
        '.yml': 4,
    }
    
    for ext, points in ext_priorities.items():
        if file_name.endswith(ext):
            score += points
            break
    
    # Bonus for files in important directories
    if 'api/' in file_path or '/api/' in file_path:
        score += 5
    if 'auth' in file_path or 'security' in file_path:
        score += 6
    if 'admin' in file_path:
        score += 5
    if 'model' in file_path or 'dao' in file_path:
        score += 4
    
    # Penalty for test/example files
    if 'test' in file_lower or 'example' in file_lower or 'sample' in file_lower:
        score = max(0, score - 10)
    
    return score


def find_related_imports(file_content: str, file_extension: str) -> Set[str]:
    """
    Extract imported/required files from source code.
    """
    imports = set()
    
    # Python imports
    if file_extension in ['.py']:
        # from X import Y or import X
        import_pattern = r'(?:from\s+[\w.]+\s+)?import\s+([\w.]+)'
        matches = re.findall(import_pattern, file_content)
        imports.update(matches)
    
    # JavaScript/TypeScript imports
    elif file_extension in ['.js', '.ts', '.jsx', '.tsx']:
        # import X from 'Y' or require('Y')
        import_pattern = r'(?:import\s+.*?from\s+|require\s*\(\s*)["\'](.+?)["\']'
        matches = re.findall(import_pattern, file_content)
        imports.update(matches)
    
    # PHP includes
    elif file_extension == '.php':
        # include/require
        include_pattern = r'(?:include|require)(?:_once)?\s*\(?["\'](.+?)["\']'
        matches = re.findall(include_pattern, file_content)
        imports.update(matches)
    
    # Java imports
    elif file_extension == '.java':
        import_pattern = r'import\s+([\w.]+)'
        matches = re.findall(import_pattern, file_content)
        imports.update(matches)
    
    return imports


def select_files_for_scanning(
    local_repo_path: str,
    max_files: int = 20,
    max_total_size_kb: int = 500
) -> List[Dict[str, any]]:
    """
    Intelligently select the most important files to scan.
    
    Args:
        local_repo_path: Path to the repository
        max_files: Maximum number of files to return
        max_total_size_kb: Maximum total size of files in KB
        
    Returns:
        List of dicts with 'path', 'relative_path', 'priority', 'size_kb'
    """
    code_extensions = ['.py', '.js', '.ts', '.java', '.php', '.go', '.rb', '.cs', 
                      '.cpp', '.c', '.jsx', '.tsx', '.jsp', '.asp', '.aspx']
    
    files_with_priority = []
    
    for root, dirs, files in os.walk(local_repo_path):
        # Skip common non-code directories
        dirs[:] = [d for d in dirs if d not in [
            'node_modules', 'venv', '.venv', '.git', '__pycache__', 
            'dist', 'build', 'target', 'bin', 'obj', '.next',
            'coverage', 'vendor', 'packages', '.idea', '.vscode'
        ]]
        
        for file in files:
            if any(file.endswith(ext) for ext in code_extensions):
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, local_repo_path)
                
                try:
                    file_size_kb = os.path.getsize(file_path) / 1024
                    
                    # Skip very large files (likely generated/minified)
                    if file_size_kb > 100:
                        continue
                    
                    priority = get_file_priority_score(relative_path, file)
                    
                    if priority > 0:  # Only include files with some priority
                        files_with_priority.append({
                            'path': file_path,
                            'relative_path': relative_path,
                            'priority': priority,
                            'size_kb': file_size_kb,
                            'extension': os.path.splitext(file)[1]
                        })
                except (OSError, PermissionError):
                    pass
    
    # Sort by priority (highest first)
    files_with_priority.sort(key=lambda x: x['priority'], reverse=True)
    
    # Apply limits
    selected_files = []
    total_size = 0
    
    for file_info in files_with_priority:
        if len(selected_files) >= max_files:
            break
        if total_size + file_info['size_kb'] > max_total_size_kb:
            break
        
        selected_files.append(file_info)
        total_size += file_info['size_kb']
    
    return selected_files


def get_code_context_around_line(file_content: str, target_line: int, context_lines: int = 10) -> str:
    """
    Extract relevant code context around a specific line.
    Useful for focused analysis of vulnerable areas.
    
    Args:
        file_content: Full file content
        target_line: Line number to focus on (1-indexed)
        context_lines: Number of lines before/after to include
        
    Returns:
        Code snippet with context
    """
    lines = file_content.split('\n')
    start = max(0, target_line - context_lines - 1)
    end = min(len(lines), target_line + context_lines)
    
    context = lines[start:end]
    
    # Add line numbers for clarity
    numbered_lines = []
    for i, line in enumerate(context, start=start + 1):
        marker = " >> " if i == target_line else "    "
        numbered_lines.append(f"{i:4d}{marker}{line}")
    
    return '\n'.join(numbered_lines)
