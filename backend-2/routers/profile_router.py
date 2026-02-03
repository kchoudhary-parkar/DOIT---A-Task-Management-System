from fastapi import APIRouter, Depends, HTTPException
from schemas import PersonalInfoUpdate, EducationUpdate, CertificatesUpdate, OrganizationUpdate
from controllers import profile_controller
from dependencies import get_current_user
from utils.router_helpers import handle_controller_response
import json

router = APIRouter()

@router.get("")
async def get_profile(user_id: str = Depends(get_current_user)):
    """Get user profile"""
    response = profile_controller.get_profile(user_id)
    return handle_controller_response(response)

@router.put("/personal")
async def update_personal(data: PersonalInfoUpdate, user_id: str = Depends(get_current_user)):
    """Update personal information"""
    body = json.dumps(data.model_dump())
    response = profile_controller.update_personal_info(body, user_id)
    return handle_controller_response(response)

@router.put("/education")
async def update_education(data: EducationUpdate, user_id: str = Depends(get_current_user)):
    """Update education"""
    body = json.dumps(data.model_dump())
    response = profile_controller.update_education(body, user_id)
    return handle_controller_response(response)

@router.put("/certificates")
async def update_certificates(data: CertificatesUpdate, user_id: str = Depends(get_current_user)):
    """Update certificates"""
    body = json.dumps(data.model_dump())
    response = profile_controller.update_certificates(body, user_id)
    return handle_controller_response(response)

@router.put("/organization")
async def update_organization(data: OrganizationUpdate, user_id: str = Depends(get_current_user)):
    """Update organization"""
    body = json.dumps(data.model_dump())
    response = profile_controller.update_organization(body, user_id)
    return handle_controller_response(response)