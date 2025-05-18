import { supabase } from '../../js/config.js';

// DOM Elements
const itemsTableBody = document.getElementById('itemsTableBody');
const transfersTableBody = document.getElementById('transfersTableBody');
const brandsTableBody = document.getElementById('brandsTableBody');
const warehousesTableBody = document.getElementById('warehousesTableBody');
const searchItem = document.getElementById('searchItem');
const filterBrand = document.getElementById('filterBrand');
const filterWarehouse = document.getElementById('filterWarehouse');
const filterStatus = document.getElementById('filterStatus');
const totalItems = document.getElementById('totalItems');
const lowStockItems = document.getElementById('lowStockItems');
const outOfStockItems = document.getElementById('outOfStockItems');
const overstockedItems = document.getElementById('overstockedItems');

// Store all items for filtering
let allItems = [];
let filteredItems = [];

// Load data when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadItems();
    loadTransfers();
    loadBrands();
    loadWarehouses();
    setupEventListeners();
});

// Setup event listeners for filtering
function setupEventListeners() {
    searchItem.addEventListener('input', filterItems);
    filterBrand.addEventListener('change', filterItems);
    filterWarehouse.addEventListener('change', filterItems);
    filterStatus.addEventListener('change', filterItems);
}

// Filter items based on search and filters
function filterItems() {
    const searchTerm = searchItem.value.toLowerCase();
    const brandFilter = filterBrand.value;
    const warehouseFilter = filterWarehouse.value;
    const statusFilter = filterStatus.value;

    const filteredItems = allItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm) ||
                            item.brand.name.toLowerCase().includes(searchTerm);
        const matchesBrand = !brandFilter || item.brand.id === parseInt(brandFilter);
        const matchesWarehouse = !warehouseFilter || 
            item.stock.some(s => s.warehouse.id === parseInt(warehouseFilter));
        const matchesStatus = !statusFilter || getItemStatus(item) === statusFilter;

        return matchesSearch && matchesBrand && matchesWarehouse && matchesStatus;
    });

    displayItems(filteredItems);
}

// Get item status
function getItemStatus(item) {
    const totalStock = item.stock.reduce((sum, s) => sum + s.quantity, 0);
    if (totalStock === 0) return 'out';
    if (totalStock <= item.min_stock_level) return 'low';
    if (totalStock >= item.max_stock_level) return 'over';
    return 'normal';
}

// Update statistics
function updateStatistics(items) {
    totalItems.textContent = items.length;
    lowStockItems.textContent = items.filter(item => getItemStatus(item) === 'low').length;
    outOfStockItems.textContent = items.filter(item => getItemStatus(item) === 'out').length;
    overstockedItems.textContent = items.filter(item => getItemStatus(item) === 'over').length;
}

