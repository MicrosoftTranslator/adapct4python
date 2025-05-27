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
 * Translation component
 */

export class TranslationManager {
    constructor() {
        this.translationCount = 0;
    }

    async translateText() {
        // Start performance monitoring
        window.performanceMonitor.startTiming('translate');
        
        const sourceLanguage = document.getElementById('translate-source-language').value;
        const targetLanguage = document.getElementById('translate-target-language').value;
        const sourceText = document.getElementById('source-text').value.trim();
        const useIndex = document.getElementById('use-index-switch').checked;
        const useReferences = document.getElementById('use-references-switch').checked;
        const apiDomain = useIndex ? document.getElementById('translate-index').value : null;

        // Reference pairs for cache key
        let refPairsString = '';
        if (useReferences) {
            const referencePairs = this.collectReferencePairs();
            refPairsString = referencePairs.map(pair => 
                `${pair.Source}:${pair.Target}`
            ).join('|');
        }

        // Create a comprehensive cache key
        const cacheKey = `translate|${sourceLanguage}|${targetLanguage}|${sourceText}|${useIndex ? apiDomain : ''}|${refPairsString}`;

        if (!sourceText) {
            window.showNotification('Please enter text to translate', 'error');
            window.performanceMonitor.endTiming('translate'); // End timing if early return
            return;
        }
        
        // Start timing the cache check
        window.performanceMonitor.startTiming('translate_cache_check');
        
        // Check cache first - using our more robust cache system
        const cachedResult = window.apiCache.get(cacheKey);
        if (cachedResult) {
            window.performanceMonitor.endTiming('translate_cache_check');
            document.getElementById('translation-result').textContent = cachedResult;
            window.showNotification('Translation loaded from cache', 'info');
            window.performanceMonitor.endTiming('translate'); // End timing for entire operation
            return;
        }
        
        window.performanceMonitor.endTiming('translate_cache_check');
        
        // Disable button and show spinner
        const btnTranslate = document.getElementById('btn-translate');
        btnTranslate.disabled = true;
        const originalBtnHtml = btnTranslate.innerHTML;
        btnTranslate.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Translating...';

        // Implement proper debouncing
        if (window.lastTranslateTimeout) {
            clearTimeout(window.lastTranslateTimeout);
        }
        
        // Store the abort controller for cancelling previous requests
        if (window.activeTranslateController) {
            window.activeTranslateController.abort();
        }
        
        window.activeTranslateController = new AbortController();
        const signal = window.activeTranslateController.signal;
        
        window.lastTranslateTimeout = setTimeout(async () => {
            try {
                window.showLoading(true);

                // Build query parameters - Add proper URLSearchParams for better encoding
                const translateParams = new URLSearchParams({
                    from: sourceLanguage,
                    to: targetLanguage
                }).toString();

                // Build request body with optimized structure
                const translateBody = [{
                    Text: sourceText,
                    Script: "",
                    Language: sourceLanguage,
                    TextType: "Plain",
                    Targets: [{                        Language: targetLanguage,
                        Script: "",
                        ProfanityAction: "NoAction",
                        ProfanityMarker: "Asterisk",
                        DeploymentName: window.appConfig?.gptDeploymentName, // ex: gpt-4o-mini
                        AllowFallback: true,
                        Grade: "basic",
                        Tone: "informal",
                        Gender: "neutral"
                    }]
                }];
            
                // Add index if needed
                if (useIndex && apiDomain) {
                    translateBody[0].Targets[0].AdaptiveDatasetId = apiDomain;
                }

                // Add reference pairs if enabled
                if (useReferences) {
                    const referencePairs = this.collectReferencePairs();
                    
                    if (referencePairs.length > 0) {
                        translateBody[0].Targets[0].ReferenceTextPairs = referencePairs;
                    } else {
                        window.showNotification('No valid reference pairs found. Please enter at least one valid pair.', 'warning');
                    }
                }
                
                // Make API call through the request queue with timeout and abort controller
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                
                const response = await window.requestQueue.executeRequest(async () => {
                    return fetch(`/api/translate?${translateParams}`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest', // Helps prevent CSRF issues
                            'Cache-Control': 'no-cache' // Ensure fresh response
                        },
                        body: JSON.stringify(translateBody),
                        signal: controller.signal
                    });
                });
                
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Error ${response.status}: ${errorText}`);
                }

                const result = await response.json();

                if (result && result[0] && result[0].translations && result[0].translations[0]) {
                    const translationText = result[0].translations[0].text;
                    document.getElementById('translation-result').textContent = translationText;
                    
                    // Store in our better cache system
                    window.apiCache.set(cacheKey, translationText);
                    
                    this.translationCount++;
                    this.updateStatistics();
                    
                    // End timing for translation
                    const duration = window.performanceMonitor.endTiming('translate');
                    
                    // If it was fast, show response time in notification
                    if (duration < 1000) {
                        window.showNotification(`Translation completed in ${duration.toFixed(0)}ms`, 'success');
                    } else {
                        window.showNotification(`Translation completed in ${(duration/1000).toFixed(1)}s`, 'success');
                    }
                } else {
                    window.performanceMonitor.endTiming('translate');
                    throw new Error('Invalid translation response format');
                }

            } catch (error) {
                // End timing even on error
                if (window.performanceMonitor.metrics['translate'] && !window.performanceMonitor.metrics['translate'].endTime) {
                    window.performanceMonitor.endTiming('translate');
                }
                
                // Don't show error for aborted requests (when user is typing quickly)
                if (error.name !== 'AbortError') {
                    window.showNotification('Translation failed: ' + error.message, 'error');
                }
            } finally {
                window.showLoading(false);
                btnTranslate.disabled = false;
                btnTranslate.innerHTML = originalBtnHtml;
                window.activeTranslateController = null;
            }
        }, 500); // Increased to 500ms for better debouncing
    }

    collectReferencePairs() {
        const referencePairs = [];
        const sourceRefs = document.querySelectorAll('.source-reference');
        const targetRefs = document.querySelectorAll('.target-reference');
        
        for (let i = 0; i < sourceRefs.length; i++) {
            const sourceText = sourceRefs[i].value.trim();
            const targetText = targetRefs[i].value.trim();
            if (sourceText && targetText) {
                referencePairs.push({ Source: sourceText, Target: targetText });
            }
        }
        
        return referencePairs;
    }

    clearTranslation() {
        document.getElementById('source-text').value = '';
        document.getElementById('translation-result').textContent = 'Translation will appear here...';
        window.showNotification('Translation cleared', 'info');
    }

    updateStatistics() {
        document.getElementById('stats-translation-count').textContent = this.translationCount;
    }

    initializeReferencePairs() {
        const referencePairsContainer = document.getElementById('reference-pairs');
        if (!referencePairsContainer) return;
        
        // Clear existing content
        referencePairsContainer.innerHTML = '';
        
        // Add a sample reference pair
        const samplePairs = [
            {
                source: "Keeping tabs on general, minor, and standard maintenance is one of the best ways to help extend the life of your Volkswagen.",
                target: "Die Überwachung der allgemeinen, geringfügigen und standardmäßigen Wartung ist eine der besten Möglichkeiten, um die Lebensdauer Ihres Volkswagen zu verlängern."
            }
        ];
        
        samplePairs.forEach(pair => {
            const pairElement = document.createElement('div');
            pairElement.className = 'reference-pair card p-3 mb-3';
            pairElement.innerHTML = `
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <label class="form-label">Source Reference</label>
                        <textarea class="form-control source-reference" rows="2" placeholder="Enter source reference text">${pair.source}</textarea>
                    </div>
                    <div class="col-md-6 mb-2">
                        <label class="form-label">Target Reference</label>
                        <textarea class="form-control target-reference" rows="2" placeholder="Enter target reference text">${pair.target}</textarea>
                    </div>
                </div>
                <div class="text-end">
                    <button class="btn btn-sm btn-outline-danger remove-pair">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            `;
            
            referencePairsContainer.appendChild(pairElement);
        });
        
        // Show a hint
        window.showNotification('Sample reference pair added. Add more pairs or modify as needed.', 'info');
    }

    addReferencePair() {
        const referencePairsContainer = document.getElementById('reference-pairs');
        
        if (!referencePairsContainer) return;
        
        const newPair = document.createElement('div');
        newPair.className = 'reference-pair card p-3 mb-3';
        newPair.innerHTML = `
            <div class="row">
                <div class="col-md-6 mb-2">
                    <label class="form-label">Source Reference</label>
                    <textarea class="form-control source-reference" rows="2" placeholder="Enter source reference text"></textarea>
                </div>
                <div class="col-md-6 mb-2">
                    <label class="form-label">Target Reference</label>
                    <textarea class="form-control target-reference" rows="2" placeholder="Enter target reference text"></textarea>
                </div>
            </div>
            <div class="text-end">
                <button class="btn btn-sm btn-outline-danger remove-pair">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
        
        referencePairsContainer.appendChild(newPair);
    }

    initializeEventListeners() {
        // Translation functions
        const btnTranslate = document.getElementById('btn-translate');
        const btnClearTranslation = document.getElementById('btn-clear-translation');
        const btnQuickTranslate = document.getElementById('btn-quick-translate');
        
        if (btnTranslate) {
            btnTranslate.addEventListener('click', () => this.translateText());
        }
        
        if (btnClearTranslation) {
            btnClearTranslation.addEventListener('click', () => this.clearTranslation());
        }
        
        if (btnQuickTranslate) {
            btnQuickTranslate.addEventListener('click', () => {
                document.getElementById('nav-translate-tab').click();
            });
        }

        // Use index switch
        const useIndexSwitch = document.getElementById('use-index-switch');
        if (useIndexSwitch) {
            useIndexSwitch.addEventListener('change', function() {
                document.getElementById('index-selection-container').style.display = 
                    this.checked ? 'block' : 'none';
            });
        }
        
        // Reference Pairs functionality
        const useReferencesSwitch = document.getElementById('use-references-switch');
        if (useReferencesSwitch) {
            useReferencesSwitch.addEventListener('change', () => {
                const referencePairsContainer = document.getElementById('reference-pairs-container');
                referencePairsContainer.style.display = useReferencesSwitch.checked ? 'block' : 'none';
                
                // If enabled and no reference pairs exist yet, add the first sample pair
                if (useReferencesSwitch.checked) {
                    const existingPairs = document.querySelectorAll('.reference-pair');
                    if (existingPairs.length === 0) {
                        // Add a sample reference pair to help the user understand the feature
                        this.initializeReferencePairs();
                    }
                }
            });
        }
        
        const addReferencePairBtn = document.getElementById('add-reference-pair');
        if (addReferencePairBtn) {
            addReferencePairBtn.addEventListener('click', () => this.addReferencePair());
        }
        
        // Add event delegation for removing reference pairs
        const referencePairsContainer = document.getElementById('reference-pairs');
        if (referencePairsContainer) {
            referencePairsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-pair') || e.target.parentElement.classList.contains('remove-pair')) {
                    const button = e.target.closest('.remove-pair');
                    if (button) {
                        const pairElement = button.closest('.reference-pair');
                        if (pairElement) {
                            pairElement.remove();
                        }
                    }
                }
            });
        }
    }
}
