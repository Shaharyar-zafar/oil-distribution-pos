# Oil Distribution POS System

A Point of Sale (POS) system for oil distribution businesses, built with HTML, CSS, and JavaScript.

## Features

- Customer management with QR code support
- Sales and purchase tracking
- Inventory management
- Worker management
- City-based operations
- Payment tracking
- Admin dashboard
- Reports and analytics

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/oil-distribution-pos.git
```

2. Set up your Supabase project:
   - Create a new project in Supabase
   - Import the database schema from `combined.sql`
   - Update the Supabase configuration in `js/config.js`

3. Configure the application:
   - Update the Supabase URL and anon key in `js/config.js`
   - Set up your admin code in the settings

## Usage

1. Open `index.html` in your browser to access the POS system
2. Use the admin panel for management tasks
3. Scan customer QR codes for quick customer selection
4. Process sales and track inventory

## Development

- Main POS interface: `index.html`
- Admin panel: `admin/index.html`
- JavaScript modules in `js/` directory
- Styles in `css/` directory

## License

This project is licensed under the MIT License - see the LICENSE file for details. 