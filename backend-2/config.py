import os
from dotenv import load_dotenv

load_dotenv()

# ============================================================================
# DATABASE
# ============================================================================
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://Admin:Lkbd2sXR80uUBd5T@jira-task-management.croznmu.mongodb.net/taskdb?retryWrites=true&w=majority&appName=jira-task-management",
)

# ============================================================================
# AUTHENTICATION
# ============================================================================
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-this")
JWT_EXPIRY_HOURS = 24

# ============================================================================
# PLATFORM INTEGRATIONS (Optional - for default auto-provisioning)
# ============================================================================
# Discord - can be overridden per API call
DISCORD_DEFAULT_GUILD_ID = os.getenv("DISCORD_DEFAULT_GUILD_ID", "")
DISCORD_DEFAULT_BOT_TOKEN = os.getenv("DISCORD_DEFAULT_BOT_TOKEN", "")

# Slack - can be overridden per API call
SLACK_DEFAULT_WORKSPACE_TOKEN = os.getenv("SLACK_DEFAULT_WORKSPACE_TOKEN", "")

# Teams - can be overridden per API call
TEAMS_DEFAULT_TEAM_ID = os.getenv("TEAMS_DEFAULT_TEAM_ID", "")
TEAMS_DEFAULT_ACCESS_TOKEN = os.getenv("TEAMS_DEFAULT_ACCESS_TOKEN", "")

# ============================================================================
# SECURITY - ENCRYPTION (Optional but HIGHLY recommended for production)
# ============================================================================
ENCRYPTION_KEY = os.getenv(
    "ENCRYPTION_KEY", ""
)  # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
