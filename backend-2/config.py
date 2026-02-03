import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB Atlas Cloud Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://Admin:Lkbd2sXR80uUBd5T@jira-task-management.croznmu.mongodb.net/taskdb?retryWrites=true&w=majority&appName=jira-task-management")
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-this")
JWT_EXPIRY_HOURS = 24