#------------------------------------------------------------------------------
#
# Copyright (c) Microsoft Corporation 2025.
# All rights reserved.
#
# This code is licensed under the MIT License.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files(the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and / or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions :
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#
#------------------------------------------------------------------------------

import os
import json
import requests
from flask import Flask, render_template, request, jsonify, redirect, session, Response
from flask_cors import CORS
from flask_session import Session
from dotenv import load_dotenv
import tempfile

# Load environment variables
load_dotenv()

app = Flask(__name__, 
            template_folder='webapp/templates',
            static_folder='webapp/static')

# Use a fixed secret key instead of a random one to ensure session persistence between restarts
app.secret_key = os.getenv("SECRET_KEY", "adapct-secret-key-for-session")

# Configure session to be more reliable using Flask-Session
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = os.path.join(tempfile.gettempdir(), 'flask_session')
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 1800  # 30 minutes
Session(app)  # Initialize Flask-Session
CORS(app)  # Enable CORS for all routes

# Import authentication helper with all needed functions
from auth_helper import (
    get_auth_url, get_token, get_auth_header, clear_token_cache,
    set_access_token, handle_auth_error
)


# Environment variables
API_URL = os.getenv("API_URL")
TRANSLATOR_URL = os.getenv("TRANSLATOR_URL")
TRANSLATION_KEY = os.getenv("TRANSLATION_KEY")
GPT_URL = os.getenv("GPT_URL")
GPT_KEY = os.getenv("GPT_KEY")
REGION = os.getenv("REGION")
GPT_DEPLOYMENT_NAME = os.getenv("GPT_DEPLOYMENT_NAME", "gpt-4o-mini")

# Auth constants for PKCE
from auth_helper import REDIRECT_URI, CLIENT_ID, AUTHORITY, SCOPES

# Authentication routes
@app.route('/login')
def login():
    """Start the authentication flow using token entry."""
    # Clear any existing session data
    session.clear()
    # Redirect to token entry page
    return redirect('/token-entry')

@app.route('/token-entry')
def token_entry():
    """Display the token entry page."""
    error = request.args.get('error')
    return render_template('token_entry.html', error=error)

@app.route('/authenticate', methods=['POST'])
def authenticate():
    """Process the submitted access token."""
    access_token = request.form.get('access_token')
    user_name = request.form.get('user_name')
    user_email = request.form.get('user_email')
    
    if not access_token:
        return redirect('/token-entry?error=No access token provided')
    
    # Create user info if provided
    user_info = None
    if user_name or user_email:
        user_info = {}
        if user_name:
            user_info["name"] = user_name
        if user_email:
            user_info["preferred_username"] = user_email
    
    # Set the access token in the session
    success = set_access_token(access_token, user_info)
    
    if success:
        return redirect('/')
    else:
        return redirect('/token-entry?error=Invalid access token')

@app.route('/auth/redirect')
def auth_redirect():
    """Legacy route for compatibility."""
    return redirect('/login')

@app.route('/logout')
def logout():
    """Log user out."""
    clear_token_cache()
    session.clear()
    return redirect('/')

@app.route('/')
def index():
    """Render the modern UI version of the application."""
    # Check if user is authenticated
    token = get_token()
    
    if not token or "access_token" not in token:
        # Go through the token entry flow
        return redirect('/login')
      # Render modern index with user info
    return render_template('index.html', 
                          user=session.get("id_token_claims", {}),
                          is_authenticated=True,
                          gpt_deployment_name=GPT_DEPLOYMENT_NAME)

# API helper to get headers with authorization
def get_api_headers():
    """Get headers for API requests."""
    token = session.get("access_token", "")
    return {
        "Authorization": f"Bearer {token}",
        "Ocp-Apim-Subscription-Key": TRANSLATION_KEY,
        "Ocp-Apim-Subscription-Region": REGION,
        "llm-endpoint": GPT_URL,
        "llm-key": GPT_KEY,
        "preview-api": "true",
        "content-type": "application/json"
    }


@app.route('/api/user')
def get_user():
    """Get current user information."""
    # Check if we have user info in the session
    user = session.get("id_token_claims")
    if user:
        return jsonify(user)
    
    # Check if we have a token that contains user info
    token = get_token()
    if token and token.get("id_token_claims"):
        return jsonify(token.get("id_token_claims"))
    
    return jsonify({"error": "Not authenticated"}), 401

@app.route('/api/health', methods=['HEAD', 'GET'])
def health_check():
    return Response(status=200)

