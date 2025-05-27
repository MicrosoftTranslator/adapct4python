//------------------------------------------------------------------------------
//
// Copyright (c) Microsoft Corporation 2025.
// All rights reserved.
//
// This code is licensed under the MIT License.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files(the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and / or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions :
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//
//------------------------------------------------------------------------------

/*
 * Document management component
 */

export class DocumentManager {
    constructor() {
        this.documents = [];
        this.selectedFiles = [];
    }

    async loadDocuments(workspaceId, forceRefresh = false) {
        if (!workspaceId) return;
        
        try {
            // Use our new API client
            this.documents = await window.apiClient.request(`/api/documents?workspaceId=${workspaceId}`, {
                cacheKey: `documents_${workspaceId}`,
                forceRefresh: forceRefresh,
                retries: 1,
                timeout: 15000,
                fetchOptions: {
                    method: 'GET'
                }
            });
            
            this.renderDocuments();
            this.updateStatistics();
            
        } catch (error) {
            window.showNotification('Failed to load documents: ' + error.message, 'error');
        }
    }

    renderDocuments() {
        const tbody = document.getElementById('documents-tbody');
        
        if (!tbody) return;
        
        if (!this.documents || this.documents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No documents found in this workspace</td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        this.documents.forEach(doc => {
            // Handle date safely
            let createdDate = 'Unknown';
            try {
                if (doc?.createdDate) {
                    createdDate = new Date(doc.createdDate).toLocaleDateString();
                }
            } catch (e) {
                console.error('Error formatting date:', e);
            }

            html += `
                <tr>
                    <td>${doc.id}</td>
                    <td>${doc.name}</td>
                    <td>${doc.lp}</td>
                    <td>${doc.type}</td>
                    <td>${createdDate}</td>
                    <td>
                        <span class="badge bg-${doc.status === 'Available' ? 'success' : 'warning'}">
                            ${doc.status}
                        </span>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    updateStatistics() {
        document.getElementById('stats-document-count').textContent = this.documents ? this.documents.length : 0;
    }

    openDocumentModal() {
        // Reset form fields
        document.getElementById('document-name').value = '';
        document.getElementById('document-type').value = 'Adaptive';
        document.getElementById('file-list').innerHTML = '';
        this.selectedFiles = [];
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('documentModal'));
        modal.show();
    }

    handleFileSelection(files) {
        this.selectedFiles = Array.from(files);
        
        // Update the file list display
        const fileListElement = document.getElementById('file-list');
        let html = '';
        
        this.selectedFiles.forEach((file, index) => {
            html += `
                <div class="alert alert-info d-flex align-items-center mb-2">
                    <i class="fas fa-file me-2"></i>
                    <span class="flex-grow-1">${file.name} (${window.formatFileSize(file.size)})</span>
                    <button class="btn btn-sm btn-outline-danger remove-file" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        
        fileListElement.innerHTML = html;
        
        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-file').forEach(button => {
            button.addEventListener('click', () => {
                const index = parseInt(button.getAttribute('data-index'));
                this.selectedFiles.splice(index, 1);
                this.handleFileSelection(this.selectedFiles);
            });
        });
    }

    async uploadDocument() {
        if (!window.workspaceManager.currentWorkspace) {
            window.showNotification('Please select a workspace first', 'error');
            return;
        }
        
        const name = document.getElementById('document-name').value;
        const type = document.getElementById('document-type').value;
        
        if (!name) {
            window.showNotification('Document name is required', 'error');
            return;
        }
        
        if (this.selectedFiles.length === 0) {
            window.showNotification('Please select at least one file', 'error');
            return;
        }
        
        try {
            window.showLoading(true);
            
            // Disable upload button to prevent double submission
            const uploadButton = document.getElementById('btn-upload');
            uploadButton.disabled = true;
            const originalButtonText = uploadButton.textContent;
            uploadButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Uploading...';
            
            const formData = new FormData();
            
            // Add document details with better error handling
            try {
                formData.append('DocumentDetails', JSON.stringify([{
                    DocumentName: name,
                    DocumentType: type,
                    FileDetails: this.selectedFiles.map(file => ({
                        Name: file.name,
                        LanguageCode: 'en',
                        OverwriteIfExists: false
                    }))
                }]));
            } catch (jsonError) {
                console.error('Error creating document details JSON:', jsonError);
                throw new Error('Failed to prepare document data: ' + jsonError.message);
            }

            console.log('Document details:', formData.get('DocumentDetails'));

            // Add files with progress tracking
            let totalSize = 0;
            this.selectedFiles.forEach(file => totalSize += file.size);
            
            // Use the same key 'FILES' for all files (most .NET/Flask backends expect this)
            this.selectedFiles.forEach((file) => {
                formData.append('FILES', file, file.name);
            });
            
            // Create controller for potential abort
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for large files
            
            console.log('Uploading files:', formData);
            const response = await window.requestQueue.executeRequest(async () => {
                return fetch(`/api/documents/import?workspaceId=${window.workspaceManager.currentWorkspace.id}`, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${await response.text()}`);
            }
            
            const result = await response.json();
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('documentModal')).hide();
            
            // Reload documents
            this.loadDocuments(window.workspaceManager.currentWorkspace.id);
            
            window.showNotification('Document upload started. Check status for completion.', 'success');
            
        } catch (error) {
            if (error.name === 'AbortError') {
                window.showNotification('Document upload timed out. The file may be too large or your connection is slow.', 'error');
            } else {
                window.showNotification('Failed to upload document: ' + error.message, 'error');
            }
        } finally {
            window.showLoading(false);
            
            // Re-enable upload button
            const uploadButton = document.getElementById('btn-upload');
            if (uploadButton) {
                uploadButton.disabled = false;
                uploadButton.textContent = 'Upload';
            }
        }
    }

    initializeEventListeners() {
        // File upload
        const fileUploadZone = document.getElementById('file-upload-zone');
        const fileInput = document.getElementById('file-input');
        
        if (fileUploadZone && fileInput) {
            fileUploadZone.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files);
            });
            
            fileUploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadZone.classList.add('active');
            });
            
            fileUploadZone.addEventListener('dragleave', () => {
                fileUploadZone.classList.remove('active');
            });
            
            fileUploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadZone.classList.remove('active');
                this.handleFileSelection(e.dataTransfer.files);
            });
        }

        // Document modal and upload
        const btnUploadDocument = document.getElementById('btn-upload-document');
        const btnUpload = document.getElementById('btn-upload');
        
        if (btnUploadDocument) {
            btnUploadDocument.addEventListener('click', () => this.openDocumentModal());
        }
        
        if (btnUpload) {
            btnUpload.addEventListener('click', () => this.uploadDocument());
        }
    }
}
