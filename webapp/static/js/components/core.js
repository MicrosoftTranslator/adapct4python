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
 * Core utilities and services for the Adaptive CT Application
 * Includes: API client, performance monitoring, caching, request queue, browser detection
 */

export class ApiClient {
    constructor() {
        this.defaultOptions = {
            cacheKey: null,
            retries: 2,
            retryDelay: 1000,
            timeout: 30000,
            forceRefresh: false,
            background: false
        };
    }

    async request(url, options = {}) {
        const config = { ...this.defaultOptions, ...options };
        
        // Don't attempt if we're offline
        if (!window.networkStatus.isOnline && !config.background) {
            window.showNotification('Cannot make request while offline', 'error');
            return Promise.reject(new Error('Offline'));
        }
        
        // Check cache first if we have a cache key
        if (config.cacheKey && !config.forceRefresh) {
            const cachedData = window.apiCache.get(config.cacheKey);
            if (cachedData) {
                return Promise.resolve(cachedData);
            }
        }
        
        // Show loading unless in background
        if (!config.background) {
            window.showLoading(true);
        }
        
        // Start performance timing
        window.performanceMonitor.startTiming(`api_${config.cacheKey || url}`);
        
        // Create fetch options with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        const fetchOptions = {
            ...config.fetchOptions,
            signal: controller.signal,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-cache',
                ...(config.fetchOptions?.headers || {})
            }
        };
        
        // Attempt request with retries
        let attempt = 0;
        let lastError = null;
        
        while (attempt <= config.retries) {
            try {
                // Submit via the request queue for concurrency control
                const response = await window.requestQueue.executeRequest(async () => {
                    return fetch(url, fetchOptions);
                });
                
                clearTimeout(timeoutId);
                
                // Handle non-200 responses
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Error ${response.status}: ${errorText}`);
                }
                
                // Parse response based on content type
                let data;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }
                
                // Store in cache if we have a cache key
                if (config.cacheKey) {
                    window.apiCache.set(config.cacheKey, data);
                }
                
                // End performance timing
                window.performanceMonitor.endTiming(`api_${config.cacheKey || url}`);
                
                // Hide loading unless in background
                if (!config.background) {
                    window.showLoading(false);
                }
                
                return data;
                
            } catch (error) {
                lastError = error;
                
                // Don't retry if canceled or offline
                if (error.name === 'AbortError' || !window.networkStatus.isOnline) {
                    break;
                }
                
                // Only retry if we haven't exceeded retry limit
                if (attempt < config.retries) {
                    // Exponential backoff with jitter
                    const delay = Math.min(
                        config.retryDelay * Math.pow(2, attempt) * (0.8 + Math.random() * 0.4),
                        10000 // Cap max delay at 10 seconds
                    );
                    
                    console.log(`Retrying request (${attempt+1}/${config.retries}) after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                attempt++;
            }
        }
        
        // If all retries failed, end timing and reject
        window.performanceMonitor.endTiming(`api_${config.cacheKey || url}`);
        
        // Hide loading unless in background
        if (!config.background) {
            window.showLoading(false);
        }
        
        throw lastError || new Error('Request failed after all retry attempts');
    }
}

export class PerformanceMonitor {
    constructor() {
        this.metrics = {};
    }

    startTiming(operationName) {
        this.metrics[operationName] = {
            startTime: performance.now()
        };
    }
    
    endTiming(operationName) {
        if (!this.metrics[operationName]) {
            console.warn(`No timing data found for operation: ${operationName}`);
            return null;
        }
        
        const endTime = performance.now();
        const duration = endTime - this.metrics[operationName].startTime;
        
        this.metrics[operationName].endTime = endTime;
        this.metrics[operationName].duration = duration;
        
        // Log to console
        console.log(`Performance: ${operationName} - ${duration.toFixed(2)}ms`);
        
        // Store in localStorage for analysis
        try {
            const perfHistory = JSON.parse(localStorage.getItem('performanceMetrics') || '{}');
            if (!perfHistory[operationName]) {
                perfHistory[operationName] = [];
            }
            
            // Only keep last 10 measurements
            if (perfHistory[operationName].length >= 10) {
                perfHistory[operationName].shift();
            }
            
            perfHistory[operationName].push({
                timestamp: new Date().toISOString(),
                duration: duration
            });
            
            localStorage.setItem('performanceMetrics', JSON.stringify(perfHistory));
        } catch (e) {
            console.warn('Failed to store performance metrics', e);
        }
        
        return duration;
    }
}

