import { supabaseClient } from '../js/config.js';

// DOM Elements
const supplierSearch = document.getElementById('supplierSearch');
const supplierSuggestions = document.getElementById('supplierSuggestions');
const selectedSupplierId = document.getElementById('selectedSupplierId');
const workerSelect = document.getElementById('workerSelect');
const supplierBalance = document.getElementById('supplierBalance');
const brandsContainer = document.getElementById('brandsContainer');
const productsGrid = document.getElementById('productsGrid');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const invoiceNumber = document.getElementById('invoiceNumber');
const totalAmount = document.getElementById('totalAmount');
const paidAmount = document.getElementById('paidAmount');
const remainingAmount = document.getElementById('remainingAmount');
const completePurchase = document.getElementById('completePurchase');
const viewPurchasesBtn = document.getElementById('viewPurchasesBtn');

// State
let cart = [];
let selectedBrand = null;
let brands = [];
let products = [];
let suppliers = [];
let workers = [];

// Initialize
async function initialize() {
    await Promise.all([
        loadBrands(),
        loadSuppliers(),
        loadWorkers()
    ]);
    setupEventListeners();
    
    // Generate and set initial invoice number
    const invoiceNum = await generateInvoiceNumber();
    if (invoiceNum) {
        invoiceNumber.value = invoiceNum;
    }
}

// Load Brands
async function loadBrands() {
    try {
        const { data, error } = await supabaseClient
            .from('brands')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        brands = data;
        displayBrands();
    } catch (error) {
        console.error('Error loading brands:', error);
        showError('Failed to load brands');
    }
}

