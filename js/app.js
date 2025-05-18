import { supabase } from './config.js';

let currentBrand = null;
let cart = [];
let selectedProduct = null;
let warehouseStocks = [];
let customers = [];
let searchTimeout = null;

// DOM Elements
const citySelect = document.getElementById('citySelect');
const workerSelect = document.getElementById('workerSelect');
const customerSearch = document.getElementById('customerSearch');
const customerSuggestions = document.getElementById('customerSuggestions');
const selectedCustomerId = document.getElementById('selectedCustomerId');
const customerBalance = document.getElementById('customerBalance');
const brandTabs = document.getElementById('brandTabs');
const productsGrid = document.getElementById('productsGrid');
const cartItems = document.getElementById('cartItems');
const cartHeader = document.getElementById('cartHeader');
const cartContainer = document.querySelector('.cart-container');
const cartCount = document.getElementById('cartCount');
const totalAmount = document.getElementById('totalAmount');
const paidAmount = document.getElementById('paidAmount');
const remainingAmount = document.getElementById('remainingAmount');
const quantityModal = new bootstrap.Modal(document.getElementById('quantityModal'));
const warehouseQuantities = document.getElementById('warehouseQuantities');
const addToCartBtn = document.getElementById('addToCart');
const completeSaleBtn = document.getElementById('completeSale');
const defaultPrice = document.getElementById('defaultPrice');
const customPrice = document.getElementById('customPrice');
const useDefaultPrice = document.getElementById('useDefaultPrice');

// Admin button functionality
const adminButton = document.getElementById('adminButton');
const adminCodeModal = new bootstrap.Modal(document.getElementById('adminCodeModal'));
const adminCode = document.getElementById('adminCode');
const verifyAdminCode = document.getElementById('verifyAdminCode');

// Initial Load
async function initialize() {
    await loadCities();
    await loadWorkers();
    await loadBrands();
    setupCartToggle();
    setupCustomerSearch();
}

// Setup Cart Toggle
function setupCartToggle() {
    cartHeader.addEventListener('click', () => {
        cartContainer.classList.toggle('expanded');
        const icon = cartHeader.querySelector('i');
        
        // Toggle the icon between up and down arrows
        if (cartContainer.classList.contains('expanded')) {
            icon.classList.remove('bi-chevron-up');
            icon.classList.add('bi-chevron-down');
        } else {
            icon.classList.remove('bi-chevron-down');
            icon.classList.add('bi-chevron-up');
        }
    });
}

// Setup Customer Search
function setupCustomerSearch() {
    customerSearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const searchText = e.target.value.trim();
        
        if (searchText.length > 0) {
            searchTimeout = setTimeout(() => {
                searchCustomers(searchText);
            }, 300);
        } else {
            customerSuggestions.style.display = 'none';
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!customerSearch.contains(e.target)) {
            customerSuggestions.style.display = 'none';
        }
    });
}

// Load Cities
async function loadCities() {
    try {
        const { data: cities, error } = await supabase
            .from('cities')
            .select('*')
            .order('name');

        if (error) throw error;

        citySelect.innerHTML = '<option value="">Select City</option>';
        cities.forEach(city => {
            citySelect.innerHTML += `<option value="${city.id}">${city.name}</option>`;
        });
    } catch (error) {
        console.error('Error loading cities:', error);
    }
}

// Load Workers (without city filter)
async function loadWorkers() {
    try {
        const { data: workers, error } = await supabase
            .from('workers')
            .select('*')
            .order('name');

        if (error) throw error;

        workerSelect.innerHTML = '<option value="">Select Worker</option>';
        workers.forEach(worker => {
            workerSelect.innerHTML += `<option value="${worker.id}">${worker.name}</option>`;
        });
        workerSelect.disabled = false;
    } catch (error) {
        console.error('Error loading workers:', error);
    }
}

// Load Customers
async function loadCustomers() {
    try {
        const { data: customers, error } = await supabase
            .from('customers')
            .select('*')
            .order('name');

        if (error) throw error;

        customerSelect.innerHTML = '<option value="">Select Customer</option>';
        customers.forEach(customer => {
            customerSelect.innerHTML += `<option value="${customer.id}">${customer.name}</option>`;
        });
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

// Load Customer Balance
async function loadCustomerBalance(customerId) {
    try {
        const { data: customer, error } = await supabase
            .from('customers')
            .select('balance')
            .eq('id', customerId)
            .single();

        if (error) throw error;

        customerBalance.textContent = customer.balance.toFixed(2);
    } catch (error) {
        console.error('Error loading customer balance:', error);
    }
}

// Load Brands
async function loadBrands() {
    try {
        const { data: brands, error } = await supabase
            .from('brands')
            .select('*')
            .order('name');

        if (error) throw error;

        brandTabs.innerHTML = '';
        brands.forEach(brand => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-primary brand-tab';
            btn.setAttribute('data-brand-id', brand.id);
            btn.textContent = brand.name;
            btn.onclick = () => selectBrand(brand.id);
            brandTabs.appendChild(btn);
        });
    } catch (error) {
        console.error('Error loading brands:', error);
    }
}

// Load Products by Brand
async function loadProducts(brandId) {
    try {
        const { data: products, error } = await supabase
            .from('items')
            .select('*')
            .eq('brand_id', brandId)
            .order('name');

        if (error) throw error;

        productsGrid.innerHTML = '';
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'col-6 col-md-4 col-lg-3';
            productCard.innerHTML = `
                <div class="card product-card" data-product-id="${product.id}">
                    <div class="card-body">
                        <h6 class="card-title">${product.name}</h6>
                        <p class="card-text mb-0">Price: ${product.retail_price}</p>
                        <small class="text-muted">Click to select quantity</small>
                    </div>
                </div>
            `;
            productCard.onclick = () => showQuantityModal(product);
            productsGrid.appendChild(productCard);
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Select Brand
function selectBrand(brandId) {
    currentBrand = brandId;
    document.querySelectorAll('.brand-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-brand-id') == brandId) {
            tab.classList.add('active');
        }
    });
    loadProducts(brandId);
}

