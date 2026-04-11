import requests
import os
import re
from urllib.parse import quote_plus
from datetime import datetime, timezone
from cryptography.fernet import Fernet

# GitHub API base URL
GITHUB_API_BASE = "https://api.github.com"

# Fixed encryption key (in production, this should be in environment variable or secrets manager)
# For now, using a fixed key to ensure consistency across server restarts
FIXED_ENCRYPTION_KEY = b'mZH8vQ3KpN2Ry5Wx7Jz9Aa1Bb3Cc5Dd7Ee9Ff0Gg2Hh=' # base64 encoded 32-byte key

def get_encryption_key():
    """Get or create encryption key for storing tokens"""
    # Use environment variable if set, otherwise use fixed key
    env_key = os.getenv("ENCRYPTION_KEY")
    if env_key:
        return env_key.encode() if isinstance(env_key, str) else env_key
    return FIXED_ENCRYPTION_KEY

def encrypt_token(token):
    """Encrypt GitHub token before storing"""
    try:
        f = Fernet(get_encryption_key())
        return f.encrypt(token.encode()).decode()
    except:
        return token  # Fallback to plaintext if encryption fails

def decrypt_token(encrypted_token):
    """Decrypt GitHub token"""
    try:
        f = Fernet(get_encryption_key())
        return f.decrypt(encrypted_token.encode()).decode()
    except:
        return encrypted_token  # Return as-is if decryption fails

def parse_repo_url(repo_url):
    """
    Parse GitHub repo URL to extract owner and repo name
    Examples:
        https://github.com/company/cdw-backend
        https://github.com/company/DOIT2.0
        git@github.com:company/cdw-backend.git
    Returns: (owner, repo_name)
    """
    # Clean URL
    repo_url = repo_url.strip().rstrip('/')
    
    # Remove .git suffix if present
    if repo_url.endswith('.git'):
        repo_url = repo_url[:-4]
    
    # HTTPS format - allow dots in repo name
    match = re.search(r'github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?$', repo_url)
    if match:
        owner, repo = match.groups()
        return owner, repo
    
    raise ValueError("Invalid GitHub repository URL")

def extract_ticket_id(text):
    """
    Extract ticket ID from branch name or commit message
    Examples:
        feature/CC-16-login → CC-16
        CC-16: Add authentication → CC-16
        bugfix/TASK-123-fix-bug → TASK-123
    """
    if not text:
        return None
    
    # Pattern: PROJECT_PREFIX-NUMBER
    match = re.search(r'([A-Z]+)-(\d+)', text, re.IGNORECASE)
    if match:
        return match.group(0).upper()  # Normalize ticket IDs (e.g., dgft-2 -> DGFT-2)
    
    return None

def get_github_headers(token=None):
    """Get headers for GitHub API requests"""
    token = token or os.getenv("GITHUB_TOKEN")
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

def add_collaborator(repo_url, username, token, permission="push"):
    """
    Add a collaborator to GitHub repository
    
    Args:
        repo_url: Full GitHub repo URL
        username: GitHub username to add
        token: GitHub access token
        permission: 'pull', 'push', 'admin', 'maintain', 'triage'
    
    Returns:
        dict: Response data or error
    """
    try:
        owner, repo = parse_repo_url(repo_url)
        url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/collaborators/{username}"
        
        response = requests.put(
            url,
            headers=get_github_headers(token),
            json={"permission": permission}
        )
        
        if response.status_code in [201, 204]:
            return {"success": True, "message": f"Added {username} as collaborator"}
        else:
            return {"success": False, "error": response.json()}
    
    except Exception as e:
        return {"success": False, "error": str(e)}