export class ApiCache {
    constructor() {
        this.data = {};
        this.maxAge = 5 * 60 * 1000; // 5 minutes default
        this.init();
    }

    set(key, value) {
        this.data[key] = {
            timestamp: Date.now(),
            value: value
        };
        // Store in localStorage for persistence between sessions
        try {
            localStorage.setItem('apiCache', JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to store cache in localStorage', e);
        }
    }
    
    get(key) {
        const entry = this.data[key];
        if (!entry) return null;
        
        // Check if entry is expired
        if (Date.now() - entry.timestamp > this.maxAge) {
            delete this.data[key];
            return null;
        }
        
        return entry.value;
    }
    
    clear() {
        this.data = {};
        localStorage.removeItem('apiCache');
    }
    
    init() {
        try {
            const stored = localStorage.getItem('apiCache');
            if (stored) {
                this.data = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load cache from localStorage', e);
            this.data = {};
        }
    }
}

export class RequestQueue {
    constructor() {
        this.queue = [];
        this.concurrentLimit = 3;
        this.activeRequests = 0;
    }

    add(requestFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                request: requestFn,
                resolve: resolve,
                reject: reject
            });
            this.processQueue();
        });
    }
    
    processQueue() {
        if (this.activeRequests >= this.concurrentLimit) {
            return;
        }
        const nextRequest = this.queue.shift();
        if (!nextRequest) {
            return;
        }
        this.activeRequests++;
        Promise.resolve(nextRequest.request())
            .then(result => {
                nextRequest.resolve(result);
            })
            .catch(error => {
                nextRequest.reject(error);
            })
            .finally(() => {
                this.activeRequests--;
                this.processQueue();
            });
    }
    
    executeRequest(requestFn) {
        return this.add(requestFn);
    }
}

export class BrowserInfo {
    constructor() {
        this.userAgent = navigator.userAgent;
        this.isChrome = navigator.userAgent.indexOf("Chrome") > -1;
        this.isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
        this.isSafari = navigator.userAgent.indexOf("Safari") > -1 && navigator.userAgent.indexOf("Chrome") === -1;
        this.isEdge = navigator.userAgent.indexOf("Edg") > -1;
        this.isIE = navigator.userAgent.indexOf("MSIE") > -1 || navigator.userAgent.indexOf("Trident") > -1;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    getBrowserName() {
        if (this.isEdge) return 'Edge';
        if (this.isChrome) return 'Chrome';
        if (this.isFirefox) return 'Firefox';
        if (this.isSafari) return 'Safari';
        if (this.isIE) return 'Internet Explorer';
        return 'Unknown';
    }
    
    applyOptimizations() {
        // Set request concurrency based on browser
        if (this.isChrome || this.isEdge) {
            window.requestQueue.concurrentLimit = 6;
        } else if (this.isFirefox) {
            window.requestQueue.concurrentLimit = 4;
        } else if (this.isSafari) {
            window.requestQueue.concurrentLimit = 4;
        } else {
            window.requestQueue.concurrentLimit = 2;
        }
        
        // Adjust cache max age based on device
        if (this.isMobile) {
            window.apiCache.maxAge = 10 * 60 * 1000; // 10 minutes for mobile
        }
        
        console.log(`Browser optimizations applied: ${this.getBrowserName()}, Mobile: ${this.isMobile}, Concurrency: ${window.requestQueue.concurrentLimit}`);
    }
}
