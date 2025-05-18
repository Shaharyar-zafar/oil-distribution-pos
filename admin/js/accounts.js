import { supabase } from '../../js/config.js';

// DOM Elements
const suppliersTableBody = document.getElementById('suppliersTableBody');
const customersTableBody = document.getElementById('customersTableBody');
const workersTableBody = document.getElementById('workersTableBody');
const citiesTableBody = document.getElementById('citiesTableBody');

// Load data when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadSuppliers();
    loadCustomers();
    loadWorkers();
    loadCities();
    loadCitiesForSelects();
});

// Load suppliers
async function loadSuppliers() {
    try {
        const { data: suppliers, error } = await supabase
            .from('suppliers')
            .select(`
                *,
                city:cities(name)
            `)
            .order('name');

        if (error) throw error;

        suppliersTableBody.innerHTML = suppliers.map(supplier => `
            <tr>
                <td>${supplier.name}</td>
                <td>${supplier.phone_number || '-'}</td>
                <td>${supplier.city?.name || '-'}</td>
                <td>${supplier.balance.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'PKR'
                })}</td>
                <td>
                    <a href="supplier-view.html?id=${supplier.id}" class="btn btn-sm btn-info">
                        <i class="bi bi-eye"></i>
                    </a>
                    <button class="btn btn-sm btn-primary" onclick="editSupplier(${supplier.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSupplier(${supplier.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading suppliers:', error);
        alert('Error loading suppliers');
    }
}

// Load customers
async function loadCustomers() {
    try {
        const { data: customers, error } = await supabase
            .from('customers')
            .select(`
                *,
                city:cities(name)
            `)
            .order('name');

        if (error) throw error;

        customersTableBody.innerHTML = customers.map(customer => `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.phone_number || '-'}</td>
                <td>${customer.city?.name || '-'}</td>
                <td>${customer.balance.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'PKR'
                })}</td>
                <td>
                    <a href="customer-view.html?id=${customer.id}" class="btn btn-sm btn-info">
                        <i class="bi bi-eye"></i>
                    </a>
                    <button class="btn btn-sm btn-primary" onclick="editCustomer(${customer.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading customers:', error);
        alert('Error loading customers');
    }
}

// Load workers
async function loadWorkers() {
    try {
        const { data: workers, error } = await supabase
            .from('workers')
            .select(`
                *,
                city:cities(name)
            `)
            .order('name');

        if (error) throw error;

        workersTableBody.innerHTML = workers.map(worker => `
            <tr>
                <td>${worker.name}</td>
                <td>${worker.phone_number || '-'}</td>
                <td>${worker.city?.name || '-'}</td>
                <td>
                    <a href="worker-view.html?id=${worker.id}" class="btn btn-sm btn-info">
                        <i class="bi bi-eye"></i>
                    </a>
                    <button class="btn btn-sm btn-primary" onclick="editWorker(${worker.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteWorker(${worker.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading workers:', error);
        alert('Error loading workers');
    }
}

// Load cities
async function loadCities() {
    try {
        const { data: cities, error } = await supabase
            .from('cities')
            .select('*')
            .order('name');

        if (error) throw error;

        citiesTableBody.innerHTML = cities.map(city => `
            <tr>
                <td>${city.name}</td>
                <td>
                    <a href="city-view.html?id=${city.id}" class="btn btn-sm btn-info">
                        <i class="bi bi-eye"></i>
                    </a>
                    <button class="btn btn-sm btn-primary" onclick="editCity(${city.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCity(${city.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading cities:', error);
        alert('Error loading cities');
    }
}

// Load Cities for Select Dropdowns
async function loadCitiesForSelects() {
    try {
        const { data: cities, error } = await supabase
            .from('cities')
            .select('*')
            .order('name');

        if (error) throw error;

        const cityOptions = cities.map(city => 
            `<option value="${city.id}">${city.name}</option>`
        ).join('');

        // Update all city select elements
        document.querySelectorAll('select[name="city_id"]').forEach(select => {
            select.innerHTML = cityOptions;
        });
    } catch (error) {
        console.error('Error loading cities for selects:', error);
        alert('Error loading cities. Please try again.');
    }
}

// Show modals
window.showAddSupplierModal = () => {
    const modal = new bootstrap.Modal(document.getElementById('addSupplierModal'));
    modal.show();
};

window.showAddCustomerModal = () => {
    const modal = new bootstrap.Modal(document.getElementById('addCustomerModal'));
    modal.show();
};

window.showAddWorkerModal = () => {
    const modal = new bootstrap.Modal(document.getElementById('addWorkerModal'));
    modal.show();
};

window.showAddCityModal = () => {
    const modal = new bootstrap.Modal(document.getElementById('addCityModal'));
    modal.show();
};

// Save functions
window.saveSupplier = async () => {
    try {
        const form = document.getElementById('addSupplierForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const { error } = await supabase
            .from('suppliers')
            .insert([data]);

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('addSupplierModal')).hide();
        form.reset();
        loadSuppliers();
        alert('Supplier added successfully!');
    } catch (error) {
        console.error('Error saving supplier:', error);
        alert('Error saving supplier. Please try again.');
    }
};

window.saveCustomer = async () => {
    try {
        const form = document.getElementById('addCustomerForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const { error } = await supabase
            .from('customers')
            .insert([data]);

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('addCustomerModal')).hide();
        form.reset();
        loadCustomers();
        alert('Customer added successfully!');
    } catch (error) {
        console.error('Error saving customer:', error);
        alert('Error saving customer. Please try again.');
    }
};

window.saveWorker = async () => {
    try {
        const form = document.getElementById('addWorkerForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const { error } = await supabase
            .from('workers')
            .insert([data]);

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('addWorkerModal')).hide();
        form.reset();
        loadWorkers();
        alert('Worker added successfully!');
    } catch (error) {
        console.error('Error saving worker:', error);
        alert('Error saving worker. Please try again.');
    }
};

window.saveCity = async () => {
    try {
        const form = document.getElementById('addCityForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const { error } = await supabase
            .from('cities')
            .insert([data]);

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('addCityModal')).hide();
        form.reset();
        loadCities();
        loadCitiesForSelects();
        alert('City added successfully!');
    } catch (error) {
        console.error('Error saving city:', error);
        alert('Error saving city. Please try again.');
    }
};

// Delete functions
window.deleteSupplier = async (id) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', id);

        if (error) throw error;

        loadSuppliers();
        alert('Supplier deleted successfully!');
    } catch (error) {
        console.error('Error deleting supplier:', error);
        alert('Error deleting supplier. Please try again.');
    }
};