// Show Quantity Modal
async function showQuantityModal(product) {
    selectedProduct = product;
    
    // Set up price fields
    defaultPrice.textContent = product.retail_price.toFixed(2);
    customPrice.value = product.retail_price.toFixed(2);

    try {
        const { data: stocks, error } = await supabase
            .from('inventory_stock')
            .select(`
                quantity,
                warehouses (
                    id,
                    name
                )
            `)
            .eq('item_id', product.id);

        if (error) throw error;

        warehouseStocks = stocks;
        warehouseQuantities.innerHTML = '';
        stocks.forEach(stock => {
            if (stock.quantity > 0) {
                warehouseQuantities.innerHTML += `
                    <div class="warehouse-quantity">
                        <div class="d-flex justify-content-between">
                            <strong>${stock.warehouses.name}</strong>
                            <span>Available: ${stock.quantity}</span>
                        </div>
                        <div class="quantity-input-group">
                            <input type="number" 
                                class="form-control form-control-sm warehouse-input" 
                                data-warehouse-id="${stock.warehouses.id}"
                                min="0" 
                                max="${stock.quantity}"
                                value="0">
                            <small class="text-muted">Qty</small>
                        </div>
                    </div>
                `;
            }
        });
        quantityModal.show();
    } catch (error) {
        console.error('Error loading warehouse stock:', error);
    }
}

// Add to Cart
function addToCart() {
    const warehouseInputs = document.querySelectorAll('.warehouse-input');
    let totalQuantity = 0;
    const warehouseQuantities = [];
    const customPriceValue = parseFloat(customPrice.value) || selectedProduct.retail_price;

    warehouseInputs.forEach(input => {
        const quantity = parseInt(input.value) || 0;
        if (quantity > 0) {
            totalQuantity += quantity;
            warehouseQuantities.push({
                warehouse_id: parseInt(input.dataset.warehouseId),
                quantity: quantity
            });
        }
    });

    if (totalQuantity > 0 && selectedProduct) {
        cart.push({
            product: {
                ...selectedProduct,
                retail_price: customPriceValue // Use custom price if set
            },
            warehouses: warehouseQuantities,
            totalQuantity: totalQuantity,
            originalPrice: selectedProduct.retail_price
        });
        updateCart();
        quantityModal.hide();
    } else {
        alert('Please enter quantity for at least one warehouse');
    }
}

