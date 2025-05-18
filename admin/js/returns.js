import { supabase } from '../../js/config.js';

// Global variables
let currentReturnType = 'customer';
let selectedReferenceId = null;
let selectedWorkerId = null;
let cart = [];
let brands = [];
let products = [];
let warehouses = [];

// DOM Elements
const returnTypeInputs = document.querySelectorAll('input[name="returnType"]');
const referenceLabel = document.getElementById('referenceLabel');
const referenceSearch = document.getElementById('referenceSearch');
const referenceSuggestions = document.getElementById('referenceSuggestions');
const selectedReferenceIdInput = document.getElementById('selectedReferenceId');
const workerSelect = document.getElementById('workerSelect');
const referenceBalance = document.getElementById('referenceBalance');
const brandTabs = document.getElementById('brandTabs');
const productsGrid = document.getElementById('productsGrid');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const returnNumber = document.getElementById('returnNumber');
const totalAmount = document.getElementById('totalAmount');
const completeReturnBtn = document.getElementById('completeReturn');
const viewReturnsBtn = document.getElementById('viewReturnsBtn');

// Initialize the page
async function initialize() {
    try {
        // Load initial data
        await Promise.all([
            loadBrands(),
            loadWarehouses(),
            loadWorkers(),
            generateReturnNumber()
        ]);

        // Set up event listeners
        setupEventListeners();

        // Update UI
        updateCartUI();
    } catch (error) {
        console.error('Error initializing returns page:', error);
        alert('Error initializing returns page. Please try again.');
    }
}

// Load brands
async function loadBrands() {
    const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');

    if (error) throw error;
    brands = data;
    renderBrandTabs();
}

// Load warehouses
async function loadWarehouses() {
    const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');

    if (error) throw error;
    warehouses = data;
}

// Load workers
async function loadWorkers() {
    const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('name');

    if (error) throw error;

    workerSelect.innerHTML = '<option value="">Select Worker</option>' +
        data.map(worker => `
            <option value="${worker.id}">${worker.name}</option>
        `).join('');
}

// Generate return number
async function generateReturnNumber() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const { data, error } = await supabase
        .from('returns')
        .select('return_number')
        .ilike('return_number', `RET-${dateStr}-%`)
        .order('return_number', { ascending: false })
        .limit(1);

    if (error) throw error;

    let sequence = 1;
    if (data && data.length > 0) {
        const lastNumber = data[0].return_number;
        const lastSequence = parseInt(lastNumber.split('-')[2]);
        sequence = lastSequence + 1;
    }

    returnNumber.value = `RET-${dateStr}-${sequence.toString().padStart(3, '0')}`;
}

// Render brand tabs
function renderBrandTabs() {
    brandTabs.innerHTML = `
        <button type="button" class="btn btn-outline-success brand-tab active" data-brand-id="all">
            All Brands
        </button>
        ${brands.map(brand => `
            <button type="button" class="btn btn-outline-success brand-tab" data-brand-id="${brand.id}">
                ${brand.name}
            </button>
        `).join('')}
    `;
}

// Load products for a brand
async function loadProducts(brandId) {
    let query = supabase
        .from('items')
        .select('*, brands(name)')
        .order('name');

    if (brandId !== 'all') {
        query = query.eq('brand_id', brandId);
    }

    const { data, error } = await query;
    if (error) throw error;
    products = data;
    renderProducts();
}

// Render products
function renderProducts() {
    productsGrid.innerHTML = products.map(product => `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="card product-card" onclick="showQuantityModal(${product.id})">
                <div class="card-body">
                    <h6 class="card-title">${product.name}</h6>
                    <p class="card-text">${product.brands.name}</p>
                    <small class="text-muted">Price: ${product.retail_price}</small>
                </div>
            </div>
        </div>
    `).join('');
}

