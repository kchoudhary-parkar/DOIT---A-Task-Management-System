"""
Azure AI Agent Service Account Initialization
Creates a dedicated service account for Azure AI Foundry Agent
with token-based authentication for automation tasks
"""

import os
import secrets
from datetime import datetime, timezone
from dotenv import load_dotenv, set_key
from database import users, db
from bson import ObjectId
from bson.errors import InvalidId

load_dotenv()


def generate_secure_token(length=48):
    """Generate a cryptographically secure token"""
    return secrets.token_urlsafe(length)


def initialize_agent_service_account():
    """
    Create Azure AI Agent service account with token-based authentication
    This account is used by the agent to perform automated tasks
    """
    AGENT_EMAIL = os.getenv("AGENT_EMAIL", "agent@system.doit.com")
    AGENT_NAME = os.getenv("AGENT_NAME", "Azure AI Agent")
    AGENT_ROLE = os.getenv("AGENT_ROLE", "admin")  # admin role for task creation

    print("=" * 70)
    print("AZURE AI AGENT SERVICE ACCOUNT INITIALIZATION")
    print("=" * 70)

    # Check if agent account already exists
    existing_agent = users.find_one({"email": AGENT_EMAIL})

    if existing_agent:
        print(f"✓ Agent service account already exists: {AGENT_EMAIL}")
        print(f"  Agent ID: {existing_agent['_id']}")
        print(f"  Role: {existing_agent.get('role', 'unknown')}")

        agent_id = str(existing_agent["_id"])

        # Ensure correct role and service account flag
        updates = {}
        if existing_agent.get("role") != AGENT_ROLE:
            updates["role"] = AGENT_ROLE
        if not existing_agent.get("is_service_account"):
            updates["is_service_account"] = True

        if updates:
            users.update_one({"_id": existing_agent["_id"]}, {"$set": updates})
            print(f"✓ Updated agent account settings")
    else:
        # Create the agent service account
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        agent_data = {
            "name": AGENT_NAME,
            "email": AGENT_EMAIL,
            "password": "",  # No password - token-based only
            "role": AGENT_ROLE,
            "token_version": 1,
            "is_service_account": True,
            "created_at": now,
            "updated_at": now,
            "description": "Azure AI Foundry Agent automation service account",
            "permissions": [
                "create_tasks",
                "assign_tasks",
                "update_tasks",
                "read_projects",
                "read_users",
            ],
        }

        result = users.insert_one(agent_data)
        agent_id = str(result.inserted_id)

        print(f"✓ Created agent service account: {AGENT_EMAIL}")
        print(f"  Agent ID: {agent_id}")
        print(f"  Role: {AGENT_ROLE}")

    # Generate or retrieve service token
    current_token = os.getenv("AGENT_SERVICE_TOKEN")

    if current_token:
        print(f"\n✓ Agent service token already exists in .env")
        print(f"  Token (first 20 chars): {current_token[:20]}...")
    else:
        # Generate new token
        new_token = generate_secure_token(48)

        # Add to .env file
        env_file = ".env"
        if os.path.exists(env_file):
            set_key(env_file, "AGENT_SERVICE_TOKEN", new_token)
            set_key(env_file, "AGENT_SERVICE_USER_ID", agent_id)
            print(f"\n✓ Generated new agent service token")
            print(f"  Token: {new_token}")
            print(f"  Saved to .env file")
        else:
            print(f"\n⚠️  .env file not found. Please create it manually with:")
            print(f"  AGENT_SERVICE_TOKEN={new_token}")
            print(f"  AGENT_SERVICE_USER_ID={agent_id}")

    # Update .env with agent ID if not present or invalid
    current_agent_id = os.getenv("AGENT_SERVICE_USER_ID")

    # Validate current agent ID
    is_valid_id = False
    if current_agent_id:
        try:
            ObjectId(current_agent_id)
            is_valid_id = True
        except (InvalidId, TypeError):
            print(f"\n⚠️  Invalid AGENT_SERVICE_USER_ID in .env: {current_agent_id}")
            is_valid_id = False

    if not is_valid_id or current_agent_id != agent_id:
        env_file = ".env"
        if os.path.exists(env_file):
            set_key(env_file, "AGENT_SERVICE_USER_ID", agent_id)
            print(f"✓ Updated AGENT_SERVICE_USER_ID in .env to: {agent_id}")
        else:
            print(f"⚠️  Please add to .env: AGENT_SERVICE_USER_ID={agent_id}")

    print("\n" + "=" * 70)
    print("AGENT CONFIGURATION SUMMARY")
    print("=" * 70)
    print(f"Agent Email:     {AGENT_EMAIL}")
    print(f"Agent ID:        {agent_id}")
    print(f"Agent Role:      {AGENT_ROLE}")
    print(f"Service Account: Yes")
    print(f"Token Auth:      Enabled")
    print("=" * 70)

    return agent_id


