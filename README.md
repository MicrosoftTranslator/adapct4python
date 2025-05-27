# Adaptive Custom Translation (Preview)​ - Python web app

A modern web application for Adaptive Custom Translation (Adaptive Custom Translation) that provides document management, translation services, and adaptive dataset management through an intuitive user interface.

# Business Value for the User​

Adaptive Custom Translation is a cutting-edge translation feature leveraging LLM to provide users with adaptive, context-aware translations across multiple languages. This feature aims to deliver high-accuracy translations by learning from user shared few samples and adapting to specific contexts and terminologies. ​

# Feature Details​ for the User​

- Provide a system that enables users to upload/manage files containing few sentences of human translated pre-aligned source-to-target in TSV file format (TMX support coming at GA). ​

- Enable users to select one file to create language pair special dataset index to ground the translation quality with few-shot examples. ​

- Enable users to create multiple dataset indexes for the same language pair and be able to reference the right dataset index during translation.​

- Enable users to use their own AI Foundry subscription and deployed LLM (in preview, only gpt-4o and gpt-4o-mini are supported – more at GA)​

- Users can ground the translation with five pre-aligned sentence pairs  instead of creating the dataset index; the latter is recommended.​

# Key User Benefits

- No fine-tuning, no model deployment and no model maintenance. ​

- Translation results reflects well your business terminology and data in style, tone, and voice with few samples generated from your dataset.​

- In few minutes, your dataset index is updated with your data and ready to use vs. Custom Translation up to 48 hours training.​

- Five pre-aligned sentence pairs is the minimum requirement to create a dataset index vs. Custom Translation 10,000 sentence pairs  to train quality model.​

​> [!IMPORTANT]  
> This feature is currently **GATED** untill the end of September, 2025.
> If you are interested to join the preview, send email to `translator@microsoft.com` with the following information:
>
> Email subject: Adaptive Custom Translation
> - Company name
> - Company website
> - Business use case
> 
> We are inviting twenty (20) S500 customers to join the feature evaluation and share their feedback. If you are amongst the first (20) customers, you will receive email response within two (2) weeks with details on how to join.
>
> `NOTE: Customer deployed GPT-4o or GPT-4o-mini is required.`


## Web App Features

- **Document Management**: Upload, import, and manage translation documents
- **Translation Services**: Translate text using Azure Cognitive Services with adaptive datasets
- **Workspace Management**: Organize documents into workspaces
- **Index Management**: Create and manage adaptive translation indices
- **User Authentication**: Secure access using Azure authentication tokens
- **Modern UI**: Responsive web interface built with Bootstrap 5

## Technology Stack

- **Backend**: Python Flask
- **Frontend**: HTML5, Bootstrap 5, Vanilla JavaScript (ES6 modules)
- **Authentication**: Microsoft Authentication Library (MSAL)
- **APIs**: Azure Cognitive Services, Custom Translator API
- **Session Management**: Flask-Session with filesystem storage

## Prerequisites

- Python 3.8 or higher
- Azure subscription with:
  - Custom Translator service
  - Cognitive Services (for translation)
  - Azure OpenAI service (for GPT deployment)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "adapct4python"
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Copy the `.env_template` file to `.env` and configure the following variables:
   
   ```bash
   cp .env_template .env
   ```
   
   Edit `.env` with your Azure service credentials:
   
   ```env
   API_URL=to-be-shared-with-selected-customers
   TRANSLATION_KEY=your-translation-key
   TRANSLATOR_URL=https://api.cognitive.microsofttranslator.com/translate
   GPT_URL=your-gpt-endpoint
   REGION=your-azure-region
   GPT_KEY=your-gpt-api-key
   GPT_DEPLOYMENT_NAME=your-gpt-deployment-name
   SECRET_KEY=your-secret-key-for-sessions
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_URL` | Adaptive Custom Translation API endpoint | Yes |
| `TRANSLATION_KEY` | Azure Translation subscription key | Yes |
| `TRANSLATOR_URL` | Translator service endpoint | Yes |
| `GPT_URL` | Azure OpenAI endpoint | Yes |
| `GPT_KEY` | Azure OpenAI API key | Yes |
| `GPT_DEPLOYMENT_NAME` | OpenAI deployment name | Yes |
| `REGION` | Azure region | Yes |
| `SECRET_KEY` | Flask session secret key | No (defaults to a fixed key) |

## Running the Application

1. **Ensure virtual environment is activated**
   ```bash
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```

2. **Start the Flask application**
   ```bash
   python app.py
   ```

3. **Access the application**
   
   Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

## Application Structure