window.deleteCustomer = async (id) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) throw error;

        loadCustomers();
        alert('Customer deleted successfully!');
    } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Error deleting customer. Please try again.');
    }
};

window.deleteWorker = async (id) => {
    if (!confirm('Are you sure you want to delete this worker?')) return;

    try {
        const { error } = await supabase
            .from('workers')
            .delete()
            .eq('id', id);

        if (error) throw error;

        loadWorkers();
        alert('Worker deleted successfully!');
    } catch (error) {
        console.error('Error deleting worker:', error);
        alert('Error deleting worker. Please try again.');
    }
};

window.deleteCity = async (id) => {
    if (!confirm('Are you sure you want to delete this city?')) return;

    try {
        const { error } = await supabase
            .from('cities')
            .delete()
            .eq('id', id);

        if (error) throw error;

        loadCities();
        loadCitiesForSelects();
        alert('City deleted successfully!');
    } catch (error) {
        console.error('Error deleting city:', error);
        alert('Error deleting city. Please try again.');
    }
};

// Edit functions
window.editSupplier = async (id) => {
    try {
        const { data: supplier, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('editSupplierId').value = supplier.id;
        document.getElementById('editName').value = supplier.name;
        document.getElementById('editPhone').value = supplier.phone_number || '';
        document.getElementById('editCity').value = supplier.city_id;

        const modal = new bootstrap.Modal(document.getElementById('editSupplierModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading supplier for edit:', error);
        alert('Error loading supplier details');
    }
};

window.editCustomer = async (id) => {
    try {
        const { data: customer, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
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
};

window.editWorker = async (id) => {
    try {
        const { data: worker, error } = await supabase
            .from('workers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('editWorkerId').value = worker.id;
        document.getElementById('editName').value = worker.name;
        document.getElementById('editPhone').value = worker.phone_number || '';
        document.getElementById('editCity').value = worker.city_id;

        const modal = new bootstrap.Modal(document.getElementById('editWorkerModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading worker for edit:', error);
        alert('Error loading worker details');
    }
};

window.editCity = async (id) => {
    try {
        const { data: city, error } = await supabase
            .from('cities')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('editCityId').value = city.id;
        document.getElementById('editName').value = city.name;

        const modal = new bootstrap.Modal(document.getElementById('editCityModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading city for edit:', error);
        alert('Error loading city details');
    }
};

// Make functions globally accessible
window.showPaymentModal = function(type, id, name, currentBalance) {
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    document.getElementById('paymentType').value = type;
    document.getElementById('paymentReferenceId').value = id;
    document.getElementById('paymentReferenceName').textContent = name;
    document.getElementById('currentBalance').textContent = currentBalance;
    document.getElementById('paymentForm').reset();
    modal.show();
};

window.savePayment = async function() {
    try {
        const form = document.getElementById('paymentForm');
        const formData = new FormData(form);
        const type = formData.get('paymentType');
        const referenceId = formData.get('paymentReferenceId');
        const amount = parseFloat(formData.get('amount'));
        const direction = formData.get('paymentDirection');
        const method = formData.get('paymentMethod');
        const notes = formData.get('notes');

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
            payment_type: type,
            customer_id: type === 'customer' ? referenceId : null,
            supplier_id: type === 'supplier' ? referenceId : null,
            worker_id: workerId,
            amount: amount,
            payment_method: method,
            payment_direction: direction,
            notes: notes
        };

        const { error } = await supabase
            .from('payments')
            .insert([paymentData]);

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
        
        // Reload the appropriate table
        if (type === 'customer') {
            loadCustomers();
        } else {
            loadSuppliers();
        }

        alert('Payment saved successfully');
    } catch (error) {
        console.error('Error saving payment:', error);
        alert('Error saving payment. Please try again.');
    }
}; 