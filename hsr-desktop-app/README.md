# HSR Construction Estimator - Desktop Application

A professional Windows desktop application for construction cost estimation powered by AI, featuring secure licensing, modern UI, and comprehensive project management capabilities.

## 🚀 Features

### Core Functionality
- **AI-Powered Estimation**: Advanced AI algorithms for accurate cost estimation
- **RAG Knowledge Base**: Upload documents and leverage semantic search
- **Professional Drawings**: Generate technical CAD drawings with professional standards
- **Step-by-Step Workflow**: Guided process from scoping to final estimate
- **Multi-Project Management**: Handle multiple construction projects simultaneously

### Security & Licensing
- **Secure Licensing System**: Machine-specific license keys with expiration
- **7-Day Trial**: Full-featured trial period for evaluation
- **Local Data Processing**: All sensitive data processed locally
- **Encrypted Storage**: Secure local data storage

### Modern UI/UX
- **Beautiful Interface**: Modern, professional design with dark/light themes
- **Responsive Layout**: Optimized for various screen sizes
- **Smooth Animations**: Framer Motion powered animations
- **Native Windows Integration**: Custom title bar and window controls

## 📋 System Requirements

- **Operating System**: Windows 10/11 (64-bit)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 2GB available space
- **Network**: Internet connection for AI services and updates

## 🛠️ Installation

### For End Users
1. Download the installer from the releases page
2. Run the installer and follow the setup wizard
3. Launch the application
4. Enter your license key or start a trial

### For Developers
1. Clone the repository
2. Install dependencies:
   ```bash
   cd hsr-desktop-app
   npm install
   ```
3. Start development:
   ```bash
   npm run dev
   ```

## 🔑 Licensing

### Trial Mode
- 7-day full-featured trial
- No limitations during trial period
- One trial per machine

### License Generation
Generate a license key for a specific machine:

```bash
# Get current machine ID
node scripts/generate-license.js --current-machine

# Generate license for 365 days
node scripts/generate-license.js <MACHINE_ID> 365

# Generate license with specific features
node scripts/generate-license.js <MACHINE_ID> 30 basic,design
```

### License Features
- **Full**: All features enabled
- **Basic**: Core estimation features
- **Design**: Includes design generation
- **Drawing**: Includes technical drawing generation

## 🏗️ Project Workflow

### Step 1: Project Scoping
- AI-assisted conversation to define project requirements
- Upload reference documents (PDF, Word, Excel)
- Context-aware discussions with memory
- Voice input support

### Step 2: Component Design
- Generate detailed component designs with specifications
- Material and dimension calculations
- Design editing and improvement
- HTML export functionality

### Step 3: Technical Drawing
- AI-powered drawing instruction generation
- Professional CAD drawing creation in DXF format
- Automatic dimensioning and annotations
- Multi-format export (DXF, PNG, PDF)

### Step 4: Cost Estimation
- AI-powered semantic search (no manual keyword generation)
- HSR database integration
- Accurate cost calculations
- Professional estimate formatting

### Step 5: Review & Export
- Complete project review
- Multiple export formats
- Project sharing capabilities

## 🧠 AI Integration

### Supported LLM Providers
- **Google Gemini**: Gemini 2.5 Pro/Flash models
- **OpenAI**: GPT-4 and GPT-5 models
- **Moonshot AI**: Kimi K2 model
- **OpenRouter**: Access to multiple AI models

### RAG Knowledge Base
- Upload PDF, Word, Excel, and text files
- Semantic search with ChromaDB/FAISS
- Context-aware document retrieval
- Local processing for privacy

## 🔧 Configuration

### API Keys
Configure AI provider API keys in Settings:
- Gemini API Key
- OpenAI API Key
- Moonshot API Key
- OpenRouter API Key

### Theme Settings
- Light theme
- Dark theme
- System theme (follows OS preference)

### Application Settings
- Auto-save projects
- Enable notifications
- Performance settings

## 📁 Project Structure

```
hsr-desktop-app/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React frontend
│   └── shared/         # Shared utilities (licensing, etc.)
├── assets/             # Application assets
├── scripts/            # Build and utility scripts
├── dist/              # Built application
└── release/           # Packaged releases
```

## 🔒 Security Features

### Data Protection
- All project data stored locally
- Encrypted license storage
- Secure API key management
- No external data transmission (except AI APIs)

### License Protection
- Machine-specific license keys
- Encrypted license validation
- Trial period enforcement
- Feature-based licensing

## 🚀 Building & Distribution

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Windows Installer
```bash
npm run build:win
```

### Portable Version
```bash
npm run build:win-portable
```

## 📞 Support

### License Issues
- Verify machine ID matches license
- Check license expiration date
- Contact support for license renewal

### Technical Support
- Check system requirements
- Verify API key configuration
- Review application logs

### Feature Requests
- Submit feature requests through support channels
- Provide detailed use case descriptions
- Include mockups or examples if applicable

## 🔄 Updates

### Automatic Updates
- Application checks for updates on startup
- Automatic download and installation
- Notification of available updates

### Manual Updates
- Download latest version from releases
- Run installer to update existing installation
- License keys remain valid across updates

## 📄 License

This software is proprietary and requires a valid license key for operation. See the licensing section for details on obtaining a license.

## 🤝 Contributing

This is a commercial product. For feature requests or bug reports, please contact support through official channels.

---

**HSR Construction Estimator** - Professional construction cost estimation powered by AI.
