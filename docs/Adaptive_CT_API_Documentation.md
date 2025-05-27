------------------------------------------------------------------------------

 Copyright (c) Microsoft Corporation 2025.
 All rights reserved.

 This code is licensed under the MIT License.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files(the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and / or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions :

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.

------------------------------------------------------------------------------


# Adaptive CT API Documentation

This document provides an overview of the Adaptive CT API endpoints as defined in your collection. Endpoints are grouped by functional area.

---

## 1. Workspace

### Create Workspace
- **Method:** POST
- **URL:** `{{URL}}/api/texttranslator/v1.0/workspaces`
- **Body (JSON):**
  ```json
  {
    "name": "minugurthi-dogfood-interactive",
    "subscription": {
      "billingRegionCode": "USW",
      "subscriptionKey": "{{KEY}}"
    }
  }
  ```

### Get All Workspaces
- **Method:** GET
- **URL:** `{{URL}}/api/texttranslator/v1.0/workspaces/`

### Get Workspace by ID
- **Method:** GET
- **URL:** `{{URL}}/api/texttranslator/v1.0/workspaces/{{WORKSPACE_ID}}`

---

## 2. Document

### Get Documents
- **Method:** GET
- **URL:** `{{URL}}/api/texttranslator/v1.0/documents?workspaceId={{WORKSPACE_ID}}&pageIndex=0`
- **Headers:**
  - `content-type: multipart/form-data`
- **Query Parameters:**
  - `workspaceId`: Workspace ID
  - `pageIndex`: Page index (default: 0)

### TSV Import
- **Method:** POST
- **URL:** `{{URL}}/api/texttranslator/v1.0/documents/import?workspaceId={{WORKSPACE_ID}}`
- **Body (multipart/form-data):**
  - `DocumentDetails`: JSON string
  - `FILES`: TSV file

### Import Job Status
- **Method:** GET
- **URL:** `{{URL}}/api/texttranslator/v1.0/documents/import/jobs/{jobId}`

---

## 3. Index

### Create Index
- **Method:** POST
- **URL:** `{{URL}}/api/texttranslator/v1.0/index?workspaceId={{WORKSPACE_ID}}`
- **Headers:**
  - `content-type: application/json`
- **Body (JSON):**
  ```json
  {
    "documentIds": ["64893"],
    "IndexName": "ecomm-index",
    "SourceLanguage": "en",
    "TargetLanguage": "fr"
  }
  ```

### Delete Index
- **Method:** DELETE
- **URL:** `{{URL}}/api/texttranslator/v1.0/index/{indexId}`

### Get Index by ID
- **Method:** GET
- **URL:** `{{URL}}/api/texttranslator/v1.0/index/{indexId}`

### Get All Indexes
- **Method:** GET
- **URL:** `{{URL}}/api/texttranslator/v1.0/index?workspaceId={{WORKSPACE_ID}}`

---

## 4. Translate

### Adaptive CT Translate
- **Method:** POST
- **URL:** `{{Translator_URL}}?api-version=2025-05-01-preview&trackperformance=true&from=en&to=fr&texttype=Plain&flight=experimental`
- **Body (JSON):**
  ```json
  [
    {
      "Text": "Mani is watching a movie",
      "Script": "",
      "Language": "en",
      "TextType": "Plain",
      "Targets": [
        {
          "Language": "fr",
          "Script": "",
          "ProfanityAction": "NoAction",
          "ProfanityMarker": "Asterisk",
          "DeploymentName": "gpt-4o-mini",
          "AllowFallback": true,
          "Grade": "basic",
          "Tone": "informal",
          "Gender": "neutral",
          "AdaptiveDatasetId": "{{INDEX_NAME}}"
        }
      ]
    }
  ]
  ```

### Adaptive CT Reference Sentences
- **Method:** POST
- **URL:** `{{Translator_URL}}?api-version=2025-05-01-preview&trackperformance=true&from=en&to=fr&texttype=Plain&flight=experimental&options=nocache`
- **Body (JSON):**
  ```json
  [
    {
      "Text": "Princess noor is fond of Pallavi",
      "Script": "",
      "Language": "en",
      "TextType": "Plain",
      "Targets": [
        {
          "Language": "fr",
          "Script": "",
          "ProfanityAction": "NoAction",
          "ProfanityMarker": "Asterisk",
          "DeploymentName": "gpt-4o-mini",
          "AllowFallback": true,
          "Grade": "basic",
          "Tone": "informal",
          "Gender": "neutral",
          "ReferenceTextPairs": [
            { "Source": "Princess noor is fond of Pallavi", "Target": "La princesse Noor affectionne le diamant noir" },
            { "Source": "Pallavi is rare on this planet", "Target": "Le diamant noir est rare sur cette planète." },
            { "Source": "Pallavi is found in african soil", "Target": "Le diamant noir se trouve dans le sol africain" },
            { "Source": "I am going to buy Pallavi", "Target": "Je vais acheter Black Diamond" },
            { "Source": "Pallavi is expensive", "Target": "Le diamant noir coûte cher." }
          ]
        }
      ]
    }
  ]
  ```

---

## Environments & Variables

- `{{URL}}`, `{{WORKSPACE_ID}}`, `{{TRANSLATION_KEY}}`, `{{Token}}`, `{{Translator_URL}}`, `{{GPT_URL}}`, `{{REGION}}`, `{{INDEX_NAME}}`, `{{GPT_KEY}}`
- Set these variables in your environment as needed.

---

## Global Headers

- `llm-endpoint: {{GPT_URL}}`
- `llm-key: {{GPT_KEY}}`
- `Ocp-Apim-Subscription-Key: {{TRANSLATION_KEY}}`
- `Ocp-Apim-Subscription-Region: {{REGION}}`
- `Authorization: Bearer {{Token}}`

---

> **Note:** Replace all `{{VARIABLES}}` with your actual values or environment variables as appropriate.
