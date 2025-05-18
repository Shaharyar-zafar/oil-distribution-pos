import { supabase } from '../../js/config.js';

// Get customer ID from URL
const urlParams = new URLSearchParams(window.location.search);
const customerId = urlParams.get('id');

// DOM Elements
const customerInfo = document.getElementById('customerInfo');
const salesHistory = document.getElementById('salesHistory');
const paymentHistory = document.getElementById('paymentHistory');
const editCitySelect = document.getElementById('editCity');
const customerName = document.getElementById('customerName');
const customerPhone = document.getElementById('customerPhone');
const customerCity = document.getElementById('customerCity');
const customerBalance = document.getElementById('customerBalance');
const customerCreatedAt = document.getElementById('customerCreatedAt');
const customerQRCode = document.getElementById('customerQRCode');

// Initialize page
async function initialize() {
    if (!customerId) {
        alert('No customer ID provided');
        window.history.back();
        return;
    }

    await Promise.all([
        loadCustomerDetails(),
        loadSalesHistory(),
        loadPaymentHistory(),
        loadCities()
    ]);
}

// Load customer details
async function loadCustomerDetails() {
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

        // Generate QR code if not exists
        if (!customer.qr_code) {
            const qrCode = `CUST-${customer.id}-${Date.now()}`;
            const { error: updateError } = await supabase
                .from('customers')
                .update({ qr_code: qrCode })
                .eq('id', customerId);

            if (updateError) throw updateError;
            customer.qr_code = qrCode;
        }

        // Display customer information
        customerName.textContent = customer.name;
        customerPhone.textContent = customer.phone_number || '-';
        customerCity.textContent = customer.city?.name || '-';
        customerBalance.textContent = customer.balance.toLocaleString('en-US', {
            style: 'currency',
            currency: 'PKR'
        });
        customerCreatedAt.textContent = new Date(customer.created_at).toLocaleString();

        // Generate and display QR code
        const qrCanvas = document.getElementById('customerQRCode');
        QRCode.toCanvas(qrCanvas, customer.qr_code, {
            width: 200,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        }, function (error) {
            if (error) console.error('Error generating QR code:', error);
        });
    } catch (error) {
        console.error('Error loading customer details:', error);
        alert('Error loading customer details');
    }
}

