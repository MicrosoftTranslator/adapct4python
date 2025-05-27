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
 * Index management component
 */

export class IndexManager {
    constructor() {
        this.indices = [];
        this.documentIdForIndex = null;
    }

    async loadIndices(workspaceId, forceRefresh = false) {
        if (!workspaceId) return;
        
        try {
            const tbody = document.getElementById('indices-tbody');
            
            // Use our new API client
            let data = await window.apiClient.request(`/api/index?workspaceId=${workspaceId}`, {
                cacheKey: `indices_${workspaceId}`,
                forceRefresh: forceRefresh,
                retries: 1,
                timeout: 15000,
                fetchOptions: {
                    method: 'GET'
                }
            }).catch(error => {
                // Handle error and set empty array
                if (tbody) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center">No indices found in this workspace</td>
                        </tr>
                    `;
                }
                return [];
            });
            
            // If we have no data at this point, just return
            if (!data) {
                this.indices = [];
                return;
            }
            
            // Log the raw data for debugging
            console.log('Raw indices data:', data);
            
            // Ensure indices is always an array
            if (!Array.isArray(data)) {
                if (data && data.indexes && Array.isArray(data.indexes)) {
                    // Handle structure like { indexes: [...] }
                    this.indices = data.indexes;
                    console.log('Extracted indices from data.indexes');
                } else if (data && typeof data === 'object') {
                    // Handle single object case
                    this.indices = [data];
                    console.log('Converted single object to array');
                } else {
                    // Handle empty or invalid cases
                    this.indices = [];
                    console.log('No valid indices data found');
                }
            } else {
                // Data is already an array
                this.indices = data;
                console.log('Data is already an array');
            }
            
            console.log('Final indices array:', this.indices);
            // Save to cache - use the correct cache key
            window.apiCache.set(`indices_${workspaceId}`, this.indices);
            
            this.renderIndices();
            this.populateIndexDropdown();
            this.updateStatistics();
        } catch (error) {
            console.error('Error loading indices:', error);
            this.indices = [];
            
            if (error.name === 'AbortError') {
                window.showNotification('Request timed out. Check your connection and try again.', 'error');
            } else {
                window.showNotification('Failed to load indices: ' + error.message, 'error');
            }
        } finally {
            window.showLoading(false);
        }
    }

    renderIndices() {
        const tbody = document.getElementById('indices-tbody');
        
        if (!tbody || !this.indices || this.indices.length === 0) {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No indices found in this workspace</td>
                    </tr>
                `;
            }
            return;
        }
        
        console.log('Rendering indices:', this.indices);
        let html = '';
        
        // Ensure indices is an array before using forEach
        const indicesArray = Array.isArray(this.indices) ? this.indices : [];
        
        indicesArray.forEach(index => {
            // Use optional chaining and default values to prevent errors
            const name = index?.name || 'Unnamed Index';
            const sourceLanguage = index?.sourceLanguage || '';
            const targetLanguage = index?.targetLanguage || '';
            const indexId = index?.id || 'unknown';
            const apiDomain = index?.apiDomain || 'unknown';

            console.log('Rendering indices - indexId:', indexId, 'apiDomain:', apiDomain);

            // Handle date safely
            let createdDate = 'Unknown';
            try {
                if (index?.createdDate) {
                    createdDate = new Date(index.createdDate).toLocaleDateString();
                }
            } catch (e) {
                console.error('Error formatting date:', e);
            }
            
            html += `
                <tr>
                    <td>${name}</td>
                    <td>${sourceLanguage}</td>
                    <td>${targetLanguage}</td>
                    <td>${createdDate}</td>
                    <td>
                        <span class="badge bg-${index.status === 'Available' ? 'success' : 'warning'}">
                            ${index.status}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" title="Delete Index" delete-index-id="${indexId}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
        // Add event listeners to index buttons
        document.querySelectorAll('[delete-index-id]').forEach(button => {
            button.addEventListener('click', () => {
                const indexId = button.getAttribute('delete-index-id');
                
                if (button.title === "Delete Index") {
                    if (confirm(`Are you sure you want to delete this index?`)) {
                        console.log('Deleting index with ID:', indexId);
                        this.deleteIndex(indexId);
                    }
                }
            });
        });
    }

    populateIndexDropdown() {
        const indexDropdown = document.getElementById('translate-index');
        
        if (!indexDropdown) return;
        
        if (!this.indices || this.indices.length === 0) {
            indexDropdown.innerHTML = `<option value="">No indices available</option>`;
            return;
        }
        
        console.log('Populating dropdown with indices:', this.indices);
        let html = '';
        
        // Ensure indices is an array before using forEach
        const indicesArray = Array.isArray(this.indices) ? this.indices : [];
        
        indicesArray.forEach(index => {
            // Use optional chaining and default values to prevent errors
            const indexId = index?.id || 'unknown';
            const apiDomain = index?.apiDomain || 'unknown';
            const name = index?.name || 'Unnamed Index';
            
            html += `<option id="${indexId}" value="${apiDomain}">${name}</option>`;
        });
        
        indexDropdown.innerHTML = html;
    }

    updateStatistics() {
        document.getElementById('stats-index-count').textContent = this.indices ? this.indices.length : 0;
    }

    openIndexModal() {
        // Reset form fields
        document.getElementById('index-name').value = '';
        document.getElementById('index-source').value = 'en';
        document.getElementById('index-target').value = 'fr';
        
        // Reset document ID input
        this.documentIdForIndex = null;
        const indexFileInput = document.getElementById('index-file-input');
        if (indexFileInput) {
            indexFileInput.value = '';
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('indexModal'));
        modal.show();
    }

    async createIndex() {
        if (!window.workspaceManager.currentWorkspace) {
            window.showNotification('Please select a workspace first', 'error');
            return;
        }
        
        const name = document.getElementById('index-name').value;
        const sourceLanguage = document.getElementById('index-source').value;
        const targetLanguage = document.getElementById('index-target').value;
        
        if (!name) {
            window.showNotification('Index name is required', 'error');
            return;
        }
        
        if (!this.documentIdForIndex) {
            window.showNotification('Please enter a valid document ID for the index', 'error');
            return;
        }
        
        try {
            window.showLoading(true);
            // Create a FormData object to send data
            const formData = new FormData();
            // Add index details
            formData.append('IndexDetails', JSON.stringify({
                documentIds: [this.documentIdForIndex],
                IndexName: name,
                SourceLanguage: sourceLanguage,
                TargetLanguage: targetLanguage
            }));
            
            const response = await fetch(`/api/index?workspaceId=${window.workspaceManager.currentWorkspace.id}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${await response.text()}`);
            }
            
            const index = await response.json();
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('indexModal')).hide();
            
            // Reload indices
            this.loadIndices(window.workspaceManager.currentWorkspace.id);
            
            window.showNotification('Index created successfully', 'success');
        } catch (error) {
            window.showNotification('Failed to create index: ' + error.message, 'error');
        } finally {
            window.showLoading(false);
        }
    }

    async deleteIndex(indexId) {
        try {
            window.showLoading(true);
            const response = await fetch(`/api/index/${indexId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${await response.text()}`);
            }
            
            // Reload indices
            this.loadIndices(window.workspaceManager.currentWorkspace.id);
            
            window.showNotification('Index deleted successfully', 'success');
            
        } catch (error) {
            window.showNotification('Failed to delete index: ' + error.message, 'error');
        } finally {
            window.showLoading(false);
        }
    }

    initializeEventListeners() {
        // Index modal and creation
        const btnCreateIndex = document.getElementById('btn-create-index');
        const btnCreateIndexConfirm = document.getElementById('btn-create-index-confirm');
        const btnQuickIndex = document.getElementById('btn-quick-index');
        
        if (btnCreateIndex) {
            btnCreateIndex.addEventListener('click', () => this.openIndexModal());
        }
        
        if (btnCreateIndexConfirm) {
            btnCreateIndexConfirm.addEventListener('click', () => this.createIndex());
        }
        
        if (btnQuickIndex) {
            btnQuickIndex.addEventListener('click', () => this.openIndexModal());
        }

        // Index document ID input
        const indexFileInput = document.getElementById('index-file-input');
        if (indexFileInput) {
            indexFileInput.addEventListener('input', (e) => {
                const val = e.target.value;
                this.documentIdForIndex = val && !isNaN(val) ? parseInt(val, 10) : null;
            });
        }
    }
}