// Display Brands
function displayBrands() {
    const brandTabs = document.getElementById('brandTabs');
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

// Load Products
async function loadProducts(brandId = null) {
    try {
        let query = supabaseClient
            .from('items')
            .select(`
                *,
                brands (name),
                inventory_stock (
                    warehouse_id,
                    quantity
                )
            `)
            .order('name');
        
        if (brandId && brandId !== 'all') {
            query = query.eq('brand_id', brandId);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        products = data;
        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Failed to load products');
    }
}

// Display Products
function displayProducts() {
    productsGrid.innerHTML = products.map(product => `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="card product-card" data-product-id="${product.id}">
                <div class="card-body">
                    <h6 class="card-title">${product.name}</h6>
                    <p class="card-text text-muted">${product.brands?.name || 'No Brand'}</p>
                    <p class="card-text">
                        <small class="text-muted">Purchase Price: ${product.purchase_price.toLocaleString()}</small>
                    </p>
                </div>
            </div>
        </div>
    `).join('');
}

// Load Suppliers
async function loadSuppliers() {
    try {
        const { data, error } = await supabaseClient
            .from('suppliers')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        suppliers = data;
    } catch (error) {
        console.error('Error loading suppliers:', error);
        showError('Failed to load suppliers');
    }
}

// Load Workers
async function loadWorkers() {
    try {
        const { data, error } = await supabaseClient
            .from('workers')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        workers = data;
        displayWorkers();
    } catch (error) {
        console.error('Error loading workers:', error);
        showError('Failed to load workers');
    }
}

// Display Workers
function displayWorkers() {
    workerSelect.innerHTML = `
        <option value="">Select Worker</option>
        ${workers.map(worker => `
            <option value="${worker.id}">${worker.name}</option>
        `).join('')}
    `;
}

// Setup Event Listeners
function setupEventListeners() {
    // Brand tabs
    brandsContainer.addEventListener('click', (e) => {
        const brandTab = e.target.closest('.brand-tab');
        if (!brandTab) return;
        
        document.querySelectorAll('.brand-tab').forEach(tab => tab.classList.remove('active'));
        brandTab.classList.add('active');
        
        const brandId = brandTab.dataset.brandId;
        loadProducts(brandId);
    });

    // Product cards
    productsGrid.addEventListener('click', (e) => {
        const productCard = e.target.closest('.product-card');
        if (!productCard) return;
        
        const productId = parseInt(productCard.dataset.productId);
        const product = products.find(p => p.id === productId);
        if (product) {
            showQuantityModal(product);
        }
    });

    // Supplier search
    supplierSearch.addEventListener('input', handleSupplierSearch);
    supplierSuggestions.addEventListener('click', handleSupplierSelection);

    // Cart updates
    paidAmount.addEventListener('input', updateRemainingAmount);
    completePurchase.addEventListener('click', handlePurchaseCompletion);
    viewPurchasesBtn.addEventListener('click', showPurchasesList);

    // Add filter event listeners
    document.getElementById('dateRange').addEventListener('change', loadPurchases);
    document.getElementById('supplierFilter').addEventListener('change', loadPurchases);
    document.getElementById('workerFilter').addEventListener('change', loadPurchases);
    document.getElementById('minAmount').addEventListener('input', loadPurchases);

    // Initial load
    loadProducts();
}

// Handle Supplier Search
function handleSupplierSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    if (!searchTerm) {
        supplierSuggestions.style.display = 'none';
        return;
    }

    const filteredSuppliers = suppliers.filter(supplier => 
        supplier.name.toLowerCase().includes(searchTerm)
    );

    supplierSuggestions.innerHTML = filteredSuppliers.map(supplier => `
        <div class="supplier-suggestion" data-supplier-id="${supplier.id}">
            ${supplier.name}
        </div>
    `).join('');

    supplierSuggestions.style.display = filteredSuppliers.length ? 'block' : 'none';
}

// Handle Supplier Selection
async function handleSupplierSelection(e) {
    const suggestion = e.target.closest('.supplier-suggestion');
    if (!suggestion) return;

    const supplierId = parseInt(suggestion.dataset.supplierId);
    const supplier = suppliers.find(s => s.id === supplierId);
    
    if (supplier) {
        selectedSupplierId.value = supplierId;
        supplierSearch.value = supplier.name;
        supplierSuggestions.style.display = 'none';
        
        // Update supplier balance
        supplierBalance.textContent = supplier.balance.toLocaleString();
    }
}

// Show Quantity Modal
function showQuantityModal(product) {
    const modal = new bootstrap.Modal(document.getElementById('quantityModal'));
    const modalTitle = document.getElementById('quantityModalTitle');
    const selectedItemName = document.getElementById('selectedItemName');
    const purchasePrice = document.getElementById('purchasePrice');
    const retailPrice = document.getElementById('retailPrice');
    const warehouseOptions = document.getElementById('warehouseOptions');
    const addToCartBtn = document.getElementById('addToCart');

    modalTitle.textContent = 'Add Item to Purchase';
    selectedItemName.textContent = product.name;
    purchasePrice.value = product.purchase_price;
    retailPrice.value = product.retail_price;

    // Display warehouse options
    warehouseOptions.innerHTML = product.inventory_stock.map(stock => `
        <div class="warehouse-item">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>Warehouse ${stock.warehouse_id}</strong>
                    <div class="stock-info">Current Stock: ${stock.quantity}</div>
                </div>
                <div class="input-group" style="width: 150px;">
                    <input type="number" class="form-control form-control-sm warehouse-quantity" 
                           data-warehouse-id="${stock.warehouse_id}" 
                           min="1" value="1">
                </div>
            </div>
        </div>
    `).join('');

    // Add event listener for Add to Cart button
    addToCartBtn.onclick = () => {
        const quantities = Array.from(document.querySelectorAll('.warehouse-quantity'))
            .filter(input => input.value > 0)
            .map(input => ({
                warehouse_id: parseInt(input.dataset.warehouseId),
                quantity: parseInt(input.value)
            }));

        if (quantities.length === 0) {
            showError('Please enter quantity for at least one warehouse');
            return;
        }

        addToCart(product, quantities);
        modal.hide();
    };

    modal.show();
}

// Add to Cart
function addToCart(product, quantities) {
    const cartItem = {
        id: product.id,
        name: product.name,
        brand: product.brands?.name || 'No Brand',
        purchase_price: parseFloat(document.getElementById('purchasePrice').value),
        retail_price: parseFloat(document.getElementById('retailPrice').value),
        quantities: quantities
    };

    cart.push(cartItem);
    updateCart();
    updateTotalAmount();
}

// Update Cart
function updateCart() {
    cartCount.textContent = cart.length;
    cartItems.innerHTML = cart.map((item, index) => `
        <div class="card mb-2">
            <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${item.name}</h6>
                        <small class="text-muted">${item.brand}</small>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                <div class="mt-2">
                    ${item.quantities.map(q => `
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <small>Warehouse ${q.warehouse_id}</small>
                            <span>${q.quantity} × ${item.purchase_price.toLocaleString()}</span>
                        </div>
                    `).join('')}
                    <div class="text-end mt-1">
                        <strong>Total: ${calculateItemTotal(item).toLocaleString()}</strong>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    completePurchase.disabled = cart.length === 0;
}

// Calculate Item Total
function calculateItemTotal(item) {
    return item.quantities.reduce((total, q) => total + (q.quantity * item.purchase_price), 0);
}

// Update Total Amount
function updateTotalAmount() {
    const total = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    totalAmount.value = total;
    updateRemainingAmount();
}

// Update Remaining Amount
function updateRemainingAmount() {
    const total = parseFloat(totalAmount.value) || 0;
    const paid = parseFloat(paidAmount.value) || 0;
    remainingAmount.value = total - paid;
}

// Remove from Cart
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
    updateTotalAmount();
}

// Generate Invoice Number
async function generateInvoiceNumber() {
    try {
        // Get today's date in YYYYMMDD format
        const today = new Date();
        const dateStr = today.getFullYear().toString() +
            (today.getMonth() + 1).toString().padStart(2, '0') +
            today.getDate().toString().padStart(2, '0');

        // Get the latest invoice number for today
        const { data, error } = await supabaseClient
            .from('purchases')
            .select('invoice_number')
            .ilike('invoice_number', `PUR-${dateStr}-%`)
            .order('invoice_number', { ascending: false })
            .limit(1);

        if (error) throw error;

        let sequence = 1;
        if (data && data.length > 0) {
            // Extract sequence number from the latest invoice
            const lastSequence = parseInt(data[0].invoice_number.split('-')[2]);
            sequence = lastSequence + 1;
        }

        // Generate new invoice number: PUR-YYYYMMDD-XXX
        return `PUR-${dateStr}-${sequence.toString().padStart(3, '0')}`;
    } catch (error) {
        console.error('Error generating invoice number:', error);
        showError('Failed to generate invoice number');
        return null;
    }
}

// Handle Purchase Completion
async function handlePurchaseCompletion() {
    if (!selectedSupplierId.value) {
        showError('Please select a supplier');
        return;
    }

    if (!workerSelect.value) {
        showError('Please select a worker');
        return;
    }

    const total = parseFloat(totalAmount.value);
    const paid = parseFloat(paidAmount.value) || 0;

    try {
        // Start transaction
        const { data: purchase, error: purchaseError } = await supabaseClient
            .from('purchases')
            .insert({
                invoice_number: invoiceNumber.value,
                supplier_id: parseInt(selectedSupplierId.value),
                worker_id: parseInt(workerSelect.value),
                total_amount: total,
                amount_paid: paid,
                discount: 0
            })
            .select()
            .single();

        if (purchaseError) throw purchaseError;

        // Insert purchase items
        const purchaseItems = cart.flatMap(item => 
            item.quantities.map(q => ({
                purchase_id: purchase.id,
                item_id: item.id,
                warehouse_id: q.warehouse_id,
                quantity: q.quantity,
                unit_price: item.purchase_price,
                total_price: q.quantity * item.purchase_price
            }))
        );

        const { error: itemsError } = await supabaseClient
            .from('purchase_items')
            .insert(purchaseItems);

        if (itemsError) throw itemsError;

        // Update stock
        for (const item of cart) {
            for (const q of item.quantities) {
                const { error: stockError } = await supabaseClient.rpc('update_stock', {
                    p_item_id: item.id,
                    p_warehouse_id: q.warehouse_id,
                    p_quantity: q.quantity
                });

                if (stockError) throw stockError;
            }
        }

        // Clear cart and show success
        cart = [];
        updateCart();
        updateTotalAmount();
        showSuccess('Purchase completed successfully');
        
        // Reset form and generate new invoice number
        const newInvoiceNum = await generateInvoiceNumber();
        if (newInvoiceNum) {
            invoiceNumber.value = newInvoiceNum;
        }
        paidAmount.value = '';
        selectedSupplierId.value = '';
        supplierSearch.value = '';
        supplierBalance.textContent = '0.00';

    } catch (error) {
        console.error('Error completing purchase:', error);
        showError('Failed to complete purchase');
    }
}

// Show Purchases List
async function showPurchasesList() {
    const purchasesListModal = document.getElementById('purchasesListModal');
    const modal = new bootstrap.Modal(purchasesListModal);
    
    // Add event listener for modal hidden event
    purchasesListModal.addEventListener('hidden.bs.modal', () => {
        // Clean up any event listeners or state if needed
        document.getElementById('dateRange').value = 'all';
        document.getElementById('supplierFilter').value = '';
        document.getElementById('workerFilter').value = '';
        document.getElementById('minAmount').value = '';
    });

    await loadPurchases();
    modal.show();
}

// Load Purchases
async function loadPurchases() {
    try {
        const dateRange = document.getElementById('dateRange').value;
        const supplierId = document.getElementById('supplierFilter').value;
        const workerId = document.getElementById('workerFilter').value;
        const minAmount = document.getElementById('minAmount').value;

        let query = supabaseClient
            .from('purchases')
            .select(`
                *,
                suppliers (name),
                workers (name)
            `)
            .order('purchase_date', { ascending: false });

        // Apply date filter
        if (dateRange !== 'all') {
            const today = new Date();
            let startDate = new Date();
            
            switch (dateRange) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case 'yesterday':
                    startDate.setDate(today.getDate() - 1);
                    startDate.setHours(0, 0, 0, 0);
                    const endDate = new Date(today);
                    endDate.setHours(0, 0, 0, 0);
                    query = query.lte('purchase_date', endDate.toISOString());
                    break;
                case 'week':
                    startDate.setDate(today.getDate() - 7);
                    break;
                case 'month':
                    startDate.setDate(today.getDate() - 30);
                    break;
            }
            
            if (dateRange !== 'yesterday') {
                query = query.gte('purchase_date', startDate.toISOString());
            }
        }

        // Apply supplier filter
        if (supplierId) {
            query = query.eq('supplier_id', supplierId);
        }

        // Apply worker filter
        if (workerId) {
            query = query.eq('worker_id', workerId);
        }

        // Apply minimum amount filter
        if (minAmount) {
            query = query.gte('total_amount', parseFloat(minAmount));
        }

        const { data, error } = await query;

        if (error) throw error;

        displayPurchases(data);
    } catch (error) {
        console.error('Error loading purchases:', error);
        showError('Failed to load purchases');
    }
}

// Display Purchases
function displayPurchases(purchases) {
    const tbody = document.getElementById('purchasesTable');
    tbody.innerHTML = purchases.map(purchase => `
        <tr>
            <td>${purchase.invoice_number}</td>
            <td>${new Date(purchase.purchase_date).toLocaleDateString()}</td>
            <td>${purchase.suppliers?.name || 'N/A'}</td>
            <td>${purchase.workers?.name || 'N/A'}</td>
            <td>${purchase.total_amount.toLocaleString()}</td>
            <td>${purchase.amount_paid.toLocaleString()}</td>
            <td>${(purchase.total_amount - purchase.amount_paid).toLocaleString()}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="showPurchaseDetails(${purchase.id})">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Show Purchase Details
async function showPurchaseDetails(purchaseId) {
    try {
        const { data, error } = await supabaseClient
            .from('purchases')
            .select(`
                *,
                suppliers (name),
                workers (name),
                purchase_items (
                    *,
                    items (name),
                    warehouses (name)
                )
            `)
            .eq('id', purchaseId)
            .single();

        if (error) throw error;

        const detailsContainer = document.getElementById('purchaseDetails');
        detailsContainer.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <p><strong>Invoice Number:</strong> ${data.invoice_number}</p>
                    <p><strong>Date:</strong> ${new Date(data.purchase_date).toLocaleString()}</p>
                    <p><strong>Supplier:</strong> ${data.suppliers?.name || 'N/A'}</p>
                    <p><strong>Worker:</strong> ${data.workers?.name || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Total Amount:</strong> ${data.total_amount.toLocaleString()}</p>
                    <p><strong>Paid Amount:</strong> ${data.amount_paid.toLocaleString()}</p>
                    <p><strong>Remaining:</strong> ${(data.total_amount - data.amount_paid).toLocaleString()}</p>
                </div>
            </div>
            <h6>Items</h6>
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Warehouse</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.purchase_items.map(item => `
                            <tr>
                                <td>${item.items?.name || 'N/A'}</td>
                                <td>${item.warehouses?.name || 'N/A'}</td>
                                <td>${item.quantity}</td>
                                <td>${item.unit_price.toLocaleString()}</td>
                                <td>${item.total_price.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('purchaseDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading purchase details:', error);
        showError('Failed to load purchase details');
    }
}

// Utility Functions
function showError(message) {
    // Implement error notification
    alert(message);
}

function showSuccess(message) {
    // Implement success notification
    alert(message);
}

// Initialize the page
initialize(); 