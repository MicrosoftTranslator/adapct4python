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
 * Settings management component
 */

export class SettingsManager {
    constructor() {
        this.settings = {};
    }

    saveSettings() {
        const displayName = document.getElementById('settings-display-name').value;
        const defaultWorkspace = document.getElementById('settings-default-workspace').value;
        const defaultSource = document.getElementById('settings-default-source').value;
        const defaultTarget = document.getElementById('settings-default-target').value;
        const darkMode = document.getElementById('settings-dark-mode').checked;
        
        // Save to local storage
        this.settings = {
            displayName,
            defaultWorkspace,
            defaultSource,
            defaultTarget,
            darkMode
        };
        
        localStorage.setItem('adaptiveCTSettings', JSON.stringify(this.settings));
        
        // Apply settings
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Set default source and target languages in translate tab
        document.getElementById('translate-source-language').value = defaultSource;
        document.getElementById('translate-target-language').value = defaultTarget;
        
        // Select default workspace if set
        if (defaultWorkspace) {
            const workspace = window.workspaceManager.workspaces.find(w => w.id === defaultWorkspace);
            if (workspace) {
                window.workspaceManager.selectWorkspace(workspace);
            }
        }
        
        window.showNotification('Settings saved successfully', 'success');
    }

    loadSettings() {
        const settingsString = localStorage.getItem('adaptiveCTSettings');
        if (!settingsString) return;
        
        try {
            this.settings = JSON.parse(settingsString);
            
            // Apply settings
            if (this.settings.displayName) {
                const displayNameElement = document.getElementById('settings-display-name');
                if (displayNameElement) {
                    displayNameElement.value = this.settings.displayName;
                }
            }
            
            if (this.settings.defaultWorkspace) {
                const defaultWorkspaceElement = document.getElementById('settings-default-workspace');
                if (defaultWorkspaceElement) {
                    defaultWorkspaceElement.value = this.settings.defaultWorkspace;
                }
            }
            
            if (this.settings.defaultSource) {
                const defaultSourceElement = document.getElementById('settings-default-source');
                const translateSourceElement = document.getElementById('translate-source-language');
                if (defaultSourceElement) {
                    defaultSourceElement.value = this.settings.defaultSource;
                }
                if (translateSourceElement) {
                    translateSourceElement.value = this.settings.defaultSource;
                }
            }
            
            if (this.settings.defaultTarget) {
                const defaultTargetElement = document.getElementById('settings-default-target');
                const translateTargetElement = document.getElementById('translate-target-language');
                if (defaultTargetElement) {
                    defaultTargetElement.value = this.settings.defaultTarget;
                }
                if (translateTargetElement) {
                    translateTargetElement.value = this.settings.defaultTarget;
                }
            }
            
            if (this.settings.darkMode) {
                const darkModeElement = document.getElementById('settings-dark-mode');
                if (darkModeElement) {
                    darkModeElement.checked = this.settings.darkMode;
                    document.body.classList.add('dark-mode');
                }
            }
            
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    initializeEventListeners() {
        // Settings save button
        const btnSaveSettings = document.getElementById('btn-save-settings');
        if (btnSaveSettings) {
            btnSaveSettings.addEventListener('click', () => this.saveSettings());
        }
    }
}
