import json
from models.profile import Profile
from utils.response import success_response, error_response

def get_profile(user_id):
    """Get user profile"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    profile = Profile.find_by_user(user_id)
    
    # If profile doesn't exist, create one
    if not profile:
        profile = Profile.create(user_id)
    
    # Convert ObjectId to string
    if "_id" in profile:
        profile["_id"] = str(profile["_id"])
    
    return success_response({"profile": profile})


def update_personal_info(body_str, user_id):
    """Update personal information"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    try:
        data = json.loads(body_str)
    except:
        return error_response("Invalid JSON", 400)
    
    # Extract the 'data' field which contains the actual personal info
    personal_data = data.get("data", {})
    
    # Update personal info
    success = Profile.update_personal(user_id, personal_data)
    
    if success:
        # Get updated profile
        profile = Profile.find_by_user(user_id)
        if "_id" in profile:
            profile["_id"] = str(profile["_id"])
        
        return success_response({
            "message": "Personal information updated successfully",
            "personal": profile.get("personal", {})
        })
    else:
        return error_response("Failed to update personal information", 500)


def update_education(body_str, user_id):
    """Update education list"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    try:
        data = json.loads(body_str)
    except:
        return error_response("Invalid JSON", 400)
    
    education_list = data.get("education", [])
    
    success = Profile.update_education(user_id, education_list)
    
    if success:
        # Get updated profile
        profile = Profile.find_by_user(user_id)
        if "_id" in profile:
            profile["_id"] = str(profile["_id"])
        
        return success_response({
            "message": "Education updated successfully",
            "education": profile.get("education", [])
        })
    else:
        return error_response("Failed to update education", 500)


def update_certificates(body_str, user_id):
    """Update certificates list"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    try:
        data = json.loads(body_str)
    except:
        return error_response("Invalid JSON", 400)
    
    certificates_list = data.get("certificates", [])
    
    success = Profile.update_certificates(user_id, certificates_list)
    
    if success:
        # Get updated profile
        profile = Profile.find_by_user(user_id)
        if "_id" in profile:
            profile["_id"] = str(profile["_id"])
        
        return success_response({
            "message": "Certificates updated successfully",
            "certificates": profile.get("certificates", [])
        })
    else:
        return error_response("Failed to update certificates", 500)


def update_organization(body_str, user_id):
    """Update organization information"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    try:
        data = json.loads(body_str)
    except:
        return error_response("Invalid JSON", 400)
    
    # Extract the 'data' field which contains the actual organization info
    organization_data = data.get("data", {})
    
    success = Profile.update_organization(user_id, organization_data)
    
    if success:
        # Get updated profile
        profile = Profile.find_by_user(user_id)
        if "_id" in profile:
            profile["_id"] = str(profile["_id"])
        
        return success_response({
            "message": "Organization information updated successfully",
            "organization": profile.get("organization", {})
        })
    else:
        return error_response("Failed to update organization information", 500)