// Load sales history
async function loadSalesHistory() {
    try {
        const { data: sales, error } = await supabase
            .from('sales')
            .select(`
                *,
                worker:workers(name),
                sale_items:sale_items(
                    quantity,
                    item:items(name)
                )
            `)
            .eq('customer_id', customerId)
            .order('sale_date', { ascending: false });

        if (error) throw error;

        salesHistory.innerHTML = sales.map(sale => {
            const totalItems = sale.sale_items.reduce((sum, item) => sum + item.quantity, 0);
            const itemsList = sale.sale_items.map(item => 
                `${item.quantity}x ${item.item.name}`
            ).join(', ');
            const balance = sale.total_amount - sale.amount_paid;
            const status = balance === 0 ? 'Paid' : 'Pending';

            return `
                <tr>
                    <td>${new Date(sale.sale_date).toLocaleDateString()}</td>
                    <td>${sale.invoice_number}</td>
                    <td>
                        <span class="badge bg-info">${totalItems} items</span>
                        <button class="btn btn-sm btn-link" onclick="showItems('${itemsList}')">
                            View Items
                        </button>
                    </td>
                    <td>${sale.total_amount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'PKR'
                    })}</td>
                    <td>${sale.amount_paid.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'PKR'
                    })}</td>
                    <td>${balance.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'PKR'
                    })}</td>
                    <td>
                        <span class="badge bg-${status === 'Paid' ? 'success' : 'warning'}">
                            ${status}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="viewSale(${sale.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="printInvoice(${sale.id})">
                            <i class="bi bi-printer"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading sales history:', error);
        alert('Error loading sales history');
    }
}

// Load payment history
async function loadPaymentHistory() {
    try {
        const { data: payments, error } = await supabase
            .from('payments')
            .select(`
                *,
                worker:workers(name)
            `)
            .eq('customer_id', customerId)
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
                <td>${payment.payment_direction === 'in' ? 'Received' : 'Paid'}</td>
                <td>${payment.notes || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deletePayment(${payment.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading payment history:', error);
        alert('Error loading payment history');
    }
}

// Load cities for edit form
async function loadCities() {
    try {
        const { data: cities, error } = await supabase
            .from('cities')
            .select('*')
            .order('name');

        if (error) throw error;

        editCitySelect.innerHTML = cities.map(city => `
            <option value="${city.id}">${city.name}</option>
        `).join('');
    } catch (error) {
        console.error('Error loading cities:', error);
        alert('Error loading cities');
    }
}

// Edit customer
async function editCustomer() {
    try {
        const { data: customer, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single();

        if (error) throw error;

        document.getElementById('editCustomerId').value = customer.id;
        document.getElementById('editName').value = customer.name;
        document.getElementById('editPhone').value = customer.phone_number || '';
        document.getElementById('editCity').value = customer.city_id;

        const modal = new bootstrap.Modal(document.getElementById('editCustomerModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading customer for edit:', error);
        alert('Error loading customer details');
    }
}

// Save edit
async function saveEdit() {
    try {
        const data = {
            name: document.getElementById('editName').value,
            phone_number: document.getElementById('editPhone').value,
            city_id: document.getElementById('editCity').value
        };

        const { error } = await supabase
            .from('customers')
            .update(data)
            .eq('id', customerId);

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('editCustomerModal')).hide();
        loadCustomerDetails();
        alert('Customer updated successfully!');
    } catch (error) {
        console.error('Error updating customer:', error);
        alert('Error updating customer. Please try again.');
    }
}

// Delete customer
async function deleteCustomer() {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', customerId);

        if (error) throw error;

        window.location.href = 'accounts.html';
    } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Error deleting customer. Please try again.');
    }
}

// Show add payment modal
window.showAddPaymentModal = function() {
    document.getElementById('addPaymentForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('addPaymentModal'));
    modal.show();
};

// Save payment
window.savePayment = async function() {
    try {
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const direction = document.getElementById('paymentDirection').value;
        const method = document.getElementById('paymentMethod').value;
        const notes = document.getElementById('paymentNote').value;

        // Generate payment number
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const { data: lastPayment, error: countError } = await supabase
            .from('payments')
            .select('payment_number')
            .ilike('payment_number', `PAY-${dateStr}-%`)
            .order('payment_number', { ascending: false })
            .limit(1);

        if (countError) throw countError;

        let sequence = 1;
        if (lastPayment && lastPayment.length > 0) {
            const lastNumber = lastPayment[0].payment_number;
            const lastSequence = parseInt(lastNumber.split('-')[2]);
            sequence = lastSequence + 1;
        }

        const paymentNumber = `PAY-${dateStr}-${sequence.toString().padStart(3, '0')}`;

        // Get current worker ID (you might want to implement proper worker selection)
        const { data: workers, error: workerError } = await supabase
            .from('workers')
            .select('id')
            .limit(1);

        if (workerError) throw workerError;
        const workerId = workers[0].id;

        const paymentData = {
            payment_number: paymentNumber,
            payment_type: 'customer',
            customer_id: customerId,
            worker_id: workerId,
            amount: amount,
            payment_method: method,
            payment_direction: direction,
            notes: notes,
            payment_date: new Date().toISOString()
        };

        const { error } = await supabase
            .from('payments')
            .insert([paymentData]);

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('addPaymentModal')).hide();
        document.getElementById('addPaymentForm').reset();
        loadCustomerDetails();
        loadPaymentHistory();
        alert('Payment saved successfully!');
    } catch (error) {
        console.error('Error saving payment:', error);
        alert('Error saving payment. Please try again.');
    }
};

// View sale details
window.viewSale = function(saleId) {
    window.location.href = `sale-view.html?id=${saleId}`;
};

// Delete payment
async function deletePayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
        // Get payment details
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (paymentError) throw paymentError;

        // Delete payment
        const { error: deleteError } = await supabase
            .from('payments')
            .delete()
            .eq('id', paymentId);

        if (deleteError) throw deleteError;

        loadCustomerDetails();
        loadPaymentHistory();
        alert('Payment deleted successfully!');
    } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Error deleting payment. Please try again.');
    }
}

// Show items in a modal
window.showItems = function(itemsList) {
    alert(itemsList);
};

// Print invoice
window.printInvoice = function(saleId) {
    window.open(`print-invoice.html?id=${saleId}`, '_blank');
};

// Print QR code
window.printQRCode = function() {
    const qrCanvas = document.getElementById('customerQRCode');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Customer QR Code</title>
                <style>
                    body {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        font-family: Arial, sans-serif;
                    }
                    .qr-container {
                        text-align: center;
                    }
                    .customer-name {
                        margin-top: 20px;
                        font-size: 18px;
                        font-weight: bold;
                    }
                    @media print {
                        body {
                            height: auto;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="qr-container">
                    <img src="${qrCanvas.toDataURL()}" alt="QR Code">
                    <div class="customer-name">${customerName.textContent}</div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        };
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
};

// Initialize page
initialize(); 