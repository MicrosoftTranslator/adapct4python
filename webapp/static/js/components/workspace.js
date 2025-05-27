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
 * Workspace management component
 */

export class WorkspaceManager {
    constructor() {
        this.workspaces = [];
        this.currentWorkspace = null;
    }

    async loadWorkspaces(forceRefresh = false) {
        try {
            // Use our new API client
            this.workspaces = await window.apiClient.request('/api/workspaces', {
                cacheKey: 'workspaces',
                forceRefresh: forceRefresh,
                retries: 1,
                timeout: 15000,
                fetchOptions: {
                    method: 'GET'
                }
            });
            
            // Special handling for 401 response (redirect to login)
            if (this.workspaces === '401') {
                window.location.href = '/login';
                return;
            }
            
            this.renderWorkspaces();
            this.updateStatistics();
            this.populateWorkspaceSelectors();
            this.populateSettingsOptions();
            
            // If we have workspaces, select the first one by default
            if (this.workspaces.length > 0 && !this.currentWorkspace) {
                this.selectWorkspace(this.workspaces[0]);
            }
            
            if (forceRefresh) {
                window.showNotification('Workspaces refreshed successfully', 'success');
            }
        } catch (error) {
            window.showNotification('Failed to load workspaces: ' + error.message, 'error');
        } finally {
            window.showLoading(false);
        }
    }

    renderWorkspaces() {
        const workspaceNav = document.getElementById('workspace-nav');
        
        if (!workspaceNav) return;
        
        if (this.workspaces.length === 0) {
            workspaceNav.innerHTML = `
                <div class="text-muted small">No workspaces found</div>
                <div class="text-muted small">Create a workspace to get started</div>
            `;
            return;
        }
        
        let html = '';
        this.workspaces.forEach(workspace => {
            html += `
                <div class="workspace-item mb-2">
                    <button class="btn btn-outline-secondary btn-sm w-100 text-start workspace-btn ${this.currentWorkspace && this.currentWorkspace.id === workspace.id ? 'active' : ''}" 
                            data-id="${workspace.id}">
                        <i class="fas fa-project-diagram me-2"></i>
                        ${workspace.name}
                    </button>
                </div>
            `;
        });
        
        workspaceNav.innerHTML = html;
        
        // Add event listeners to workspace buttons
        document.querySelectorAll('.workspace-btn').forEach(button => {
            button.addEventListener('click', () => {
                const workspaceId = button.getAttribute('data-id');
                const workspace = this.workspaces.find(w => w.id === workspaceId);
                if (workspace) {
                    this.selectWorkspace(workspace);
                }
            });
        });
    }

    selectWorkspace(workspace) {
        this.currentWorkspace = workspace;
        
        // Update UI to show active workspace
        document.querySelectorAll('.workspace-btn').forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-id') === workspace.id) {
                button.classList.add('active');
            }
        });
        
        // Update workspace selectors
        document.querySelectorAll('.workspace-selector select').forEach(select => {
            if (select.value !== workspace.id) {
                select.value = workspace.id;
            }
        });
          // Load data for this workspace
        if (window.documentManager && window.indexManager) {
            window.documentManager.loadDocuments(workspace.id);
            window.indexManager.loadIndices(workspace.id);
        }
    }

    populateWorkspaceSelectors() {
        const selectors = [
            document.getElementById('document-workspace-selector'),
            document.getElementById('index-workspace-selector')
        ];
        
        selectors.forEach(selector => {
            if (!selector) return;
            
            if (!this.workspaces || this.workspaces.length === 0) {
                selector.innerHTML = `
                    <div class="alert alert-warning mb-0">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        No workspaces found. Please create a workspace first.
                    </div>
                `;
                return;
            }
            
            let html = `
                <label for="workspace-select" class="form-label">Select Workspace</label>
                <select class="form-select workspace-select" id="workspace-select-${selector.id}">
            `;
            
            this.workspaces.forEach(workspace => {
                html += `<option value="${workspace.id}" ${this.currentWorkspace && this.currentWorkspace.id === workspace.id ? 'selected' : ''}>${workspace.name}</option>`;
            });
            
            html += `</select>`;
            selector.innerHTML = html;
            
            // Add event listener to the new select
            const select = document.getElementById(`workspace-select-${selector.id}`);
            select.addEventListener('change', () => {
                const workspaceId = select.value;
                const workspace = this.workspaces.find(w => w.id === workspaceId);
                if (workspace) {
                    this.selectWorkspace(workspace);
                }
            });
        });
    }

    populateSettingsOptions() {
        const workspaceSelect = document.getElementById('settings-default-workspace');
        
        if (!workspaceSelect) return;
        
        let html = `<option value="">Select a workspace</option>`;
        
        this.workspaces.forEach(workspace => {
            html += `<option value="${workspace.id}">${workspace.name}</option>`;
        });
        
        workspaceSelect.innerHTML = html;
    }

    updateStatistics() {
        document.getElementById('stats-workspace-count').textContent = this.workspaces ? this.workspaces.length : 0;
    }

    async createWorkspace() {
        const name = document.getElementById('workspace-name').value;
        const region = document.getElementById('workspace-region').value;
        const subscriptionKey = document.getElementById('subscription-key').value;
        
        if (!name) {
            window.showNotification('Workspace name is required', 'error');
            return;
        }
        
        try {
            window.showLoading(true);
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    billingRegionCode: region,
                    subscriptionKey: subscriptionKey || undefined
                })
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${await response.text()}`);
            }
            
            const workspace = await response.json();
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('workspaceModal')).hide();
            
            // Reload workspaces
            this.loadWorkspaces();
            
            window.showNotification('Workspace created successfully', 'success');
            
        } catch (error) {
            window.showNotification('Failed to create workspace: ' + error.message, 'error');
        } finally {
            window.showLoading(false);
        }
    }

    openWorkspaceModal() {
        // Reset form fields
        document.getElementById('workspace-name').value = '';
        document.getElementById('subscription-key').value = '';
        document.getElementById('workspace-region').value = 'USW';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('workspaceModal'));
        modal.show();
    }
}