```
├── app.py                          # Main Flask application
├── auth_helper.py                  # Authentication utilities
├── requirements.txt                # Python dependencies
├── .env                           # Environment configuration (create from template)
├── .env_template                  # Environment template
├── webapp/                        # Web application assets
│   ├── static/
│   │   ├── css/                   # Stylesheets
│   │   │   ├── modern-styles.css  # Main application styles
│   │   │   └── styles.css         # Additional styles
│   │   └── js/                    # JavaScript modules
│   │       ├── app.js             # Main application entry point
│   │       └── components/        # Modular components
│   │           ├── core.js        # Core functionality
│   │           ├── documents.js   # Document management
│   │           ├── indices.js     # Index management
│   │           ├── network.js     # API communication
│   │           ├── settings.js    # Settings management
│   │           ├── translation.js # Translation services
│   │           ├── ui.js          # UI utilities
│   │           └── workspace.js   # Workspace management
│   └── templates/
│       ├── index.html             # Main application template
│       ├── token_entry.html       # Authentication page
│       └── error.html             # Error page template
└── docs/                          # Documentation
    ├── Adaptive_CT_API_Documentation.md
    └── adaptive-ct-api-docs.html
```

## Usage

### Authentication

1. When you first access the application, you'll be redirected to the token entry page
2. Enter your user access token and optional user information
3. Click "Authenticate" to access the main application

​> [!NOTE]  
> To find your user access token, `Sign-in` to [Custom Translator portal](https://portal.customtranslator.azure.ai/workspaces).
> - [using Edge or Chrome] Launch the developer tool (control-shift-I).
> - From the developer tool, select Network tab.
> - Select any project from the default workspace.
> - In the network tab under Name, select **documents?workspaceid=...**.
> - From Headers > Authorization > Bearer, copy the bearer token only without "Bearer" and pasted in step #2.

### Document Management

1. **Upload Documents**: Use the "Import Documents" feature to upload files
2. **View Documents**: Browse uploaded documents in the Documents tab
3. **Organize**: Group documents into workspaces for better organization

### Translation

1. **Quick Translation**: Use the translation panel to translate text directly
2. **Adaptive Translation**: Create indices from your documents to improve translation quality
3. **Batch Translation**: Process multiple documents using adaptive datasets

### Index Management

1. **Create Index**: Use uploaded documents to create adaptive translation indices
2. **Monitor Progress**: Track index creation status in real-time
3. **Use in Translation**: Apply indices to improve translation accuracy

## API Endpoints

The application provides several REST API endpoints:

- `GET /api/workspaces` - List all workspaces
- `GET /api/documents` - List documents
- `POST /api/documents/import` - Import new documents
- `GET /api/index` - List translation indices
- `POST /api/index` - Create new index
- `POST /api/translate` - Translate text
- `GET /api/user` - Get current user information
- `GET /api/health` - Health check endpoint

## Configuration Features

### Dynamic GPT Deployment

The application supports dynamic GPT deployment configuration:
- The GPT deployment name is loaded from the `.env` file (`GPT_DEPLOYMENT_NAME`)
- This allows switching between different OpenAI deployments without code changes
- Fallback to "gpt-4o-mini" if not configured

### Session Management

- Sessions are stored in the filesystem for persistence across server restarts
- 30-minute session timeout for security
- Automatic token refresh and validation

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your Azure tokens are valid and not expired
   - Check that all required environment variables are set
   - Ensure your Azure services are properly configured

2. **Translation Failures**
   - Verify `TRANSLATION_KEY` and `TRANSLATOR_URL` are correct
   - Check that your Azure Cognitive Services subscription is active
   - Ensure the target language is supported

3. **Index Creation Issues**
   - Verify documents are properly uploaded before creating indices
   - Check that the Custom Translator API endpoint is accessible
   - Ensure your subscription has sufficient quota

### Debug Mode

To run the application in debug mode for development:

```bash
export FLASK_ENV=development  # On Windows: set FLASK_ENV=development
python app.py
```

## Development

### Adding New Features

1. **Backend**: Add new routes in `app.py`
2. **Frontend**: Create new components in `webapp/static/js/components/`
3. **Styles**: Add CSS to `webapp/static/css/modern-styles.css`
4. **Templates**: Modify or create templates in `webapp/templates/`

### Code Structure

- The application uses a modular JavaScript architecture with ES6 modules
- Each major feature is separated into its own component file
- The Flask backend provides REST APIs consumed by the frontend
- Authentication is handled separately in `auth_helper.py`

## Security Considerations

- All API requests require authentication tokens
- Sessions are secured with secret keys
- CORS is enabled for cross-origin requests
- Sensitive information is stored in environment variables

## License

[Add your license information here]

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the API documentation in `Adaptive_CT_API_Documentation.md`
3. Contact your Azure administrator for service-related issues
