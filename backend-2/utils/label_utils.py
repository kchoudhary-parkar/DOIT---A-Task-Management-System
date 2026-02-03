"""
Label/Tag utilities for task management
Provides predefined label colors and utilities
"""

# Predefined label colors for common categories
LABEL_COLORS = {
    "frontend": "#3b82f6",      # Blue
    "backend": "#10b981",       # Green
    "database": "#8b5cf6",      # Purple
    "ui/ux": "#ec4899",         # Pink
    "api": "#06b6d4",           # Cyan
    "bug-fix": "#ef4444",       # Red
    "enhancement": "#f59e0b",   # Orange
    "documentation": "#6366f1", # Indigo
    "testing": "#14b8a6",       # Teal
    "urgent": "#dc2626",        # Dark Red
    "security": "#7c3aed",      # Violet
    "performance": "#f97316",   # Deep Orange
    "refactor": "#84cc16",      # Lime
    "feature": "#22c55e",       # Bright Green
    "deployment": "#0ea5e9",    # Sky Blue
}

def get_label_color(label_name):
    """
    Get color for a label (case-insensitive)
    Returns predefined color or generates a color based on label name
    """
    label_lower = label_name.lower()
    
    # Check for predefined colors
    if label_lower in LABEL_COLORS:
        return LABEL_COLORS[label_lower]
    
    # Generate color from hash of label name
    hash_value = hash(label_name)
    
    # Predefined nice colors to choose from
    nice_colors = [
        "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4",
        "#ef4444", "#f59e0b", "#6366f1", "#14b8a6", "#f97316",
        "#84cc16", "#22c55e", "#0ea5e9", "#d946ef", "#fb923c"
    ]
    
    # Use hash to select a color
    return nice_colors[abs(hash_value) % len(nice_colors)]

def validate_label(label):
    """
    Validate label name
    - Must be 1-30 characters
    - Alphanumeric, hyphen, underscore, slash allowed
    """
    if not label or len(label) > 30:
        return False, "Label must be 1-30 characters"
    
    # Allow alphanumeric, hyphen, underscore, slash
    allowed_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_/")
    if not all(c in allowed_chars for c in label):
        return False, "Label can only contain letters, numbers, hyphens, underscores, and slashes"
    
    return True, ""

def normalize_label(label):
    """
    Normalize label name (trim, lowercase)
    """
    return label.strip().lower()