// Update Cart Display
function updateCart() {
    cartItems.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.totalQuantity * item.product.retail_price;
        total += itemTotal;

        const warehouseDetails = item.warehouses.map(wh => 
            `<small class="d-block text-muted">Warehouse ${wh.warehouse_id}: ${wh.quantity}</small>`
        ).join('');

        const priceDisplay = item.product.retail_price !== item.originalPrice 
            ? `<small class="text-danger">(Modified from ${item.originalPrice})</small>` 
            : '';

        cartItems.innerHTML += `
            <div class="card mb-2">
                <div class="card-body p-2">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${item.product.name}</h6>
                            <div class="text-muted">
                                Total Qty: ${item.totalQuantity}
                                ${warehouseDetails}
                            </div>
                            <small>Price: ${item.product.retail_price} × ${item.totalQuantity} = ${itemTotal} ${priceDisplay}</small>
                        </div>
                        <button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    totalAmount.value = total.toFixed(2);
    updateRemainingAmount();
    cartCount.textContent = cart.length;
    if (cart.length > 0) cartContainer.classList.add('expanded');
}

// Remove from Cart
window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCart();
};

// Update Remaining Amount
function updateRemainingAmount() {
    const total = parseFloat(totalAmount.value) || 0;
    const paid = parseFloat(paidAmount.value) || 0;
    remainingAmount.value = (total - paid).toFixed(2);
}

// Search Customers
async function searchCustomers(searchText) {
    const cityId = citySelect.value;
    if (!cityId) {
        alert('Please select a city first');
        customerSearch.value = '';
        return;
    }

    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('city_id', cityId)
            .ilike('name', `%${searchText}%`)
            .order('name')
            .limit(10);

        if (error) throw error;

        customers = data;
        displayCustomerSuggestions(data);
    } catch (error) {
        console.error('Error searching customers:', error);
    }
}

// Display Customer Suggestions
function displayCustomerSuggestions(customers) {
    if (customers.length === 0) {
        customerSuggestions.style.display = 'none';
        return;
    }

    customerSuggestions.innerHTML = customers.map(customer => `
        <div class="customer-suggestion" data-customer-id="${customer.id}">
            <div>${customer.name}</div>
            <small class="text-muted">${customer.phone_number || 'No phone'}</small>
        </div>
    `).join('');

    customerSuggestions.style.display = 'block';

    // Add click handlers to suggestions
    customerSuggestions.querySelectorAll('.customer-suggestion').forEach(suggestion => {
        suggestion.addEventListener('click', () => {
            const customerId = suggestion.dataset.customerId;
            const customer = customers.find(c => c.id === parseInt(customerId));
            selectCustomer(customer);
        });
    });
}

// Select Customer
function selectCustomer(customer) {
    customerSearch.value = customer.name;
    selectedCustomerId.value = customer.id;
    customerSuggestions.style.display = 'none';
    loadCustomerBalance(customer.id);
}

// Complete Sale
async function completeSale() {
    if (!validateSale()) return;

    try {
        const saleData = {
            customer_id: parseInt(selectedCustomerId.value),
            worker_id: parseInt(workerSelect.value),
            total_amount: parseFloat(totalAmount.value),
            amount_paid: parseFloat(paidAmount.value),
            next_visit_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            invoice_number: generateInvoiceNumber()
        };

        // Insert sale
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert([saleData])
            .select()
            .single();

        if (saleError) throw saleError;

        // Insert sale items for each warehouse
        const saleItems = [];
        cart.forEach(item => {
            item.warehouses.forEach(wh => {
                saleItems.push({
                    sale_id: sale.id,
                    item_id: item.product.id,
                    warehouse_id: wh.warehouse_id,
                    quantity: wh.quantity,
                    unit_price: item.product.retail_price,
                    total_price: wh.quantity * item.product.retail_price
                });
            });
        });

        const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(saleItems);

        if (itemsError) throw itemsError;

        // Update stock for each warehouse
        for (const item of cart) {
            for (const wh of item.warehouses) {
                const { error: stockError } = await supabase
                    .rpc('update_stock', {
                        p_item_id: item.product.id,
                        p_warehouse_id: wh.warehouse_id,
                        p_quantity: -wh.quantity
                    });

                if (stockError) throw stockError;
            }
        }

        // Update customer balance
        const remainingAmt = parseFloat(remainingAmount.value);
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('balance')
            .eq('id', parseInt(selectedCustomerId.value))
            .single();

        if (customerError) throw customerError;

        const newBalance = (customer.balance || 0) + remainingAmt;
        const { error: updateError } = await supabase
            .from('customers')
            .update({ balance: newBalance })
            .eq('id', parseInt(selectedCustomerId.value));

        if (updateError) throw updateError;

        alert('Sale completed successfully!');
        resetForm();
    } catch (error) {
        console.error('Error completing sale:', error);
        alert('Error completing sale. Please try again.');
    }
}

// Validate Sale
function validateSale() {
    if (!selectedCustomerId.value) {
        alert('Please select a customer');
        return false;
    }
    if (!workerSelect.value) {
        alert('Please select a worker');
        return false;
    }
    if (cart.length === 0) {
        alert('Cart is empty');
        return false;
    }
    if (!paidAmount.value) {
        alert('Please enter paid amount');
        return false;
    }
    return true;
}

// Generate Invoice Number
function generateInvoiceNumber() {
    return 'INV-' + Date.now();
}

// Reset Form
function resetForm() {
    cart = [];
    updateCart();
    paidAmount.value = '';
    remainingAmount.value = '';
    selectedCustomerId.value = '';
    customerBalance.textContent = '0.00';
}

// Event Listeners
citySelect.addEventListener('change', (e) => {
    if (e.target.value) {
        // Clear customer selection when city changes
        customerSearch.value = '';
        selectedCustomerId.value = '';
        customerBalance.textContent = '0.00';
    } else {
        customerSearch.value = '';
        selectedCustomerId.value = '';
        customerBalance.textContent = '0.00';
    }
});

paidAmount.addEventListener('input', updateRemainingAmount);
addToCartBtn.addEventListener('click', addToCart);
completeSaleBtn.addEventListener('click', completeSale);

useDefaultPrice.addEventListener('click', () => {
    customPrice.value = selectedProduct.retail_price.toFixed(2);
});

// Admin button functionality
adminButton.addEventListener('click', () => {
    adminCode.value = '';
    adminCodeModal.show();
});

verifyAdminCode.addEventListener('click', () => {
    if (adminCode.value === '0098') {
        localStorage.setItem('adminCode', '0098');
        window.location.href = 'admin/index.html';
    } else {
        alert('Invalid admin code');
    }
});

// Initialize the application
initialize(); 