# Oil Distribution POS System - Project Context

## Project Overview
This is a comprehensive Point of Sale (POS) system for oil distribution, built with HTML, CSS, and JavaScript, using Supabase as the backend database.

## Project Structure

### Main Application
- `index.html`: Main entry point with customer selection, product browsing, and cart functionality
- `pos.html`: Point of Sale interface
- `js/`
  - `config.js`: Supabase configuration and client initialization
  - `index.js`: Customer management and QR code functionality
  - `pos.js`: POS-specific functionality
  - `app.js`: Core application logic (products, cart, sales)
- `css/style.css`: Main styling

### Admin Section
- `admin/`
  - HTML files for different views (sales, purchases, inventory, etc.)
  - `js/`: Admin-specific JavaScript files
  - `css/admin.css`: Admin interface styling

### Database
- `combined.sql`: Main database schema
- `increment_function.sql`: Database function for ID increments

## Key Features
1. Customer Management
   - Customer search and selection
   - QR code generation and scanning
   - New customer registration
   - Customer balance tracking

2. Product Management
   - Brand-based product categorization
   - Product search and filtering
   - Stock management
   - Price management

3. Sales Processing
   - Shopping cart functionality
   - Multiple payment methods
   - Invoice generation
   - Sales history

4. Admin Dashboard
   - Inventory management
   - Sales tracking
   - Purchase management
   - Customer management
   - Reports and analytics

## Technical Stack
- Frontend: HTML5, CSS3, JavaScript
- UI Framework: Bootstrap 5.3.0
- Icons: Bootstrap Icons
- Backend: Supabase
- QR Code: HTML5 QR Code scanner

## Database Configuration
- Supabase URL: https://coksmhsdiidaionazfvx.supabase.co
- Using Supabase's anonymous key for client-side operations

## Important Notes
1. The application uses ES modules for JavaScript imports
2. QR codes are generated and scanned for customer identification
3. The system supports multiple warehouses and stock management
4. Admin access is protected with a code-based authentication
5. The interface is responsive and mobile-friendly

## Deployment
- The application is configured for deployment on GitHub Pages
- Vercel configuration is available for alternative deployment
- Environment variables and API keys are managed through Supabase

## Security Considerations
1. Supabase authentication is used for secure data access
2. Admin access is protected with a code-based system
3. API keys are stored in configuration files
4. CORS settings are configured for secure cross-origin requests

## Recent Updates
- Added QR code scanning functionality
- Implemented customer balance tracking
- Enhanced admin dashboard features
- Improved mobile responsiveness
- Added warehouse stock management

This context file serves as a quick reference for understanding the project's structure and key components when starting a new chat or working on the project. 