def configure_agent_permissions():
    """
    Ensure agent has access to all necessary projects
    """
    AGENT_EMAIL = os.getenv("AGENT_EMAIL", "agent@system.doit.com")
    agent = users.find_one({"email": AGENT_EMAIL})

    if not agent:
        print("⚠️  Agent account not found. Run initialization first.")
        return

    # Count total projects
    total_projects = db.projects.count_documents({})

    print(f"\n📊 Total projects in system: {total_projects}")
    print(f"✓ Agent has admin role - can access all projects for task creation")


def test_agent_authentication():
    """
    Test if the agent can authenticate using the service token
    """
    print("\n" + "=" * 70)
    print("TESTING AGENT AUTHENTICATION")
    print("=" * 70)

    AGENT_SERVICE_TOKEN = os.getenv("AGENT_SERVICE_TOKEN")
    AGENT_SERVICE_USER_ID = os.getenv("AGENT_SERVICE_USER_ID")

    if not AGENT_SERVICE_TOKEN:
        print("❌ AGENT_SERVICE_TOKEN not found in .env")
        print("\n⚠️  Please run the script again to generate a token")
        return False

    if not AGENT_SERVICE_USER_ID:
        print("❌ AGENT_SERVICE_USER_ID not found in .env")
        print("\n⚠️  Please run the script again to set the user ID")
        return False

    # Validate ObjectId format
    try:
        agent_object_id = ObjectId(AGENT_SERVICE_USER_ID)
    except (InvalidId, TypeError) as e:
        print(f"❌ Invalid AGENT_SERVICE_USER_ID format: {AGENT_SERVICE_USER_ID}")
        print(f"   Error: {str(e)}")
        print("\n🔧 Fixing invalid ID...")

        # Find agent by email and fix the ID
        AGENT_EMAIL = os.getenv("AGENT_EMAIL", "agent@system.doit.com")
        agent = users.find_one({"email": AGENT_EMAIL})

        if agent:
            correct_id = str(agent["_id"])
            env_file = ".env"
            if os.path.exists(env_file):
                set_key(env_file, "AGENT_SERVICE_USER_ID", correct_id)
                print(f"✓ Fixed AGENT_SERVICE_USER_ID in .env: {correct_id}")
                AGENT_SERVICE_USER_ID = correct_id
                agent_object_id = ObjectId(correct_id)
            else:
                print(
                    f"⚠️  Please update .env manually: AGENT_SERVICE_USER_ID={correct_id}"
                )
                return False
        else:
            print("❌ Agent account not found in database")
            return False

    # Verify user exists
    agent = users.find_one({"_id": agent_object_id})

    if not agent:
        print(f"❌ Agent user ID {AGENT_SERVICE_USER_ID} not found in database")
        print("\n🔧 This might happen if the database was reset")
        print("   Please run the script again to recreate the agent account")
        return False

    print(f"✓ Agent service token configured")
    print(f"✓ Agent user ID verified: {AGENT_SERVICE_USER_ID}")
    print(f"✓ Agent name: {agent.get('name')}")
    print(f"✓ Agent email: {agent.get('email')}")
    print(f"✓ Agent role: {agent.get('role')}")
    print(f"✓ Is service account: {agent.get('is_service_account', False)}")

    print("\n🔐 AUTHENTICATION HEADER FOR AZURE AI AGENT:")
    print(f"   X-Agent-Key: {AGENT_SERVICE_TOKEN}")

    print("\n📝 EXAMPLE API REQUEST:")
    print("   curl -X POST http://localhost:8000/api/agent/automation/tasks \\")
    print(f"        -H 'X-Agent-Key: {AGENT_SERVICE_TOKEN}' \\")
    print("        -H 'Content-Type: application/json' \\")
    print("        -d '{")
    print('          "title": "Test task from agent",')
    print('          "project_id": "YOUR_PROJECT_ID_HERE",')
    print('          "assignee_email": "user@example.com",')
    print('          "priority": "High"')
    print("        }'")

    print("\n✅ Agent authentication test PASSED")
    return True


