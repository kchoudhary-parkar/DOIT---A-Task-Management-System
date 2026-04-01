import re

def validate_email(email: str) -> bool:
    """Basic email validation using regex"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password: str) -> tuple[bool, list]:
    """
    Enhanced password validation with multiple constraints
    Returns: (is_valid: bool, errors: list)
    """
    errors = []
    
    if not password:
        return False, ["Password is required"]
    
    # Minimum length check
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    
    # Maximum length check
    if len(password) > 128:
        errors.append("Password must not exceed 128 characters")
    
    # Uppercase letter check
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    
    # Lowercase letter check
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    
    # Digit check
    if not re.search(r'\d', password):
        errors.append("Password must contain at least one number")
    
    # Special character check
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', password):
        errors.append("Password must contain at least one special character (!@#$%^&* etc.)")
    
    # No whitespace check
    if re.search(r'\s', password):
        errors.append("Password must not contain spaces")
    
    # Common password check (basic implementation)
    common_passwords = [
        'password', '12345678', 'qwerty', 'abc123', 'password123',
        'admin', 'letmein', 'welcome', 'monkey', '1234567890',
        'password1', 'qwerty123', '123456789', 'iloveyou'
    ]
    if password.lower() in common_passwords:
        errors.append("Password is too common, please choose a stronger password")
    
    return len(errors) == 0, errors


def validate_username(username: str) -> tuple[bool, list]:
    """
    Validate username constraints
    Returns: (is_valid: bool, errors: list)
    """
    errors = []
    
    if not username:
        return False, ["Username is required"]
    
    if len(username) < 3:
        errors.append("Username must be at least 3 characters long")
    
    if len(username) > 30:
        errors.append("Username must not exceed 30 characters")
    
    if not re.match(r'^[a-zA-Z0-9_\s-]+$', username):
        errors.append("Username can only contain letters, numbers, spaces, hyphens, and underscores")
    
    return len(errors) == 0, errors


def check_password_strength(password: str) -> str:
    """
    Return password strength: weak, medium, strong
    """
    if not password:
        return ''
    
    score = 0
    
    # Length bonus
    if len(password) >= 8:
        score += 1
    if len(password) >= 12:
        score += 1
    if len(password) >= 16:
        score += 1
    
    # Character variety
    if re.search(r'[a-z]', password):
        score += 1
    if re.search(r'[A-Z]', password):
        score += 1
    if re.search(r'\d', password):
        score += 1
    if re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', password):
        score += 2
    
    # Multiple special chars or numbers
    special_matches = re.findall(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', password)
    if len(special_matches) >= 2:
        score += 1
    
    number_matches = re.findall(r'\d', password)
    if len(number_matches) >= 3:
        score += 1
    
    if score <= 4:
        return 'weak'
    elif score <= 7:
        return 'medium'
    else:
        return 'strong'


def validate_required_fields(data: dict, required_fields: list) -> str:
    """Validate that all required fields are present in data
    Returns error message if validation fails, None if valid"""
    for field in required_fields:
        if field not in data or not data[field]:
            return f"Missing required field: {field}"
    return None