def create_webhook(repo_url, webhook_url, token, events=None):
    """
    Create a webhook on GitHub repository
    
    Args:
        repo_url: Full GitHub repo URL
        webhook_url: URL to receive webhook events (your DOIT app)
        token: GitHub access token
        events: List of events to subscribe to
    
    Returns:
        dict: Webhook data including webhook_id
    """
    if events is None:
        events = ["push", "pull_request", "create", "delete"]
    
    try:
        owner, repo = parse_repo_url(repo_url)
        url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/hooks"
        
        payload = {
            "name": "web",
            "active": True,
            "events": events,
            "config": {
                "url": webhook_url,
                "content_type": "json",
                "insecure_ssl": "0"
            }
        }
        
        response = requests.post(
            url,
            headers=get_github_headers(token),
            json=payload
        )
        
        if response.status_code == 201:
            data = response.json()
            return {
                "success": True,
                "webhook_id": data["id"],
                "webhook_url": data["config"]["url"]
            }
        else:
            return {"success": False, "error": response.json()}
    
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_branches(repo_url, token, ticket_id=None):
    """
    Get branches from GitHub repository
    
    Args:
        repo_url: Full GitHub repo URL
        token: GitHub access token
        ticket_id: Optional ticket ID to filter branches
    
    Returns:
        list: Branch data
    """
    try:
        owner, repo = parse_repo_url(repo_url)
        url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/branches"
        
        response = requests.get(url, headers=get_github_headers(token))
        
        print(f"[GITHUB API] GET {url}")
        print(f"[GITHUB API] Response status: {response.status_code}")
        
        if response.status_code == 200:
            branches = response.json()
            
            # Filter by ticket ID if provided
            if ticket_id:
                # Use word boundary matching to prevent false positives
                # e.g., GTP-003 should NOT match GTP-0030
                import re
                pattern = re.compile(r'\b' + re.escape(ticket_id) + r'\b', re.IGNORECASE)
                branches = [b for b in branches if pattern.search(b['name'])]
            
            return branches
        else:
            print(f"[GITHUB API] Error response: {response.text}")
            return []
    
    except Exception as e:
        print(f"Error fetching branches: {e}")
        import traceback
        traceback.print_exc()
        return []

def search_commits(repo_url, token, ticket_id):
    """
    Search commits mentioning ticket ID
    
    Args:
        repo_url: Full GitHub repo URL
        token: GitHub access token
        ticket_id: Ticket ID to search for
    
    Returns:
        list: Commit data
    """
    try:
        owner, repo = parse_repo_url(repo_url)
        ticket_id = (ticket_id or "").upper()
        # Use quotes for exact match to prevent false positives
        query = f'repo:{owner}/{repo} "{ticket_id}"'
        encoded_query = quote_plus(query)
        url = f"{GITHUB_API_BASE}/search/commits?q={encoded_query}"
        
        headers = get_github_headers(token)
        headers["Accept"] = "application/vnd.github.cloak-preview"
        
        response = requests.get(url, headers=headers)
        
        print(f"[GITHUB API] Search commits: {url}")
        print(f"[GITHUB API] Response status: {response.status_code}")
        
        search_commits_matched = []

        if response.status_code == 200:
            commits = response.json().get('items', [])
            # Additional filtering with word boundary to ensure exact match
            pattern = re.compile(r'\b' + re.escape(ticket_id) + r'\b', re.IGNORECASE)
            filtered_commits = []
            for commit in commits:
                message = commit.get('commit', {}).get('message', '')
                if pattern.search(message):
                    filtered_commits.append(commit)
            search_commits_matched = filtered_commits

            if not filtered_commits:
                print("[GITHUB API] Commit search returned 0 matches after filtering; trying branch fallback")
        else:
            print(f"[GITHUB API] Error response: {response.text}")

        # Fallback: fetch commits directly from branches that match ticket ID.
        # This avoids depending solely on GitHub Search API indexing delays.
        pattern = re.compile(r'\b' + re.escape(ticket_id) + r'\b', re.IGNORECASE)
        matched_branches = get_branches(repo_url, token, ticket_id)
        seen_shas = set()
        fallback_commits = []

        for branch in matched_branches:
            branch_name = branch.get('name')
            if not branch_name:
                continue

            commits_url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/commits?sha={quote_plus(branch_name)}&per_page=30"
            commits_response = requests.get(commits_url, headers=get_github_headers(token))
            if commits_response.status_code != 200:
                continue

            branch_commits = commits_response.json() or []
            for commit in branch_commits:
                sha = commit.get('sha')
                if not sha or sha in seen_shas:
                    continue

                message = commit.get('commit', {}).get('message', '')
                if pattern.search(message) or pattern.search(branch_name):
                    fallback_commits.append(commit)
                    seen_shas.add(sha)

        print(f"[GITHUB API] Branch fallback commits found: {len(fallback_commits)}")

        # Merge search + fallback results by SHA so fresh branch commits are not missed
        # while still preserving search matches.
        merged_commits = []
        seen_shas = set()
        for commit in (search_commits_matched + fallback_commits):
            sha = commit.get('sha')
            if not sha or sha in seen_shas:
                continue
            merged_commits.append(commit)
            seen_shas.add(sha)

        return merged_commits
    
    except Exception as e:
        print(f"Error searching commits: {e}")
        import traceback
        traceback.print_exc()
        return []