// Show quantity modal
function showQuantityModal(productId) {
    if (!selectedReferenceId) {
        alert('Please select a customer/supplier first');
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = new bootstrap.Modal(document.getElementById('quantityModal'));
    document.getElementById('selectedItemName').textContent = product.name;
    document.getElementById('selectedItemName').dataset.productId = productId;

    // Get original price from the selected invoice
    const originalPrice = cart.find(item => item.productId === productId)?.returnPrice || 
        (currentReturnType === 'customer' ? product.retail_price : product.purchase_price);
    document.getElementById('returnPrice').value = originalPrice;

    // Render warehouse options
    document.getElementById('warehouseOptions').innerHTML = warehouses.map(warehouse => `
        <div class="warehouse-item">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${warehouse.name}</strong>
                    <div class="stock-info">Available: ${getStockQuantity(product.id, warehouse.id)}</div>
                </div>
                <input type="number" 
                    class="form-control form-control-sm" 
                    style="width: 100px"
                    data-warehouse-id="${warehouse.id}"
                    min="0"
                    value="0">
            </div>
        </div>
    `).join('');

    modal.show();
}

// Get stock quantity
function getStockQuantity(itemId, warehouseId) {
    // This would typically come from your inventory_stock table
    return 0; // Placeholder
}

// Add to cart
function addToCart() {
    const productId = parseInt(document.getElementById('selectedItemName').dataset.productId);
    const returnPrice = parseFloat(document.getElementById('returnPrice').value);
    const quantities = {};

    document.querySelectorAll('#warehouseOptions input[type="number"]').forEach(input => {
        const quantity = parseInt(input.value);
        if (quantity > 0) {
            quantities[input.dataset.warehouseId] = quantity;
        }
    });

    if (Object.keys(quantities).length === 0) {
        alert('Please enter quantities for at least one warehouse');
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    cart.push({
        productId,
        name: product.name,
        returnPrice,
        quantities
    });

    updateCartUI();
    bootstrap.Modal.getInstance(document.getElementById('quantityModal')).hide();
}

// Update cart UI
function updateCartUI() {
    cartCount.textContent = cart.length;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="text-center text-muted">Cart is empty</div>';
        totalAmount.value = '0.00';
        completeReturnBtn.disabled = true;
        return;
    }

    let total = 0;
    cartItems.innerHTML = cart.map((item, index) => {
        const itemTotal = item.returnPrice * Object.values(item.quantities).reduce((a, b) => a + b, 0);
        total += itemTotal;
        return `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <h6 class="mb-0">${item.name}</h6>
                    <small class="text-muted">
                        ${Object.entries(item.quantities).map(([warehouseId, qty]) => 
                            `${warehouses.find(w => w.id === parseInt(warehouseId))?.name}: ${qty}`
                        ).join(', ')}
                    </small>
                </div>
                <div class="text-end">
                    <div>${itemTotal.toFixed(2)}</div>
                    <button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    totalAmount.value = total.toFixed(2);
    completeReturnBtn.disabled = false;
}

// Remove from cart
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// Complete return
async function completeReturn() {
    if (!selectedReferenceId || !selectedWorkerId || cart.length === 0) {
        alert('Please fill in all required fields and add items to cart');
        return;
    }

    try {
        // Start a transaction
        const { data: returnData, error: returnError } = await supabase
            .from('returns')
            .insert({
                return_number: returnNumber.value,
                return_type: currentReturnType,
                customer_id: currentReturnType === 'customer' ? selectedReferenceId : null,
                supplier_id: currentReturnType === 'supplier' ? selectedReferenceId : null,
                worker_id: selectedWorkerId,
                total_amount: parseFloat(totalAmount.value)
            })
            .select()
            .single();

        if (returnError) throw returnError;

        // Insert return items
        const returnItems = cart.flatMap(item => 
            Object.entries(item.quantities).map(([warehouseId, quantity]) => ({
                return_id: returnData.id,
                item_id: item.productId,
                warehouse_id: parseInt(warehouseId),
                quantity,
                unit_price: item.returnPrice,
                total_price: item.returnPrice * quantity
            }))
        );

        const { error: itemsError } = await supabase
            .from('return_items')
            .insert(returnItems);

        if (itemsError) throw itemsError;

        // Update stock
        for (const item of returnItems) {
            const { error: stockError } = await supabase.rpc('update_stock', {
                p_item_id: item.item_id,
                p_warehouse_id: item.warehouse_id,
                p_quantity: currentReturnType === 'customer' ? item.quantity : -item.quantity
            });

            if (stockError) throw stockError;
        }

        // Reset the form
        cart = [];
        selectedReferenceId = null;
        selectedWorkerId = null;
        referenceSearch.value = '';
        workerSelect.value = '';
        referenceBalance.textContent = '0.00';
        updateCartUI();
        await generateReturnNumber();

        alert('Return completed successfully');
    } catch (error) {
        console.error('Error completing return:', error);
        alert('Error completing return. Please try again.');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Return type change
    returnTypeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            currentReturnType = e.target.value;
            referenceLabel.textContent = currentReturnType === 'customer' ? 'Search Customer' : 'Search Supplier';
            referenceSearch.value = '';
            selectedReferenceId = null;
            referenceBalance.textContent = '0.00';
        });
    });

    // Reference search
    referenceSearch.addEventListener('input', async (e) => {
        const searchTerm = e.target.value.trim();
        if (searchTerm.length < 2) {
            referenceSuggestions.style.display = 'none';
            return;
        }

        const table = currentReturnType === 'customer' ? 'customers' : 'suppliers';
        const { data, error } = await supabase
            .from(table)
            .select(`
                id, 
                name, 
                phone_number,
                balance,
                cities(name)
            `)
            .ilike('name', `%${searchTerm}%`)
            .limit(5);

        if (error) {
            console.error('Error searching references:', error);
            return;
        }

        referenceSuggestions.innerHTML = data.map(ref => `
            <div class="reference-suggestion" data-id="${ref.id}" data-balance="${ref.balance}">
                <div class="d-flex justify-content-between">
                    <div>
                        <strong>${ref.name}</strong>
                        <div class="text-muted small">
                            ${ref.phone_number ? `Phone: ${ref.phone_number}` : ''}
                            ${ref.cities ? ` | City: ${ref.cities.name}` : ''}
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="small">Balance: ${parseFloat(ref.balance).toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `).join('');

        referenceSuggestions.style.display = 'block';
    });

    // Reference selection
    referenceSuggestions.addEventListener('click', async (e) => {
        const suggestion = e.target.closest('.reference-suggestion');
        if (!suggestion) return;

        selectedReferenceId = suggestion.dataset.id;
        referenceSearch.value = suggestion.textContent.trim();
        referenceBalance.textContent = parseFloat(suggestion.dataset.balance).toFixed(2);
        referenceSuggestions.style.display = 'none';

        // Show invoice search after reference selection
        const invoiceSearchContainer = document.createElement('div');
        invoiceSearchContainer.className = 'mt-3';
        invoiceSearchContainer.innerHTML = `
            <div class="form-group">
                <label>Search ${currentReturnType === 'customer' ? 'Sale' : 'Purchase'} Invoice</label>
                <input type="text" class="form-control" id="invoiceSearch" placeholder="Enter invoice number...">
                <div id="invoiceSuggestions" class="suggestions-box"></div>
            </div>
        `;
        referenceSearch.parentNode.appendChild(invoiceSearchContainer);

        // Setup invoice search
        const invoiceSearch = document.getElementById('invoiceSearch');
        const invoiceSuggestions = document.getElementById('invoiceSuggestions');

        invoiceSearch.addEventListener('input', async (e) => {
            const searchTerm = e.target.value.trim();
            if (searchTerm.length < 2) {
                invoiceSuggestions.style.display = 'none';
                return;
            }

            const table = currentReturnType === 'customer' ? 'sales' : 'purchases';
            const { data, error } = await supabase
                .from(table)
                .select(`
                    id,
                    invoice_number,
                    created_at,
                    total_amount,
                    ${currentReturnType === 'customer' ? 'sale_items' : 'purchase_items'}(
                        id,
                        item_id,
                        warehouse_id,
                        quantity,
                        unit_price,
                        items(name, brands(name)),
                        warehouses(name)
                    )
                `)
                .eq(currentReturnType === 'customer' ? 'customer_id' : 'supplier_id', selectedReferenceId)
                .ilike('invoice_number', `%${searchTerm}%`)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) {
                console.error('Error searching invoices:', error);
                return;
            }

            invoiceSuggestions.innerHTML = data.map(invoice => `
                <div class="invoice-suggestion" data-invoice-id="${invoice.id}">
                    <div class="d-flex justify-content-between">
                        <div>
                            <strong>${invoice.invoice_number}</strong>
                            <div class="text-muted small">
                                Date: ${new Date(invoice.created_at).toLocaleString()}
                            </div>
                        </div>
                        <div class="text-end">
                            <div>Amount: ${parseFloat(invoice.total_amount).toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            `).join('');

            invoiceSuggestions.style.display = 'block';
        });

        // Handle invoice selection
        invoiceSuggestions.addEventListener('click', async (e) => {
            const suggestion = e.target.closest('.invoice-suggestion');
            if (!suggestion) return;

            const invoiceId = suggestion.dataset.invoiceId;
            const table = currentReturnType === 'customer' ? 'sales' : 'purchases';
            const itemsTable = currentReturnType === 'customer' ? 'sale_items' : 'purchase_items';

            const { data, error } = await supabase
                .from(table)
                .select(`
                    ${itemsTable}(
                        id,
                        item_id,
                        warehouse_id,
                        quantity,
                        unit_price,
                        items(name, brands(name)),
                        warehouses(name)
                    )
                `)
                .eq('id', invoiceId)
                .single();

            if (error) {
                console.error('Error loading invoice items:', error);
                return;
            }

            // Update products list to show only items from this invoice
            products = data[itemsTable].map(item => ({
                id: item.item_id,
                name: item.items.name,
                brands: item.items.brands,
                retail_price: item.unit_price,
                purchase_price: item.unit_price,
                original_quantity: item.quantity,
                warehouse_id: item.warehouse_id,
                warehouse_name: item.warehouses.name
            }));

            // Render products grid with return quantity input
            productsGrid.innerHTML = products.map(product => `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="card product-card">
                        <div class="card-body">
                            <h6 class="card-title">${product.name}</h6>
                            <p class="card-text">${product.brands.name}</p>
                            <div class="mb-2">
                                <small class="text-muted">Original Quantity: ${product.original_quantity}</small>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Warehouse: ${product.warehouse_name}</small>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Price: ${product.retail_price}</small>
                            </div>
                            <div class="input-group input-group-sm">
                                <input type="number" 
                                    class="form-control return-quantity" 
                                    data-product-id="${product.id}"
                                    data-warehouse-id="${product.warehouse_id}"
                                    data-price="${product.retail_price}"
                                    min="0"
                                    max="${product.original_quantity}"
                                    value="0"
                                    placeholder="Return Qty">
                                <button class="btn btn-outline-primary" 
                                    onclick="addToCartFromGrid(${product.id})">
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            invoiceSuggestions.style.display = 'none';
            document.getElementById('invoiceSearch').value = '';
        });
    });

    // Worker selection
    workerSelect.addEventListener('change', (e) => {
        selectedWorkerId = e.target.value;
    });

    // Brand tab click
    brandTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.brand-tab');
        if (!tab) return;

        document.querySelectorAll('.brand-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        loadProducts(tab.dataset.brandId);
    });

    // Add to cart button
    document.getElementById('addToCart').addEventListener('click', addToCart);

    // Complete return button
    completeReturnBtn.addEventListener('click', completeReturn);

    // View returns button
    viewReturnsBtn.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('returnsListModal'));
        loadReturns();
        modal.show();
    });

    // Load initial products
    loadProducts('all');
}

