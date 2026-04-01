"""
Ticket ID Generator Utility
Generates unique ticket IDs in format: PREFIX-NUMBER
Example: TASK-001, BUG-123, PROJ-045
"""
from database import tasks, projects
from bson import ObjectId


def generate_ticket_id(project_id, issue_type="task"):
    """
    Generate a unique ticket ID for a project
    Format: {PROJECT_PREFIX}-{COUNTER}
    Example: DOIT-001, HRMS-042, etc.
    
    Args:
        project_id: The project ObjectId or string
        issue_type: Type of issue (task, bug, story, epic)
    
    Returns:
        str: Unique ticket ID like "PROJ-123"
    """
    # Get project to extract prefix
    project = projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise ValueError(f"Project {project_id} not found")
    
    # Generate project prefix from project name
    # Take first 4 letters (uppercase) or create from initials
    project_name = project.get("name", "PROJ")
    prefix = generate_project_prefix(project_name)
    
    # Count existing tasks in this project to determine next number
    existing_count = tasks.count_documents({"project_id": str(project_id)})
    next_number = existing_count + 1
    
    # Generate ticket ID with zero-padding (e.g., PROJ-001, PROJ-042)
    ticket_id = f"{prefix}-{next_number:03d}"
    
    # Ensure uniqueness (in case of concurrent creation)
    while tasks.find_one({"ticket_id": ticket_id}):
        next_number += 1
        ticket_id = f"{prefix}-{next_number:03d}"
    
    return ticket_id


def generate_project_prefix(project_name):
    """
    Generate a 3-4 letter prefix from project name
    
    Examples:
        "Task Management" -> "TMS"
        "JIRA Clone" -> "JIRA"
        "HR Management System" -> "HRMS"
        "Website" -> "WEB"
    
    Args:
        project_name: The project name
    
    Returns:
        str: Project prefix (3-4 uppercase letters)
    """
    if not project_name:
        return "PROJ"
    
    # Remove special characters and split into words
    words = ''.join(c if c.isalnum() or c.isspace() else ' ' for c in project_name).split()
    
    if not words:
        return "PROJ"
    
    # If single word
    if len(words) == 1:
        word = words[0].upper()
        # Take first 4 letters or the whole word if shorter
        return word[:4] if len(word) >= 4 else word
    
    # Multiple words - take first letter of each word (max 4)
    prefix = ''.join(word[0].upper() for word in words if word)[:4]
    
    # Ensure minimum 2 characters
    if len(prefix) < 2:
        # Fallback to first word
        prefix = words[0][:4].upper()
    
    return prefix


def get_issue_type_icon(issue_type):
    """Get emoji icon for issue type"""
    icons = {
        "bug": "🐛",
        "task": "✅",
        "story": "📖",
        "epic": "🎯"
    }
    return icons.get(issue_type.lower(), "📝")


def get_issue_type_color(issue_type):
    """Get color code for issue type"""
    colors = {
        "bug": "#ef4444",      # Red
        "task": "#3b82f6",     # Blue
        "story": "#8b5cf6",    # Purple
        "epic": "#f59e0b"      # Orange
    }
    return colors.get(issue_type.lower(), "#6b7280")


if __name__ == "__main__":
    # Test the prefix generator
    test_names = [
        "Task Management System",
        "JIRA Clone",
        "HR Management",
        "Website",
        "E-Commerce Platform",
        "Customer Portal"
    ]
    
    print("Testing project prefix generator:")
    print("=" * 50)
    for name in test_names:
        prefix = generate_project_prefix(name)
        print(f"{name:30} -> {prefix}")
