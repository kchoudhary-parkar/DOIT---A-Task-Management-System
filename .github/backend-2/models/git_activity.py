from database import db
from bson import ObjectId
from datetime import datetime, timezone

# Collections for Git activity
git_branches = db['git_branches']
git_commits = db['git_commits']
git_pull_requests = db['git_pull_requests']

class GitBranch:
    @staticmethod
    def create(branch_data):
        """Create a git branch record"""
        branch = {
            "task_id": branch_data.get("task_id"),
            "project_id": branch_data.get("project_id"),
            "branch_name": branch_data.get("branch_name"),
            "repo_url": branch_data.get("repo_url"),
            "status": branch_data.get("status", "active"),  # active, merged, deleted
            "created_at": datetime.now(timezone.utc).replace(tzinfo=None)
        }
        result = git_branches.insert_one(branch)
        branch["_id"] = result.inserted_id
        return branch
    
    @staticmethod
    def find_by_task(task_id):
        """Get all branches for a task"""
        return list(git_branches.find({"task_id": task_id}).sort("created_at", -1))
    
    @staticmethod
    def find_by_project(project_id):
        """Get all branches for a project"""
        return list(git_branches.find({"project_id": project_id}).sort("created_at", -1))
    
    @staticmethod
    def update_status(branch_name, project_id, status):
        """Update branch status"""
        result = git_branches.update_one(
            {"branch_name": branch_name, "project_id": project_id},
            {"$set": {"status": status}}
        )
        return result.modified_count > 0


class GitCommit:
    @staticmethod
    def create(commit_data):
        """Create a git commit record"""
        commit = {
            "task_id": commit_data.get("task_id"),
            "project_id": commit_data.get("project_id"),
            "commit_sha": commit_data.get("commit_sha"),
            "message": commit_data.get("message"),
            "author": commit_data.get("author"),
            "author_email": commit_data.get("author_email", ""),
            "branch_name": commit_data.get("branch_name", ""),
            "timestamp": commit_data.get("timestamp"),
            "created_at": datetime.now(timezone.utc).replace(tzinfo=None)
        }
        # Avoid duplicates
        existing = git_commits.find_one({"commit_sha": commit['commit_sha']})
        if existing:
            return existing
        
        result = git_commits.insert_one(commit)
        commit["_id"] = result.inserted_id
        return commit
    
    @staticmethod
    def find_by_task(task_id):
        """Get all commits for a task"""
        return list(git_commits.find({"task_id": task_id}).sort("timestamp", -1))
    
    @staticmethod
    def find_by_project(project_id):
        """Get all commits for a project"""
        return list(git_commits.find({"project_id": project_id}).sort("timestamp", -1))


class GitPullRequest:
    @staticmethod
    def create(pr_data):
        """Create a git pull request record"""
        pr = {
            "task_id": pr_data.get("task_id"),
            "project_id": pr_data.get("project_id"),
            "pr_number": pr_data.get("pr_number"),
            "title": pr_data.get("title"),
            "branch_name": pr_data.get("branch_name"),
            "status": pr_data.get("status", "open"),  # open, closed, merged
            "author": pr_data.get("author"),
            "created_at_github": pr_data.get("created_at_github"),
            "merged_at": pr_data.get("merged_at"),
            "closed_at": pr_data.get("closed_at"),
            "created_at": datetime.now(timezone.utc).replace(tzinfo=None),
            "updated_at": datetime.now(timezone.utc).replace(tzinfo=None)
        }
        result = git_pull_requests.insert_one(pr)
        pr["_id"] = result.inserted_id
        return pr
    
    @staticmethod
    def update_or_create(pr_data):
        """Update existing PR or create new one"""
        existing = git_pull_requests.find_one({
            "pr_number": pr_data.get("pr_number"),
            "project_id": pr_data.get("project_id")
        })
        
        if existing:
            # Update
            update_fields = {
                "status": pr_data.get("status"),
                "merged_at": pr_data.get("merged_at"),
                "closed_at": pr_data.get("closed_at"),
                "updated_at": datetime.now(timezone.utc).replace(tzinfo=None)
            }
            git_pull_requests.update_one(
                {"_id": existing["_id"]},
                {"$set": update_fields}
            )
            existing.update(update_fields)
            return existing
        else:
            # Create
            return GitPullRequest.create(pr_data)
    
    @staticmethod
    def find_by_task(task_id):
        """Get all pull requests for a task"""
        return list(git_pull_requests.find({"task_id": task_id}).sort("created_at_github", -1))
    
    @staticmethod
    def find_by_project(project_id):
        """Get all pull requests for a project"""
        return list(git_pull_requests.find({"project_id": project_id}).sort("created_at_github", -1))