# Workspace endpoints
@app.route('/api/workspaces', methods=['GET'])
def get_workspaces():
    """Get all workspaces."""
    response = requests.get(f"{API_URL}/api/texttranslator/v1.0/workspaces/", headers=get_api_headers())
    if response.text:
        try:
            return jsonify(response.json())
        except Exception:
            return jsonify({"error": "Invalid JSON response from backend", "raw": response.text}), response.status_code
    else:
        return jsonify([])


@app.route('/api/workspaces/<workspace_id>', methods=['GET'])
def get_workspace(workspace_id):
    """Get a specific workspace by ID."""
    response = requests.get(
        f"{API_URL}/api/texttranslator/v1.0/workspaces/{workspace_id}", 
        headers=get_api_headers()
    )
    if response.text:
        try:
            return jsonify(response.json()), response.status_code
        except Exception:
            return jsonify({"error": "Invalid JSON response from backend", "raw": response.text}), response.status_code
    else:
        return jsonify({}), response.status_code

# Document endpoints
@app.route('/api/documents', methods=['GET'])
def get_documents():
    """Get all documents in a workspace."""
    workspace_id = request.args.get('workspaceId')
    page_index = 1 #request.args.get('pageIndex', 0) get all documents
    
    if not workspace_id:
        return jsonify({"error": "workspaceId parameter is required"}), 400
        
    response = requests.get(
        f"{API_URL}/api/texttranslator/v1.0/documents",
        params={"workspaceId": workspace_id, "pageIndex": page_index, "limit": 100},
        headers=get_api_headers()
    )
    
    app.logger.debug(f"Documents API response status: {response.status_code}")
    
    if response.text:
        try:
            data = response.json()
            app.logger.debug(f"Documents API response type: {type(data)} \n {data}")
            
            # Ensure we have a consistent format for the frontend
            if isinstance(data, dict) and 'documents' in data["paginatedDocuments"]:
                # Handle when API returns {documents: [...]}
                documents = data["paginatedDocuments"]['documents']
            else:
                # Handle unexpected format
                documents = []
                if data:  # If there's some data but not in expected format
                    app.logger.warning(f"Unexpected documents API response format: {data}")
                    documents = [data]  # Try to use it anyway
            
            #print(f"Documents API response: {documents}")

            # Normalize each document to have consistent properties
            normalized_docs = []
            for doc in documents:
                if isinstance(doc, dict):
                    doc_info = doc.get('documentInfo', doc)
                    lang_info = doc_info.get('languages', [])
                    doc_type = doc_info.get('documentType', 'Unknown')
                    if doc_type == 'Adaptive':
                        normalized_docs.append({
                        'id': doc_info.get('id', 'unknown'),
                        'name': doc_info.get('name', 'Unnamed Document'),
                        'type': doc_info.get('documentType', 'Unknown'),
                        'createdDate': doc_info.get('createdDate', ''),
                        'status': 'Available' if doc_info.get('isAvailable', True) else 'Unavailable',
                        'lp': lang_info[0]['languageCode']+ '-' + lang_info[1]['languageCode']

                        })

                # print(f"Normalized document...: {normalized_docs[-1]}")
            
            return jsonify(normalized_docs), response.status_code
        except Exception as e:
            app.logger.error(f"Error processing documents response: {e}")
            return jsonify({"error": "Invalid JSON response from backend", "raw": response.text}), response.status_code
    else:
        return jsonify([]), response.status_code
        
# Utility function to import a TSV file as a document (from curl example)
def import_tsvFile(api_url, token, gpt_url, gpt_key, translation_key, region, workspace_id, document_name, tsv_file_path, tsv_file_name, source_lang):
    """
    Imports a TSV file as a document using a multipart/form-data POST request.
    Equivalent to the provided curl command.
    """
    import requests
    import json

    # Prepare DocumentDetails as a JSON string
    document_details = [
        {
            "DocumentName": document_name,
            "DocumentType": "Adaptive",
            "FileDetails": [
                {
                    "Name": tsv_file_name,
                    "LanguageCode": source_lang,
                    "OverwriteIfExists": False
                }
            ]
        }
    ]

    # Prepare headers (do not set content-type, requests will handle it for multipart)
    headers = {
        "authorization": f"Bearer {token}",
        "llm-endpoint": gpt_url,
        "llm-key": gpt_key,
        "ocp-apim-subscription-key": translation_key,
        "ocp-apim-subscription-region": region
    }

    # Prepare form data
    form_data = {
        'DocumentDetails': json.dumps(document_details)
    }

    # Prepare files
    with open(tsv_file_path, 'rb') as f:
        files = {
            'FILES': (tsv_file_name, f, 'text/tab-separated-values')
        }
        response = requests.post(
            f"{api_url}/api/texttranslator/v1.0/documents/import",
            params={"workspaceId": workspace_id},
            headers=headers,
            data=form_data,
            files=files
        )
    return response