// Load returns for the list modal
async function loadReturns() {
    try {
        const { data, error } = await supabase
            .from('returns')
            .select(`
                *,
                workers(name),
                customers(name),
                suppliers(name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        document.getElementById('returnsTable').innerHTML = data.map(return_ => `
            <tr>
                <td>${return_.return_number}</td>
                <td>${new Date(return_.created_at).toLocaleString()}</td>
                <td>${return_.return_type === 'customer' ? 'Customer' : 'Supplier'}</td>
                <td>${return_.return_type === 'customer' ? 
                    return_.customers?.name : 
                    return_.suppliers?.name}</td>
                <td>${return_.workers?.name}</td>
                <td>${return_.total_amount.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewReturnDetails(${return_.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading returns:', error);
        alert('Error loading returns. Please try again.');
    }
}

// View return details
window.viewReturnDetails = async function(returnId) {
    try {
        const { data, error } = await supabase
            .from('returns')
            .select(`
                *,
                workers(name),
                customers(name),
                suppliers(name),
                return_items(
                    *,
                    items(name, brands(name))
                )
            `)
            .eq('id', returnId)
            .single();

        if (error) throw error;

        document.getElementById('returnDetails').innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6>Return Information</h6>
                    <p><strong>Return #:</strong> ${data.return_number}</p>
                    <p><strong>Date:</strong> ${new Date(data.created_at).toLocaleString()}</p>
                    <p><strong>Type:</strong> ${data.return_type === 'customer' ? 'Customer' : 'Supplier'}</p>
                    <p><strong>Reference:</strong> ${data.return_type === 'customer' ? 
                        data.customers?.name : 
                        data.suppliers?.name}</p>
                    <p><strong>Worker:</strong> ${data.workers?.name}</p>
                </div>
                <div class="col-md-6">
                    <h6>Amount Details</h6>
                    <p><strong>Total Amount:</strong> ${data.total_amount.toFixed(2)}</p>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Brand</th>
                            <th>Warehouse</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.return_items.map(item => `
                            <tr>
                                <td>${item.items.name}</td>
                                <td>${item.items.brands.name}</td>
                                <td>${warehouses.find(w => w.id === item.warehouse_id)?.name}</td>
                                <td>${item.quantity}</td>
                                <td>${item.unit_price.toFixed(2)}</td>
                                <td>${item.total_price.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('returnDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading return details:', error);
        alert('Error loading return details. Please try again.');
    }
}

// Add to cart from grid
window.addToCartFromGrid = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const quantityInput = document.querySelector(`.return-quantity[data-product-id="${productId}"]`);
    const quantity = parseInt(quantityInput.value);

    if (quantity <= 0) {
        alert('Please enter a valid quantity');
        return;
    }

    if (quantity > product.original_quantity) {
        alert(`Return quantity cannot exceed original quantity (${product.original_quantity})`);
        return;
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(item => 
        item.productId === productId && 
        Object.keys(item.quantities)[0] === product.warehouse_id.toString()
    );

    if (existingItemIndex !== -1) {
        // Update existing item quantity
        cart[existingItemIndex].quantities[product.warehouse_id] = quantity;
    } else {
        // Add new item to cart
        cart.push({
            productId: product.id,
            name: product.name,
            returnPrice: product.retail_price,
            quantities: {
                [product.warehouse_id]: quantity
            }
        });
    }

    updateCartUI();
    quantityInput.value = 0;
};

// Initialize the page
initialize(); 