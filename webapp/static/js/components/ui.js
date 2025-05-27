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
 * UI utility functions
 */

export function showLoading(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (!loadingIndicator) {
        // Create loading indicator if it doesn't exist
        const indicator = document.createElement('div');
        indicator.id = 'loading-indicator';
        indicator.className = 'position-fixed top-0 start-0 end-0 bottom-0 d-flex justify-content-center align-items-center bg-dark bg-opacity-25 z-3 d-none';
        indicator.style.zIndex = '9999';
        indicator.innerHTML = `
            <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        document.body.appendChild(indicator);
        // Now get the newly created element
        const newLoadingIndicator = document.getElementById('loading-indicator');
        if (isLoading) {
            newLoadingIndicator.classList.remove('d-none');
        } else {
            newLoadingIndicator.classList.add('d-none');
        }
    } else {
        if (isLoading) {
            loadingIndicator.classList.remove('d-none');
        } else {
            loadingIndicator.classList.add('d-none');
        }
    }
    // Also update the cursor for better UX
    document.body.style.cursor = isLoading ? 'wait' : 'default';
}

export function showNotification(message, type) {
    const alert = document.getElementById('notification-alert');
    const messageElement = document.getElementById('notification-message');
    
    if (!alert || !messageElement) return;
    
    // Set classes based on type
    alert.classList.remove('d-none', 'alert-success', 'alert-danger', 'alert-warning', 'alert-info');
    
    switch (type) {
        case 'success':
            alert.classList.add('alert-success');
            break;
        case 'error':
            alert.classList.add('alert-danger');
            break;
        case 'warning':
            alert.classList.add('alert-warning');
            break;
        default:
            alert.classList.add('alert-info');
    }
    
    // Set message and show
    messageElement.textContent = message;
    alert.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        alert.classList.add('d-none');
    }, 5000);
}

export function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('sidebar-collapsed');
        });
    }
}

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
