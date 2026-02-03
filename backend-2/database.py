from pymongo import MongoClient
from config import MONGO_URI

# Connect to MongoDB Atlas Cloud
client = MongoClient(MONGO_URI)
db = client["taskdb"]  # Explicitly specify database name

# Collections
users_collection = db.users
projects_collection = db.projects
tasks_collection = db.tasks
sprints_collection = db.sprints

# Backward compatibility aliases
users = users_collection
projects = projects_collection
tasks = tasks_collection
sprints = sprints_collection