@app.route('/api/documents/import', methods=['POST'])

def import_document():
    """
    Example endpoint to import a TSV file using the import TSV File utility.
    Expects form fields: document_name, tsv_file (uploaded), source_lang
    """

    workspace_id = request.args.get('workspaceId')
    document_details = request.form.get('DocumentDetails')
    tsv_file = request.files.get('FILES')
    document_name = json.loads(document_details)[0]['DocumentName']
    source_lang = json.loads(document_details)[0]['FileDetails'][0]['LanguageCode']

    # print(f"Importing TSV document: {workspace_id}, {document_details}, {tsv_file}, {document_name}, {source_lang}")

    if not (workspace_id and document_details and tsv_file):
        return jsonify({"error": "Missing required parameters"}), 400

    # Save uploaded file temporarily
    temp_path = os.path.join(tempfile.gettempdir(), tsv_file.filename)
    tsv_file.save(temp_path)

    try:
        response = import_tsvFile(
            api_url=API_URL,
            token=session.get("access_token", ""),
            gpt_url=GPT_URL,
            gpt_key=GPT_KEY,
            translation_key=TRANSLATION_KEY,
            region=REGION,
            workspace_id=workspace_id,
            document_name=document_name,
            tsv_file_path=temp_path,
            tsv_file_name=tsv_file.filename,
            source_lang=source_lang
        )
        return jsonify(response.json()), response.status_code
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.route('/api/documents/import/jobs/<job_id>', methods=['GET'])
def get_import_job_status(job_id):
    """Get the status of a document import job."""
    response = requests.get(
        f"{API_URL}/api/texttranslator/v1.0/documents/import/jobs/{job_id}",
        headers=get_api_headers()
    )
    if response.text:
        try:
            return jsonify(response.json()), response.status_code
        except Exception:
            return jsonify({"error": "Invalid JSON response from backend", "raw": response.text}), response.status_code
    else:
        return jsonify({}), response.status_code

# Index endpoints
@app.route('/api/index', methods=['GET'])
def get_all_indices():
    """Get all indices for a workspace."""
    workspace_id = request.args.get('workspaceId')
    response = requests.get(
        f"{API_URL}/api/texttranslator/v1.0/index",
        params={"workspaceId": workspace_id},
        headers=get_api_headers()
    )

    app.logger.debug(f"Documents API response status: {response.status_code}")
    
    if response.text:
        try:
            data = response.json()
            app.logger.debug(f"Indices API response type: {type(data)} \n {data}")
            
            # Ensure we have a consistent format for the frontend
            if isinstance(data, dict) and 'indexes' in data:
                # Handle when API returns {indices: [...]}
                indexes = data["indexes"]
            else:
                # Handle unexpected format
                indexes = []
                if data:  # If there's some data but not in expected format
                    app.logger.warning(f"Unexpected indices API response format: {data}")
                    indexes = [data]  # Try to use it anyway

            # Normalize each index to have consistent properties
            normalized_indices = []
            for index in indexes:
                if isinstance(index, dict):
                    normalized_indices.append({
                        'id': index.get('id', 'unknown'),
                        'apiDomain': index.get('apiDomain', 'unknown'),
                        'createdDate': index.get('createdDate', ''),
                        'name': index.get('name', 'Unnamed Index'),
                        'status': 'Available' if index.get('isAvailable', True) else 'Unavailable'
                    })

                # print(f"Normalized document...: {normalized_docs[-1]}")

            return jsonify(normalized_indices), response.status_code
        except Exception as e:
            app.logger.error(f"Error processing documents response: {e}")
            return jsonify({"error": "Invalid JSON response from backend", "raw": response.text}), response.status_code
    else:
        return jsonify([]), response.status_code

@app.route('/api/index/<index_id>', methods=['GET'])
def get_index(index_id):
    """Get a specific index by ID."""
    response = requests.get(
        f"{API_URL}/api/texttranslator/v1.0/index/{index_id}",
        headers=get_api_headers()
    )
    if response.text:
        try:
            data = response.json()
            app.logger.debug(f"Single index API response: {data}")
            return data, response.status_code
        except Exception as e:
            app.logger.error(f"Error parsing JSON response for index {index_id}: {e}")
            return jsonify({"error": "Invalid JSON response from backend", "raw": response.text}), response.status_code
    else:
        return jsonify({"error": "No data returned from API"}), 404

