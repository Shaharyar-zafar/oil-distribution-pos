import { supabase } from './config.js';

// DOM Elements
const customerInfoCard = document.getElementById('customerInfoCard');
const selectedCustomerName = document.getElementById('selectedCustomerName');
const selectedCustomerDetails = document.getElementById('selectedCustomerDetails');
const customerList = document.getElementById('customerList');
const customerSearch = document.getElementById('customerSearch');
const newCustomerCity = document.getElementById('newCustomerCity');
const selectedCustomerId = document.getElementById('selectedCustomerId');
const customerBalance = document.getElementById('customerBalance');
const customerSuggestions = document.getElementById('customerSuggestions');

let html5QrCode = null;

// Show new customer form
export function showNewCustomerForm() {
    document.getElementById('newCustomerForm').reset();
    loadCitiesForNewCustomer();
    const modal = new bootstrap.Modal(document.getElementById('newCustomerModal'));
    modal.show();
}

// Load cities for new customer form
async function loadCitiesForNewCustomer() {
    try {
        const { data: cities, error } = await supabase
            .from('cities')
            .select('*')
            .order('name');

        if (error) throw error;

        const citySelect = document.getElementById('newCustomerCity');
        citySelect.innerHTML = cities.map(city => `
            <option value="${city.id}">${city.name}</option>
        `).join('');
    } catch (error) {
        console.error('Error loading cities:', error);
        alert('Error loading cities');
    }
}

// Save new customer
export async function saveNewCustomer() {
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
        selectCustomer(customer);
        alert('Customer added successfully!');
    } catch (error) {
        console.error('Error adding customer:', error);
        alert('Error adding customer');
    }
}

// Start QR scanner
export function startQRScanner() {
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
}

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

        // Get customer details
        const { data: customer, error } = await supabase
            .from('customers')
            .select(`
                *,
                city:cities(name)
            `)
            .eq('id', customerId)
            .single();

        if (error) throw error;

        // Select customer
        selectCustomer(customer);
    } catch (error) {
        console.error('Error processing QR code:', error);
        alert('Error processing QR code');
    }
}

// Handle QR code scan error
function onQRCodeError(error) {
    console.warn('QR code scan error:', error);
}

// Update customer selection function
export async function selectCustomer(customer) {
    selectedCustomerId.value = customer.id;
    customerSearch.value = customer.name;
    customerBalance.textContent = customer.balance.toLocaleString('en-US', {
        style: 'currency',
        currency: 'PKR'
    });
    customerSuggestions.style.display = 'none';

    // Update cart if needed
    if (typeof updateCart === 'function') {
        updateCart();
    }
}

// Make functions available globally
window.showNewCustomerForm = showNewCustomerForm;
window.saveNewCustomer = saveNewCustomer;
window.startQRScanner = startQRScanner;
window.selectCustomer = selectCustomer; 