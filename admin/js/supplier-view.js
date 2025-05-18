import { supabase } from '../../js/config.js';

// Get supplier ID from URL
const urlParams = new URLSearchParams(window.location.search);
const supplierId = urlParams.get('id');

// DOM Elements
const supplierName = document.getElementById('supplierName');
const supplierPhone = document.getElementById('supplierPhone');
const supplierCity = document.getElementById('supplierCity');
const supplierBalance = document.getElementById('supplierBalance');
const supplierCreatedAt = document.getElementById('supplierCreatedAt');
const purchaseHistory = document.getElementById('purchaseHistory');
const paymentHistory = document.getElementById('paymentHistory');

// Modals
const editSupplierModal = new bootstrap.Modal(document.getElementById('editSupplierModal'));
const addPaymentModal = new bootstrap.Modal(document.getElementById('addPaymentModal'));

// Initialize page
async function initialize() {
    if (!supplierId) {
        alert('No supplier ID provided');
        window.location.href = 'accounts.html';
        return;
    }

    await Promise.all([
        loadSupplierDetails(),
        loadPurchaseHistory(),
        loadPaymentHistory(),
        loadCities()
    ]);
}

// Load supplier details
async function loadSupplierDetails() {
    try {
        const { data: supplier, error } = await supabase
            .from('suppliers')
            .select(`
                *,
                city:cities(name)
            `)
            .eq('id', supplierId)
            .single();

        if (error) throw error;

        supplierName.textContent = supplier.name;
        supplierPhone.textContent = supplier.phone_number || 'N/A';
        supplierCity.textContent = supplier.city?.name || 'N/A';
        supplierBalance.textContent = supplier.balance.toLocaleString('en-US', {
            style: 'currency',
            currency: 'PKR'
        });
        supplierCreatedAt.textContent = new Date(supplier.created_at).toLocaleString();
    } catch (error) {
        console.error('Error loading supplier details:', error);
        alert('Error loading supplier details');
    }
}

// Load purchase history
async function loadPurchaseHistory() {
    try {
        const { data: purchases, error } = await supabase
            .from('purchases')
            .select(`
                *,
                worker:workers(name)
            `)
            .eq('supplier_id', supplierId)
            .order('purchase_date', { ascending: false });

        if (error) throw error;

        purchaseHistory.innerHTML = purchases.map(purchase => `
            <tr>
                <td>${new Date(purchase.purchase_date).toLocaleDateString()}</td>
                <td>${purchase.invoice_number}</td>
                <td>${purchase.total_amount.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'PKR'
                })}</td>
                <td>${purchase.amount_paid.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'PKR'
                })}</td>
                <td>${(purchase.total_amount - purchase.amount_paid).toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'PKR'
                })}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewPurchase(${purchase.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading purchase history:', error);
        alert('Error loading purchase history');
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
            .eq('supplier_id', supplierId)
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
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewPayment(${payment.id})">
                        <i class="bi bi-eye"></i>
                    </button>
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

        const citySelect = document.getElementById('editCity');
        citySelect.innerHTML = cities.map(city => 
            `<option value="${city.id}">${city.name}</option>`
        ).join('');
    } catch (error) {
        console.error('Error loading cities:', error);
        alert('Error loading cities');
    }
}

// Edit supplier
async function editSupplier() {
    try {
        const { data: supplier, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', supplierId)
            .single();

        if (error) throw error;

        document.getElementById('editSupplierId').value = supplier.id;
        document.getElementById('editName').value = supplier.name;
        document.getElementById('editPhone').value = supplier.phone_number || '';
        document.getElementById('editCity').value = supplier.city_id;

        editSupplierModal.show();
    } catch (error) {
        console.error('Error loading supplier for edit:', error);
        alert('Error loading supplier details');
    }
}

// Save supplier edit
async function saveSupplierEdit() {
    try {
        const formData = {
            name: document.getElementById('editName').value,
            phone_number: document.getElementById('editPhone').value,
            city_id: document.getElementById('editCity').value
        };

        const { error } = await supabase
            .from('suppliers')
            .update(formData)
            .eq('id', supplierId);

        if (error) throw error;

        editSupplierModal.hide();
        loadSupplierDetails();
        alert('Supplier updated successfully');
    } catch (error) {
        console.error('Error updating supplier:', error);
        alert('Error updating supplier');
    }
}

// Delete supplier
async function deleteSupplier() {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', supplierId);

        if (error) throw error;

        alert('Supplier deleted successfully');
        window.location.href = 'accounts.html';
    } catch (error) {
        console.error('Error deleting supplier:', error);
        alert('Error deleting supplier');
    }
}

// Show add payment modal
function showAddPaymentModal() {
    document.getElementById('addPaymentForm').reset();
    addPaymentModal.show();
}

// Save payment
async function savePayment() {
    try {
        const formData = {
            supplier_id: supplierId,
            amount: parseFloat(document.getElementById('paymentAmount').value),
            payment_method: document.getElementById('paymentMethod').value,
            notes: document.getElementById('paymentNotes').value,
            payment_date: new Date().toISOString(),
            payment_type: 'supplier',
            payment_direction: 'out'
        };

        const { error } = await supabase
            .from('payments')
            .insert([formData]);

        if (error) throw error;

        addPaymentModal.hide();
        loadPaymentHistory();
        loadSupplierDetails();
        alert('Payment added successfully');
    } catch (error) {
        console.error('Error adding payment:', error);
        alert('Error adding payment');
    }
}

// View purchase details
window.viewPurchase = (purchaseId) => {
    window.location.href = `purchase-view.html?id=${purchaseId}`;
};

// View payment details
window.viewPayment = (paymentId) => {
    // TODO: Implement payment view page
    alert('Payment view functionality coming soon!');
};

// Delete payment
window.deletePayment = async (paymentId) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
        const { error } = await supabase
            .from('payments')
            .delete()
            .eq('id', paymentId);

        if (error) throw error;

        loadPaymentHistory();
        loadSupplierDetails();
        alert('Payment deleted successfully');
    } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Error deleting payment');
    }
};

// Initialize the page
initialize(); 