@app.route('/api/index', methods=['POST'])
def create_index():
    """Create a new index."""
    workspace_id = request.args.get('workspaceId')
    
    # Check if we have a multipart form (with files) or JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Handle file upload with FormData
        index_details = request.form.get('IndexDetails')
        
        # Parse the JSON string from form data
        if not index_details:
            return jsonify({"error": "Missing IndexDetails"}), 400
        
        try:
            index_data = json.loads(index_details)
        except Exception as e:
            app.logger.error(f"Error parsing IndexDetails: {e}")
            return jsonify({"error": "Invalid IndexDetails format"}), 400
        
        # Process the file and index data
        # Here we'd typically read the file, process it, and combine with index_data
        # For this example, we'll just pass the index data to the API
        app.logger.debug(f"Creating index with data: {index_data} ")
        
        # Required fields check
        required_fields = ['documentIds', 'IndexName', 'SourceLanguage', 'TargetLanguage']
        for field in required_fields:
            if field not in index_data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Create a temporary file for upload
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.tsv')
        try:
            # tsv_file.save(temp_file.name)
            # temp_file.close()  # Ensure file is closed before opening for reading and deleting
            # In a real implementation, you would process the TSV and make the appropriate API call
            # For now, we'll just include the index data
            # Send to API
            # with open(temp_file.name, 'rb') as f:
                # files = [('TSV_FILE', (tsv_file.filename, f, 'text/tab-separated-values'))]
            response = requests.post(
                f"{API_URL}/api/texttranslator/v1.0/index?workspaceId={workspace_id}",
                # params={"workspaceId": workspace_id},
                headers=get_api_headers(),
                data=json.dumps(index_data), 
                # files=files
            )
        finally:
            # Make sure to delete the temp file after closing
            if not temp_file.closed:
                temp_file.close()
            os.unlink(temp_file.name)
    else:
        # Handle JSON request (legacy support)
        data = request.json
        
        # Log what we're about to send
        app.logger.debug(f"Creating index with data: {data}")
        
        # Ensure we have the required fields with proper naming
        required_fields = ['name', 'sourceLanguage', 'targetLanguage']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Send to API
        response = requests.post(
            f"{API_URL}/api/texttranslator/v1.0/index",
            params={"workspaceId": workspace_id},
            headers=get_api_headers(),
            json=data
        )
    
    app.logger.debug(f"Index creation response status: {response.status_code}")
    
    if response.text:
        try:
            result = response.json()
            app.logger.debug(f"Index creation response: {result}")
            return jsonify(result), response.status_code
        except Exception as e:
            app.logger.error(f"Error parsing JSON response from index creation: {e}")
            return jsonify({"error": "Invalid JSON response from backend", "raw": response.text}), response.status_code
    else:
        return jsonify({"message": "Index creation initiated - no content returned"}), response.status_code

@app.route('/api/index/<index_id>', methods=['DELETE'])
def delete_index(index_id):
    """Delete a specific index by ID."""
    response = requests.delete(
        f"{API_URL}/api/texttranslator/v1.0/index/{index_id}",
        headers=get_api_headers()
    )
    if response.text:
        try:
            return jsonify(response.json()), response.status_code
        except Exception:
            return jsonify({"error": "Invalid JSON response from backend", "raw": response.text}), response.status_code
    else:
        return jsonify({}), response.status_code

# Translation endpoints
@app.route('/api/translate', methods=['POST'])
def translate_text():
    """Translate text using the Adaptive CT API."""
    params = {
        'api-version': '2025-05-01-preview',
        'trackperformance': 'true',
        'from': request.args.get('from', 'en'),
        'to': request.args.get('to', 'de'),
        'texttype': request.args.get('texttype', 'Plain'),
        'flight': 'experimental',
        'option': 'nocache',
    }
    
    # Add nocache option if specified
    if request.args.get('nocache'):
        params['options'] = 'nocache'
    
    data = request.json
    response = requests.post(
        TRANSLATOR_URL,
        params=params,
        headers=get_api_headers(),
        json=data
    )
    if response.text:
        try:
            return jsonify(response.json()), response.status_code
        except Exception:
            return jsonify({"error": "Invalid JSON response from backend", "raw": response.text}), response.status_code
    else:
        return jsonify({}), response.status_code

if __name__ == '__main__':
    app.run(debug=True, port=5000)
