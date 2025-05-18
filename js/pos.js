import { supabase } from './config.js';

// DOM Elements
const customerInfoCard = document.getElementById('customerInfoCard');
const selectedCustomerName = document.getElementById('selectedCustomerName');
const selectedCustomerDetails = document.getElementById('selectedCustomerDetails');
const customerList = document.getElementById('customerList');
const customerSearch = document.getElementById('customerSearch');
const newCustomerCity = document.getElementById('newCustomerCity');

let selectedCustomer = null;
let html5QrCode = null;

// Initialize page
async function initialize() {
    await loadCities();
    setupCustomerSearch();
}

// Load cities for new customer form
async function loadCities() {
    try {
        const { data: cities, error } = await supabase
            .from('cities')
            .select('*')
            .order('name');

        if (error) throw error;

        newCustomerCity.innerHTML = cities.map(city => `
            <option value="${city.id}">${city.name}</option>
        `).join('');
    } catch (error) {
        console.error('Error loading cities:', error);
        alert('Error loading cities');
    }
}

// Setup customer search
function setupCustomerSearch() {
    customerSearch.addEventListener('input', debounce(loadCustomers, 300));
}

// Load customers
async function loadCustomers() {
    try {
        const searchTerm = customerSearch.value.trim();
        let query = supabase
            .from('customers')
            .select(`
                *,
                city:cities(name)
            `)
            .order('name');

        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`);
        }

        const { data: customers, error } = await query.limit(10);

        if (error) throw error;

        customerList.innerHTML = customers.map(customer => `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.phone_number || '-'}</td>
                <td>${customer.city?.name || '-'}</td>
                <td>${customer.balance.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'PKR'
                })}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="selectCustomer(${customer.id})">
                        Select
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading customers:', error);
        alert('Error loading customers');
    }
}

// Show customer selection modal
window.showCustomerSelection = function() {
    loadCustomers();
    const modal = new bootstrap.Modal(document.getElementById('customerSelectionModal'));
    modal.show();
};

// Select customer
window.selectCustomer = async function(customerId) {
    try {
        const { data: customer, error } = await supabase
            .from('customers')
            .select(`
                *,
                city:cities(name)
            `)
            .eq('id', customerId)
            .single();

        if (error) throw error;

        selectedCustomer = customer;
        selectedCustomerName.textContent = customer.name;
        selectedCustomerDetails.textContent = `
            Phone: ${customer.phone_number || '-'} | 
            City: ${customer.city?.name || '-'} | 
            Balance: ${customer.balance.toLocaleString('en-US', {
                style: 'currency',
                currency: 'PKR'
            })}
        `;
        customerInfoCard.style.display = 'block';

        bootstrap.Modal.getInstance(document.getElementById('customerSelectionModal')).hide();
    } catch (error) {
        console.error('Error selecting customer:', error);
        alert('Error selecting customer');
    }
};

// Clear customer selection
window.clearCustomerSelection = function() {
    selectedCustomer = null;
    customerInfoCard.style.display = 'none';
};

// Show new customer form
window.showNewCustomerForm = function() {
    document.getElementById('newCustomerForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('newCustomerModal'));
    modal.show();
};

// Save new customer
window.saveNewCustomer = async function() {
    try {
        const name = document.getElementById('newCustomerName').value;
        const phone = document.getElementById('newCustomerPhone').value;
        const cityId = document.getElementById('newCustomerCity').value;

        const { data: customer, error } = await supabase
            .from('customers')
            .insert([{
                name,
                phone_number: phone,
                city_id: cityId,
                balance: 0
            }])
            .select()
            .single();

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('newCustomerModal')).hide();
        selectCustomer(customer.id);
        alert('Customer added successfully!');
    } catch (error) {
        console.error('Error adding customer:', error);
        alert('Error adding customer');
    }
};

// Start QR scanner
window.startQRScanner = function() {
    const modal = new bootstrap.Modal(document.getElementById('qrScannerModal'));
    modal.show();

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader");
    }

    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        onQRCodeSuccess,
        onQRCodeError
    );
};

// Handle QR code scan success
async function onQRCodeSuccess(decodedText) {
    try {
        // Stop scanner
        await html5QrCode.stop();
        bootstrap.Modal.getInstance(document.getElementById('qrScannerModal')).hide();

        // Extract customer ID from QR code
        const customerId = decodedText.split('-')[1];
        if (!customerId) {
            throw new Error('Invalid QR code format');
        }

        // Select customer
        await selectCustomer(customerId);
    } catch (error) {
        console.error('Error processing QR code:', error);
        alert('Error processing QR code');
    }
}

// Handle QR code scan error
function onQRCodeError(error) {
    console.warn('QR code scan error:', error);
}

// View customer history
window.viewCustomerHistory = function() {
    if (selectedCustomer) {
        window.location.href = `admin/customer-view.html?id=${selectedCustomer.id}`;
    }
};

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize page
initialize(); 