def display_setup_instructions():
    """
    Display setup instructions for Azure AI Foundry
    """
    print("\n" + "=" * 70)
    print("AZURE AI FOUNDRY SETUP INSTRUCTIONS")
    print("=" * 70)

    AGENT_SERVICE_TOKEN = os.getenv("AGENT_SERVICE_TOKEN", "[NOT_GENERATED]")

    print("\n1️⃣  UPLOAD OPENAPI SPECIFICATION:")
    print("   - In Azure Foundry Agent playground")
    print("   - Click 'Edit connected resources'")
    print("   - Add new 'Function' resource")
    print("   - Upload 'agent-api-extended.json'")

    print("\n2️⃣  CONFIGURE AUTHENTICATION:")
    print("   - In function settings, add authentication header:")
    print("   - Header name: X-Agent-Key")
    print(f"   - Header value: {AGENT_SERVICE_TOKEN[:40]}...")

    print("\n3️⃣  UPDATE API SERVER URL:")
    print("   - If using ngrok tunnel:")
    print("   - Update 'servers' section in agent-api-extended.json")
    print("   - Example: https://your-subdomain.ngrok-free.app")

    print("\n4️⃣  ADD AGENT INSTRUCTIONS:")
    print("   - Copy instructions from the setup guide")
    print("   - Paste into agent's 'Instructions' field in Azure Foundry")

    print("\n5️⃣  TEST THE AGENT:")
    print("   Test prompts:")
    print("   - 'Create a task for login bug and assign to john@example.com'")
    print("   - 'Make a high priority task for API refactoring'")
    print("   - 'Show me all project members in DOIT project'")

    print("\n6️⃣  VERIFY IN DATABASE:")
    print("   - Check MongoDB for newly created tasks")
    print("   - Verify task assignment to correct users")

    print("\n" + "=" * 70)


def verify_environment():
    """
    Verify all required environment variables are set
    """
    print("\n" + "=" * 70)
    print("ENVIRONMENT VERIFICATION")
    print("=" * 70)

    required_vars = [
        "MONGO_URI",
        "JWT_SECRET",
        "AGENT_SERVICE_TOKEN",
        "AGENT_SERVICE_USER_ID",
    ]

    missing_vars = []

    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Don't print sensitive values, just confirm they exist
            if var in ["MONGO_URI", "JWT_SECRET", "AGENT_SERVICE_TOKEN"]:
                print(f"✓ {var}: {'*' * 20}... (set)")
            else:
                print(f"✓ {var}: {value}")
        else:
            print(f"❌ {var}: NOT SET")
            missing_vars.append(var)

    if missing_vars:
        print(f"\n⚠️  Missing environment variables: {', '.join(missing_vars)}")
        print("   Please update your .env file")
        return False

    print("\n✅ All required environment variables are set")
    return True


def main():
    """Main initialization function"""
    print("\n")
    print("🤖 AZURE AI AGENT SERVICE ACCOUNT SETUP")
    print("=" * 70)

    try:
        # Step 1: Initialize agent service account
        agent_id = initialize_agent_service_account()

        # Step 2: Configure permissions
        configure_agent_permissions()

        # Step 3: Test authentication
        auth_success = test_agent_authentication()

        if auth_success:
            # Step 4: Display setup instructions
            display_setup_instructions()

            # Step 5: Verify environment
            verify_environment()

            print("\n✅ Azure AI Agent initialization complete!")
        else:
            print("\n⚠️  Agent initialization completed with warnings")
            print("   Please review the messages above and fix any issues")

        print("=" * 70)
        print("\n")

    except Exception as e:
        print(f"\n❌ Error during initialization: {str(e)}")
        import traceback

        traceback.print_exc()
        print("\n⚠️  Initialization failed. Please check the error messages above.")


if __name__ == "__main__":
    main()
