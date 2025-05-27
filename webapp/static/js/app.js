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
 * Main application module - coordinates all components
 */

import { ApiClient, PerformanceMonitor, ApiCache, RequestQueue, BrowserInfo } from './components/core.js';
import { NetworkStatus } from './components/network.js';
import { showLoading, showNotification, initializeSidebar, formatFileSize } from './components/ui.js';
import { WorkspaceManager } from './components/workspace.js';
import { DocumentManager } from './components/documents.js';
import { IndexManager } from './components/indices.js';
import { TranslationManager } from './components/translation.js';
import { SettingsManager } from './components/settings.js';

class AdaptiveCTApp {
    constructor() {
        this.initializeGlobalServices();
        this.initializeComponents();
    }    initializeGlobalServices() {
        console.log('Initializing global services...');
        // Initialize core services as global objects for backward compatibility
        window.apiClient = new ApiClient();
        window.performanceMonitor = new PerformanceMonitor();
        window.apiCache = new ApiCache();
        window.requestQueue = new RequestQueue();
        window.browserInfo = new BrowserInfo();
        window.networkStatus = new NetworkStatus();
        
        // Initialize global UI functions
        window.showLoading = showLoading;
        window.showNotification = showNotification;
        window.formatFileSize = formatFileSize;
        
        // Apply browser-specific optimizations
        window.browserInfo.applyOptimizations();
        console.log('Global services initialized');
    }    initializeComponents() {
        console.log('Initializing component managers...');
        // Initialize component managers
        window.workspaceManager = new WorkspaceManager();
        window.documentManager = new DocumentManager();
        window.indexManager = new IndexManager();
        window.translationManager = new TranslationManager();
        window.settingsManager = new SettingsManager();
        console.log('Component managers initialized');
    }

    initializeEventListeners() {
        // Initialize component event listeners
        window.documentManager.initializeEventListeners();
        window.indexManager.initializeEventListeners();
        window.translationManager.initializeEventListeners();
        window.settingsManager.initializeEventListeners();

        // Refresh dashboard
        const btnRefreshDashboard = document.getElementById('btn-refresh-dashboard');
        if (btnRefreshDashboard) {
            btnRefreshDashboard.addEventListener('click', () => {
                // Force refresh from server, bypassing cache
                window.workspaceManager.loadWorkspaces(true);
                
                if (window.workspaceManager.currentWorkspace) {
                    window.documentManager.loadDocuments(window.workspaceManager.currentWorkspace.id, true);
                    window.indexManager.loadIndices(window.workspaceManager.currentWorkspace.id, true);
                }
                
                window.showNotification('Dashboard refreshed', 'success');
            });
        }
    }    async initialize() {
        try {
            console.log('Starting Adaptive CT Application initialization...');
            
            // Add visual indicator
            const statusDiv = document.createElement('div');
            statusDiv.id = 'init-status';
            statusDiv.style.position = 'fixed';
            statusDiv.style.top = '10px';
            statusDiv.style.right = '10px';
            statusDiv.style.background = '#007bff';
            statusDiv.style.color = 'white';
            statusDiv.style.padding = '10px';
            statusDiv.style.borderRadius = '4px';
            statusDiv.style.zIndex = '9999';
            statusDiv.textContent = 'Initializing...';
            document.body.appendChild(statusDiv);
            
            // Initialize UI components first
            console.log('Initializing sidebar...');
            initializeSidebar();
            statusDiv.textContent = 'Sidebar initialized...';
            
            // Initialize network status monitoring
            console.log('Initializing network status...');
            window.networkStatus.init();
            statusDiv.textContent = 'Network status initialized...';
            
            // Load settings first
            console.log('Loading settings...');
            window.settingsManager.loadSettings();
            statusDiv.textContent = 'Settings loaded...';
            
            // Initialize event listeners after all components are ready
            console.log('Initializing event listeners...');
            this.initializeEventListeners();
            statusDiv.textContent = 'Event listeners initialized...';
            
            // Load initial data last
            console.log('Loading workspaces...');
            statusDiv.textContent = 'Loading workspaces...';
            await window.workspaceManager.loadWorkspaces();
            
            console.log('Adaptive CT Application initialized successfully');
            statusDiv.style.background = '#28a745';
            statusDiv.textContent = 'Initialized successfully!';
            
            // Remove status indicator after 3 seconds
            setTimeout(() => {
                if (statusDiv.parentNode) {
                    statusDiv.parentNode.removeChild(statusDiv);
                }
            }, 3000);
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            
            // Show error in status div
            const statusDiv = document.getElementById('init-status');
            if (statusDiv) {
                statusDiv.style.background = '#dc3545';
                statusDiv.textContent = 'Initialization failed: ' + error.message;
            }
            
            if (window.showNotification) {
                window.showNotification('Failed to initialize application: ' + error.message, 'error');
            }
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Adaptive CT App...');
    const app = new AdaptiveCTApp();
    app.initialize();
});
