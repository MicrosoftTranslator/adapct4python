import os
import msal
import json
import logging
from flask import session as flask_session, url_for, redirect, request

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('auth_helper')

# Microsoft Authentication settings
TENANT_ID = "tenant-id-placeholder"  # Replace with your Azure AD tenant ID
CLIENT_ID = "client-id-placeholder"  # Replace with your Azure AD application client ID
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES = ["User.Read"]
REDIRECT_URI = "http://localhost:5000/auth/redirect"

# MSAL app configuration
app_config = {
    "client_id": CLIENT_ID,
    "authority": AUTHORITY
}

def set_access_token(access_token, user_info=None):
    """
    Manually set an access token for the session.
    This allows bypassing the device flow entirely.
    """
    if not access_token:
        return False
    
    # Store the token in session
    flask_session["access_token"] = access_token
    
    # Store user info if provided
    if user_info:
        flask_session["id_token_claims"] = user_info
    else:
        # Set minimal user info 
        flask_session["id_token_claims"] = {
            "name": "Authenticated User",
            "preferred_username": "user@example.com"
        }
    
    return True

def get_auth_url():
    """
    Return the URL for manual authentication.
    Since we're using access tokens directly, this just redirects to token entry page.
    """
    return "/token-entry"

def get_token():
    """Get token from session."""
    # Check if we already have a token
    if "access_token" in flask_session:
        return {"access_token": flask_session["access_token"]}
    
    return None

def get_auth_header():
    """Get the Authorization header to use with API requests."""
    token = get_token()
    if token and "access_token" in token:
        return f"Bearer {token['access_token']}"
    return None

def handle_auth_error(result):
    """
    Handle authentication errors and return error information.
    Returns a dictionary with error details or None if there's no error.
    """
    if not result or "error" not in result:
        return None
        
    error = result.get("error", "")
    error_description = result.get("error_description", "")
    
    error_info = {
        "error": error,
        "error_description": error_description
    }
    
    # Store the error in session
    flask_session["auth_error"] = error_info
    
    return error_info

def clear_token_cache():
    """Clear all authentication data from session."""
    keys_to_clear = [
        "access_token", "id_token_claims", "auth_error"
    ]
    
    for key in keys_to_clear:
        if key in flask_session:
            flask_session.pop(key)
