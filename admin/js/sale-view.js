import { supabase } from '../../js/config.js';

// Get sale ID from URL
const urlParams = new URLSearchParams(window.location.search);
const saleId = urlParams.get('id');

// DOM Elements
const saleInfo = document.getElementById('saleInfo');
const customerInfo = document.getElementById('customerInfo');
const saleItems = document.getElementById('saleItems');
const subtotal = document.getElementById('subtotal');
const discount = document.getElementById('discount');
const totalAmount = document.getElementById('totalAmount');
const amountPaid = document.getElementById('amountPaid');
const balance = document.getElementById('balance');
const paymentHistory = document.getElementById('paymentHistory');

// Initialize page
async function initialize() {
    if (!saleId) {
        alert('No sale ID provided');
        window.history.back();
        return;
    }

    await Promise.all([
        loadSaleDetails(),
        loadSaleItems(),
        loadPaymentHistory()
    ]);
}

// Load sale details
async function loadSaleDetails() {
    try {
        const { data: sale, error } = await supabase
            .from('sales')
            .select(`
                *,
                customer:customers(
                    id,
                    name,
                    phone_number,
                    city:cities(name)
                ),
                worker:workers(name)
            `)
            .eq('id', saleId)
            .single();

        if (error) throw error;

        // Display sale information
        saleInfo.innerHTML = `
            <p><strong>Invoice Number:</strong> ${sale.invoice_number}</p>
            <p><strong>Date:</strong> ${new Date(sale.sale_date).toLocaleString()}</p>
            <p><strong>Worker:</strong> ${sale.worker.name}</p>
            <p><strong>Status:</strong> 
                <span class="badge bg-${sale.total_amount === sale.amount_paid ? 'success' : 'warning'}">
                    ${sale.total_amount === sale.amount_paid ? 'Paid' : 'Pending'}
                </span>
            </p>
            <p><strong>Notes:</strong> ${sale.notes || '-'}</p>
        `;

        // Display customer information
        customerInfo.innerHTML = `
            <p><strong>Name:</strong> ${sale.customer.name}</p>
            <p><strong>Phone:</strong> ${sale.customer.phone_number || '-'}</p>
            <p><strong>City:</strong> ${sale.customer.city?.name || '-'}</p>
            <p><strong>Balance:</strong> ${sale.customer.balance.toLocaleString('en-US', {
                style: 'currency',
                currency: 'PKR'
            })}</p>
        `;

        // Update totals
        const remainingBalance = sale.total_amount - sale.amount_paid;
        subtotal.textContent = sale.total_amount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'PKR'
        });
        discount.textContent = sale.discount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'PKR'
        });
        totalAmount.textContent = sale.total_amount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'PKR'
        });
        amountPaid.textContent = sale.amount_paid.toLocaleString('en-US', {
            style: 'currency',
            currency: 'PKR'
        });
        balance.textContent = remainingBalance.toLocaleString('en-US', {
            style: 'currency',
            currency: 'PKR'
        });
    } catch (error) {
        console.error('Error loading sale details:', error);
        alert('Error loading sale details');
    }
}

// Load sale items
async function loadSaleItems() {
    try {
        const { data: items, error } = await supabase
            .from('sale_items')
            .select(`
                *,
                item:items(name),
                warehouse:warehouses(name)
            `)
            .eq('sale_id', saleId);

        if (error) throw error;

        saleItems.innerHTML = items.map(item => `
            <tr>
                <td>${item.item.name}</td>
                <td>${item.warehouse.name}</td>
                <td>${item.quantity}</td>
                <td>${item.unit_price.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'PKR'
                })}</td>
                <td>${item.total_price.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'PKR'
                })}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading sale items:', error);
        alert('Error loading sale items');
    }
}

// Load payment history
async function loadPaymentHistory() {
    try {
        const { data: payments, error } = await supabase
            .from('payments')
            .select('*')
            .eq('customer_id', saleId)
            .order('payment_date', { ascending: false });

        if (error) throw error;

        paymentHistory.innerHTML = payments.map(payment => `
            <tr>
                <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
                <td>${payment.amount.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'PKR'
                })}</td>
                <td>${payment.payment_method}</td>
                <td>${payment.notes || '-'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading payment history:', error);
        alert('Error loading payment history');
    }
}

// Print invoice
window.printInvoice = function() {
    window.open(`print-invoice.html?id=${saleId}`, '_blank');
};

// Initialize the page
initialize(); 