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
 * Network status monitoring component
 */

export class NetworkStatus {
    constructor() {
        this.isOnline = navigator.onLine;
    }

    init() {
        // Set initial status
        this.isOnline = navigator.onLine;
        this.updateUI();
        
        // Add event listeners
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateUI();
            window.showNotification('Connection restored. You are now online.', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateUI();
            window.showNotification('You are offline. Some features may be unavailable.', 'warning');
        });
        
        // Periodic connection check
        setInterval(() => this.checkConnection(), 30000);
    }
    
    checkConnection() {
        // Simple fetch to check if we're really connected
        if (navigator.onLine) {
            fetch('/api/health', { 
                method: 'HEAD',
                cache: 'no-cache',
                timeout: 3000
            })
            .then(() => {
                if (!this.isOnline) {
                    this.isOnline = true;
                    this.updateUI();
                    window.showNotification('Connection restored', 'success');
                }
            })
            .catch(() => {
                if (this.isOnline) {
                    this.isOnline = false;
                    this.updateUI();
                    window.showNotification('Connection problem detected', 'warning');
                }
            });
        }
    }
    
    updateUI() {
        // Update UI to show connection status
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.innerHTML = this.isOnline 
                ? '<span class="badge bg-success">Online</span>' 
                : '<span class="badge bg-danger">Offline</span>';
        }
        
        // Disable certain buttons when offline
        const apiButtons = document.querySelectorAll('.requires-connection');
        apiButtons.forEach(button => {
            button.disabled = !this.isOnline;
            if (!this.isOnline) {
                button.setAttribute('title', 'Currently offline');
            } else {
                button.removeAttribute('title');
            }
        });
    }
}