def search_pull_requests(repo_url, token, ticket_id):
    """
    Search pull requests mentioning ticket ID
    
    Args:
        repo_url: Full GitHub repo URL
        token: GitHub access token
        ticket_id: Ticket ID to search for
    
    Returns:
        list: Pull request data
    """
    try:
        owner, repo = parse_repo_url(repo_url)
        ticket_id = (ticket_id or "").upper()
        # Use quotes for exact match to prevent false positives
        query = f'repo:{owner}/{repo} type:pr "{ticket_id}"'
        encoded_query = quote_plus(query)
        url = f"{GITHUB_API_BASE}/search/issues?q={encoded_query}"
        pattern = re.compile(r'\b' + re.escape(ticket_id) + r'\b', re.IGNORECASE)

        def matches_ticket(pr_data):
            title = pr_data.get('title', '') or ''
            body = pr_data.get('body', '') or ''
            head_ref = pr_data.get('head', {}).get('ref', '') or ''
            base_ref = pr_data.get('base', {}).get('ref', '') or ''
            return (
                pattern.search(title)
                or pattern.search(body)
                or pattern.search(head_ref)
                or pattern.search(base_ref)
            )

        def fetch_pr_details(pr_number):
            pr_url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}"
            pr_response = requests.get(pr_url, headers=get_github_headers(token))
            if pr_response.status_code == 200:
                return pr_response.json()
            return None
        
        response = requests.get(url, headers=get_github_headers(token))
        
        if response.status_code == 200:
            prs = response.json().get('items', [])
            from concurrent.futures import ThreadPoolExecutor

            search_pr_numbers = [pr.get('number') for pr in prs if pr.get('number') is not None]
            detailed_prs = []
            with ThreadPoolExecutor(max_workers=5) as executor:
                results = executor.map(fetch_pr_details, search_pr_numbers)
                detailed_prs = [pr for pr in results if pr is not None]

            filtered_search_prs = [pr for pr in detailed_prs if matches_ticket(pr)]
            if filtered_search_prs:
                return filtered_search_prs

            print("[GITHUB API] PR search returned 0 matches after filtering; trying repo PR fallback")
        else:
            print(f"[GITHUB API] PR search error: {response.status_code} {response.text}")

        # Fallback: list repo PRs (open + closed), then filter by ticket pattern across
        # title/body/head/base. This covers cases where ticket ID appears in branch name
        # but not in PR title/body search index.
        fallback_prs = []
        seen_numbers = set()
        for state in ["open", "closed"]:
            list_url = (
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls"
                f"?state={state}&sort=updated&direction=desc&per_page=100"
            )
            list_response = requests.get(list_url, headers=get_github_headers(token))
            if list_response.status_code != 200:
                continue

            for pr in list_response.json() or []:
                number = pr.get('number')
                if number in seen_numbers:
                    continue
                if matches_ticket(pr):
                    fallback_prs.append(pr)
                    seen_numbers.add(number)

        print(f"[GITHUB API] PR fallback found: {len(fallback_prs)}")
        return fallback_prs
    
    except Exception as e:
        print(f"Error searching pull requests: {e}")
        return []

def calculate_time_ago(timestamp_str):
    """
    Calculate time ago from timestamp
    
    Args:
        timestamp_str: ISO format timestamp
    
    Returns:
        str: Human readable time ago (e.g., "2 hours ago")
    """
    if not timestamp_str:
        return None
    
    try:
        # Parse GitHub timestamp
        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        
        diff = now - timestamp
        
        seconds = diff.total_seconds()
        
        if seconds < 60:
            return f"{int(seconds)} seconds ago"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        else:
            days = int(seconds / 86400)
            return f"{days} day{'s' if days != 1 else ''} ago"
    
    except Exception as e:
        return timestamp_str