// Display items in table
function displayItems(items) {
    itemsTableBody.innerHTML = items.map(item => {
        const totalStock = item.stock.reduce((sum, s) => sum + s.quantity, 0);
        const warehouseStock = item.stock.map(s => 
            `${s.warehouse.name}: ${s.quantity}`
        ).join('<br>');
        
        const status = getItemStatus(item);
        const statusBadge = {
            'low': '<span class="badge bg-warning">Low Stock</span>',
            'out': '<span class="badge bg-danger">Out of Stock</span>',
            'over': '<span class="badge bg-success">Overstocked</span>',
            'normal': '<span class="badge bg-info">Normal</span>'
        }[status];

        const stockLevel = `${totalStock} / ${item.max_stock_level}`;

        return `
            <tr>
                <td>${item.name}</td>
                <td>${item.brand.name}</td>
                <td>${item.purchase_price.toFixed(2)}</td>
                <td>${item.retail_price.toFixed(2)}</td>
                <td>${totalStock}</td>
                <td>${warehouseStock}</td>
                <td>${stockLevel}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editItem(${item.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteItem(${item.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Load items with their stock levels
async function loadItems() {
    try {
        const { data: items, error: itemsError } = await supabase
            .from('items')
            .select(`
                *,
                brand:brands(name),
                stock:inventory_stock(
                    warehouse:warehouses(name),
                    quantity
                )
            `);

        if (itemsError) throw itemsError;

        allItems = items;
        updateStatistics(items);
        displayItems(items);

        // Update brand filter options
        const brands = [...new Set(items.map(item => item.brand))];
        filterBrand.innerHTML = '<option value="">All Brands</option>' +
            brands.map(brand => `<option value="${brand.id}">${brand.name}</option>`).join('');

    } catch (error) {
        console.error('Error loading items:', error);
        alert('Error loading items. Please try again.');
    }
}

// Load stock transfers
async function loadTransfers() {
    try {
        const { data: transfers, error: transfersError } = await supabase
            .from('stock_transfers')
            .select(`
                *,
                item:items(name),
                from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(name),
                to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(name)
            `)
            .order('transfer_date', { ascending: false });

        if (transfersError) throw transfersError;

        transfersTableBody.innerHTML = transfers.map(transfer => `
            <tr>
                <td>${new Date(transfer.transfer_date).toLocaleString()}</td>
                <td>${transfer.item?.name || 'Unknown Item'}</td>
                <td>${transfer.from_warehouse?.name || 'Unknown Warehouse'}</td>
                <td>${transfer.to_warehouse?.name || 'Unknown Warehouse'}</td>
                <td>${transfer.quantity}</td>
                <td>${transfer.note || '-'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading transfers:', error);
        alert('Error loading transfers. Please try again.');
    }
}

// Load brands
async function loadBrands() {
    try {
        const { data: brands, error: brandsError } = await supabase
            .from('brands')
            .select('*')
            .order('name');

        if (brandsError) throw brandsError;

        brandsTableBody.innerHTML = brands.map(brand => `
            <tr>
                <td>${brand.name}</td>
                <td>${brand.description || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editBrand(${brand.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBrand(${brand.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Update brand select in add item modal
        const brandSelect = document.querySelector('#addItemForm select[name="brand_id"]');
        if (brandSelect) {
            brandSelect.innerHTML = brands.map(brand => 
                `<option value="${brand.id}">${brand.name}</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Error loading brands:', error);
        alert('Error loading brands. Please try again.');
    }
}

// Load warehouses
async function loadWarehouses() {
    try {
        const { data: warehouses, error: warehousesError } = await supabase
            .from('warehouses')
            .select('*')
            .order('name');

        if (warehousesError) throw warehousesError;

        warehousesTableBody.innerHTML = warehouses.map(warehouse => `
            <tr>
                <td>${warehouse.name}</td>
                <td>${warehouse.location || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editWarehouse(${warehouse.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteWarehouse(${warehouse.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Update warehouse selects in transfer modal
        const fromWarehouseSelect = document.querySelector('#newTransferForm select[name="from_warehouse_id"]');
        const toWarehouseSelect = document.querySelector('#newTransferForm select[name="to_warehouse_id"]');
        if (fromWarehouseSelect && toWarehouseSelect) {
            const options = warehouses.map(warehouse => 
                `<option value="${warehouse.id}">${warehouse.name}</option>`
            ).join('');
            fromWarehouseSelect.innerHTML = options;
            toWarehouseSelect.innerHTML = options;
        }

        // Update warehouse filter
        filterWarehouse.innerHTML = '<option value="">All Warehouses</option>' +
            warehouses.map(warehouse => 
                `<option value="${warehouse.id}">${warehouse.name}</option>`
            ).join('');

        // Update warehouse stock inputs in add item modal
        const warehouseStockInputs = document.getElementById('warehouseStockInputs');
        if (warehouseStockInputs) {
            warehouseStockInputs.innerHTML = warehouses.map(warehouse => `
                <div class="input-group mb-2">
                    <span class="input-group-text">${warehouse.name}</span>
                    <input type="number" class="form-control" name="warehouse_stock_${warehouse.id}" 
                           placeholder="Enter quantity" min="0" value="0">
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading warehouses:', error);
        alert('Error loading warehouses. Please try again.');
    }
}

// Export stock report
window.exportStockReport = () => {
    const items = allItems.map(item => {
        const totalStock = item.stock.reduce((sum, s) => sum + s.quantity, 0);
        return {
            'Item Name': item.name,
            'Brand': item.brand.name,
            'Purchase Price': item.purchase_price,
            'Retail Price': item.retail_price,
            'Total Stock': totalStock,
            'Min Stock Level': item.min_stock_level,
            'Max Stock Level': item.max_stock_level,
            'Status': getItemStatus(item).toUpperCase()
        };
    });

    const csv = [
        Object.keys(items[0]).join(','),
        ...items.map(item => Object.values(item).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

// Show modals
window.showAddItemModal = () => {
    const modal = new bootstrap.Modal(document.getElementById('addItemModal'));
    modal.show();
};

window.showNewTransferModal = async () => {
    const modal = new bootstrap.Modal(document.getElementById('newTransferModal'));
    
    // Set default transfer date to current date/time
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.querySelector('#newTransferForm input[name="transfer_date"]').value = 
        now.toISOString().slice(0, 16);

    // Load brands
    try {
        const { data: brands, error: brandsError } = await supabase
            .from('brands')
            .select('*')
            .order('name');

        if (brandsError) throw brandsError;

        const brandSelect = document.querySelector('#newTransferForm select[name="brand_id"]');
        if (brandSelect) {
            brandSelect.innerHTML = '<option value="">Select Brand</option>' +
                brands.map(brand => `<option value="${brand.id}">${brand.name}</option>`).join('');
        }

        // Load warehouses
        const { data: warehouses, error: warehousesError } = await supabase
            .from('warehouses')
            .select('*')
            .order('name');

        if (warehousesError) throw warehousesError;

        const fromWarehouseSelect = document.querySelector('#newTransferForm select[name="from_warehouse_id"]');
        const toWarehouseSelect = document.querySelector('#newTransferForm select[name="to_warehouse_id"]');

        if (fromWarehouseSelect && toWarehouseSelect) {
            const options = warehouses.map(warehouse => 
                `<option value="${warehouse.id}">${warehouse.name}</option>`
            ).join('');
            
            fromWarehouseSelect.innerHTML = '<option value="">Select Source Warehouse</option>' + options;
            toWarehouseSelect.innerHTML = '<option value="">Select Destination Warehouse</option>' + options;
        }
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Please try again.');
    }

    modal.show();
};

window.showAddBrandModal = () => {
    const modal = new bootstrap.Modal(document.getElementById('addBrandModal'));
    modal.show();
};

window.showAddWarehouseModal = () => {
    const modal = new bootstrap.Modal(document.getElementById('addWarehouseModal'));
    modal.show();
};

// Save functions
window.saveItem = async () => {
    try {
        const form = document.getElementById('addItemForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Extract warehouse stock data
        const warehouseStock = {};
        for (const [key, value] of Object.entries(data)) {
            if (key.startsWith('warehouse_stock_')) {
                const warehouseId = key.replace('warehouse_stock_', '');
                warehouseStock[warehouseId] = parseInt(value) || 0;
            }
        }

        // Remove warehouse stock data from main item data
        const itemData = Object.fromEntries(
            Object.entries(data).filter(([key]) => !key.startsWith('warehouse_stock_'))
        );

        // Insert item
        const { data: newItem, error: itemError } = await supabase
            .from('items')
            .insert([itemData])
            .select()
            .single();

        if (itemError) throw itemError;

        // Insert warehouse stock
        const stockEntries = Object.entries(warehouseStock)
            .filter(([_, quantity]) => quantity > 0)
            .map(([warehouseId, quantity]) => ({
                item_id: newItem.id,
                warehouse_id: parseInt(warehouseId),
                quantity: quantity
            }));

        if (stockEntries.length > 0) {
            const { error: stockError } = await supabase
                .from('inventory_stock')
                .insert(stockEntries);

            if (stockError) throw stockError;
        }

        bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
        form.reset();
        loadItems();
        alert('Item added successfully!');
    } catch (error) {
        console.error('Error saving item:', error);
        alert('Error saving item. Please try again.');
    }
};

// Update transfer item select with stock information
async function updateTransferItemSelect(brandId = null) {
    try {
        const { data: items, error: itemsError } = await supabase
            .from('items')
            .select(`
                *,
                brand:brands(name),
                stock:inventory_stock(
                    warehouse:warehouses(id, name),
                    quantity
                )
            `)
            .eq(brandId ? 'brand_id' : 'id', brandId || 'id');

        if (itemsError) throw itemsError;

        filteredItems = items;
        const itemSelect = document.querySelector('#newTransferForm select[name="item_id"]');
        if (itemSelect) {
            itemSelect.innerHTML = '<option value="">Select Item</option>' +
                items.map(item => {
                    const stockInfo = item.stock.map(s => 
                        `${s.warehouse.name}: ${s.quantity}`
                    ).join(', ');
                    return `<option value="${item.id}" data-stock='${JSON.stringify(item.stock)}'>
                        ${item.name} - Stock: ${stockInfo}
                    </option>`;
                }).join('');
        }
    } catch (error) {
        console.error('Error updating transfer item select:', error);
        alert('Error loading items for transfer. Please try again.');
    }
}

// Update stock levels display
function updateStockLevelsDisplay(stockData) {
    const stockLevelsDiv = document.getElementById('stockLevels');
    if (!stockLevelsDiv) return;

    if (!stockData || stockData.length === 0) {
        stockLevelsDiv.innerHTML = 'No stock data available';
        return;
    }

    const totalStock = stockData.reduce((sum, s) => sum + s.quantity, 0);
    stockLevelsDiv.innerHTML = `
        <div class="mb-2">
            <strong>Total Stock:</strong> ${totalStock} units
        </div>
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Warehouse</th>
                        <th class="text-end">Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    ${stockData.map(s => `
                        <tr>
                            <td>${s.warehouse.name}</td>
                            <td class="text-end">${s.quantity}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Update warehouse selects
function updateWarehouseSelects(stockData) {
    const fromWarehouseSelect = document.querySelector('#newTransferForm select[name="from_warehouse_id"]');
    const toWarehouseSelect = document.querySelector('#newTransferForm select[name="to_warehouse_id"]');
    
    if (!fromWarehouseSelect || !toWarehouseSelect) return;

    // Reset warehouse selects
    fromWarehouseSelect.innerHTML = '<option value="">Select Source Warehouse</option>';
    toWarehouseSelect.innerHTML = '<option value="">Select Destination Warehouse</option>';

    // Add warehouse options
    stockData.forEach(stock => {
        if (!stock.warehouse || !stock.warehouse.id) return;

        // Source warehouse option
        const fromOption = document.createElement('option');
        fromOption.value = stock.warehouse.id;
        fromOption.text = `${stock.warehouse.name} (${stock.quantity} available)`;
        fromOption.disabled = stock.quantity <= 0;
        fromWarehouseSelect.appendChild(fromOption);

        // Destination warehouse option
        const toOption = document.createElement('option');
        toOption.value = stock.warehouse.id;
        toOption.text = `${stock.warehouse.name} (${stock.quantity} current)`;
        toWarehouseSelect.appendChild(toOption);
    });

    // Reset warehouse info displays
    document.getElementById('fromWarehouseStock').textContent = 'Select a warehouse to see available stock';
    document.getElementById('toWarehouseStock').textContent = 'Select a warehouse to see current stock';
}

// Setup event listeners for transfer form
document.addEventListener('DOMContentLoaded', () => {
    // Brand selection handler
    document.querySelector('#newTransferForm select[name="brand_id"]')?.addEventListener('change', function() {
        const brandId = this.value;
        updateTransferItemSelect(brandId);
        document.querySelector('#newTransferForm select[name="item_id"]').value = '';
        document.querySelector('#itemSearch').value = '';
    });

    // Item search handler
    document.querySelector('#itemSearch')?.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const itemSelect = document.querySelector('#newTransferForm select[name="item_id"]');
        
        if (itemSelect) {
            const options = Array.from(itemSelect.options);
            options.forEach(option => {
                if (option.value === '') return; // Skip the default option
                const itemName = option.text.split(' - ')[0].toLowerCase();
                option.style.display = itemName.includes(searchTerm) ? '' : 'none';
            });
        }
    });

    // Item selection handler
    document.querySelector('#newTransferForm select[name="item_id"]')?.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const stockData = selectedOption.dataset.stock ? JSON.parse(selectedOption.dataset.stock) : [];
        
        // Update stock levels display
        updateStockLevelsDisplay(stockData);
        
        // Update warehouse selects
        updateWarehouseSelects(stockData);
        
        // Reset quantity validation
        document.getElementById('quantityValidation').textContent = '';
    });

    // From warehouse selection handler
    document.querySelector('#newTransferForm select[name="from_warehouse_id"]')?.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const availableStock = selectedOption.text.match(/\((\d+) available\)/)?.[1] || '0';
        
        document.getElementById('fromWarehouseStock').textContent = 
            `Available stock: ${availableStock} units`;
        
        // Update quantity validation
        const quantityInput = document.querySelector('#newTransferForm input[name="quantity"]');
        quantityInput.max = availableStock;
        validateTransferQuantity();

        // Reset destination warehouse selection
        const toWarehouseSelect = document.querySelector('#newTransferForm select[name="to_warehouse_id"]');
        if (toWarehouseSelect) {
            toWarehouseSelect.value = '';
            document.getElementById('toWarehouseStock').textContent = 'Select destination warehouse';
        }
    });

    // To warehouse selection handler
    document.querySelector('#newTransferForm select[name="to_warehouse_id"]')?.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const currentStock = selectedOption.text.match(/\((\d+) current\)/)?.[1] || '0';
        document.getElementById('toWarehouseStock').textContent = 
            `Current stock: ${currentStock} units (will be added to existing stock)`;
    });

    // Quantity input handler
    document.querySelector('#newTransferForm input[name="quantity"]')?.addEventListener('input', validateTransferQuantity);
});

// Validate transfer quantity
function validateTransferQuantity() {
    const quantityInput = document.querySelector('#newTransferForm input[name="quantity"]');
    const fromWarehouseSelect = document.querySelector('#newTransferForm select[name="from_warehouse_id"]');
    const validationDiv = document.getElementById('quantityValidation');
    
    if (!quantityInput || !fromWarehouseSelect || !validationDiv) return;

    const quantity = parseInt(quantityInput.value);
    const availableStock = parseInt(fromWarehouseSelect.options[fromWarehouseSelect.selectedIndex].text.match(/\((\d+) available\)/)?.[1] || '0');

    if (quantity > availableStock) {
        validationDiv.textContent = `Cannot transfer more than available stock (${availableStock} units)`;
        validationDiv.className = 'form-text text-danger';
        return false;
    } else if (quantity <= 0) {
        validationDiv.textContent = 'Transfer quantity must be greater than 0';
        validationDiv.className = 'form-text text-danger';
        return false;
    } else {
        validationDiv.textContent = `Valid transfer quantity (${availableStock - quantity} units will remain)`;
        validationDiv.className = 'form-text text-success';
        return true;
    }
}

// Save transfer with enhanced validation
window.saveTransfer = async () => {
    try {
        const form = document.getElementById('newTransferForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (!validateTransferQuantity()) {
            alert('Please check the transfer quantity');
            return;
        }

        // Validate warehouse selections
        if (!data.from_warehouse_id || !data.to_warehouse_id) {
            alert('Please select both source and destination warehouses');
            return;
        }

        if (data.from_warehouse_id === data.to_warehouse_id) {
            alert('Source and destination warehouses cannot be the same');
            return;
        }

        // Format transfer data for Supabase
        const transferData = {
            item_id: parseInt(data.item_id),
            from_warehouse_id: parseInt(data.from_warehouse_id),
            to_warehouse_id: parseInt(data.to_warehouse_id),
            quantity: parseInt(data.quantity),
            note: data.note || null,
            transfer_date: data.transfer_date || new Date().toISOString()
        };

        // Use the handle_stock_transfer function
        const { data: transferId, error: transferError } = await supabase
            .rpc('handle_stock_transfer', {
                p_item_id: transferData.item_id,
                p_from_warehouse_id: transferData.from_warehouse_id,
                p_to_warehouse_id: transferData.to_warehouse_id,
                p_quantity: transferData.quantity,
                p_note: transferData.note
            });

        if (transferError) {
            console.error('Transfer error:', transferError);
            throw new Error(transferError.message || 'Error processing transfer');
        }

        bootstrap.Modal.getInstance(document.getElementById('newTransferModal')).hide();
        form.reset();
        loadTransfers();
        loadItems();
        alert('Stock transfer completed successfully!');
    } catch (error) {
        console.error('Error saving transfer:', error);
        alert(error.message || 'Error saving transfer. Please try again.');
    }
};

window.saveBrand = async () => {
    try {
        const form = document.getElementById('addBrandForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const { error } = await supabase
            .from('brands')
            .insert([data]);

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('addBrandModal')).hide();
        form.reset();
        loadBrands();
        alert('Brand added successfully!');
    } catch (error) {
        console.error('Error saving brand:', error);
        alert('Error saving brand. Please try again.');
    }
};

window.saveWarehouse = async () => {
    try {
        const form = document.getElementById('addWarehouseForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const { error } = await supabase
            .from('warehouses')
            .insert([data]);

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('addWarehouseModal')).hide();
        form.reset();
        loadWarehouses();
        alert('Warehouse added successfully!');
    } catch (error) {
        console.error('Error saving warehouse:', error);
        alert('Error saving warehouse. Please try again.');
    }
};

// Delete functions
window.deleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', id);

        if (error) throw error;

        loadItems();
        alert('Item deleted successfully!');
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item. Please try again.');
    }
};

window.deleteBrand = async (id) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;

    try {
        const { error } = await supabase
            .from('brands')
            .delete()
            .eq('id', id);

        if (error) throw error;

        loadBrands();
        alert('Brand deleted successfully!');
    } catch (error) {
        console.error('Error deleting brand:', error);
        alert('Error deleting brand. Please try again.');
    }
};

window.deleteWarehouse = async (id) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;

    try {
        const { error } = await supabase
            .from('warehouses')
            .delete()
            .eq('id', id);

        if (error) throw error;

        loadWarehouses();
        alert('Warehouse deleted successfully!');
    } catch (error) {
        console.error('Error deleting warehouse:', error);
        alert('Error deleting warehouse. Please try again.');
    }
};

// Edit functions (to be implemented)
window.editItem = (id) => {
    // TODO: Implement edit item functionality
    alert('Edit item functionality coming soon!');
};

window.editBrand = (id) => {
    // TODO: Implement edit brand functionality
    alert('Edit brand functionality coming soon!');
};

window.editWarehouse = (id) => {
    // TODO: Implement edit warehouse functionality
    alert('Edit warehouse functionality coming soon!');
}; 