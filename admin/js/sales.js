import { supabase } from '../../js/config.js';

// Check admin access
checkAdminAccess();

// DOM Elements
const dateRange = document.getElementById('dateRange');
const customerFilter = document.getElementById('customerFilter');
const workerFilter = document.getElementById('workerFilter');
const minAmount = document.getElementById('minAmount');
const salesTable = document.getElementById('salesTable');
const pagination = document.getElementById('pagination');
const saleDetailsModal = new bootstrap.Modal(document.getElementById('saleDetailsModal'));
const saleDetails = document.getElementById('saleDetails');

// State
let currentPage = 1;
const itemsPerPage = 10;
let totalPages = 0;

// Initialize sales page
async function initializeSalesPage() {
    await Promise.all([
        loadCustomers(),
        loadWorkers()
    ]);
    loadSales();
}

// Load customers for filter
async function loadCustomers() {
    try {
        const { data: customers, error } = await supabase
            .from('customers')
            .select('id, name')
            .order('name');

        if (error) throw error;

        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            customerFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

// Load workers for filter
async function loadWorkers() {
    try {
        const { data: workers, error } = await supabase
            .from('workers')
            .select('id, name')
            .order('name');

        if (error) throw error;

        workers.forEach(worker => {
            const option = document.createElement('option');
            option.value = worker.id;
            option.textContent = worker.name;
            workerFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading workers:', error);
    }
}

// Load sales with filters
async function loadSales() {
    try {
        console.log('Loading sales with the same query structure as viewSaleDetails...');
        let query = supabase
            .from('sales')
            .select('*');

        // Apply filters
        query = applyFilters(query);

        // Get total count for pagination
        const { count } = await query.select('id', { count: 'exact', head: true });
        totalPages = Math.ceil(count / itemsPerPage);

        // Get paginated data
        const { data: salesIds, error: idsError } = await query
            .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)
            .select('id');

        if (idsError) {
            console.error('Error fetching sale IDs:', idsError);
            throw idsError;
        }

        if (!salesIds || salesIds.length === 0) {
            console.log('No sales found');
            salesTable.innerHTML = '<tr><td colspan="9" class="text-center">No sales found</td></tr>';
            return;
        }

        console.log('Sale IDs:', salesIds);

        // Fetch complete data for each sale
        const salesData = [];
        for (const saleId of salesIds.map(s => s.id)) {
            const { data: sale, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    customer:customers!customer_id (
                        id,
                        name,
                        phone_number
                    ),
                    worker:workers!worker_id (
                        id,
                        name,
                        phone_number
                    )
                `)
                .eq('id', saleId)
                .single();
                
            if (error) {
                console.error(`Error fetching sale ${saleId}:`, error);
                continue;
            }
            
            salesData.push(sale);
        }

        console.log('Complete sales data:', JSON.stringify(salesData, null, 2));
        
        if (salesData.length === 0) {
            salesTable.innerHTML = '<tr><td colspan="9" class="text-center">Error loading sales data</td></tr>';
            return;
        }

        displaySales(salesData);
        updatePagination();
    } catch (error) {
        console.error('Error loading sales:', error);
        salesTable.innerHTML = '<tr><td colspan="9" class="text-center">Error loading sales: ' + error.message + '</td></tr>';
    }
}

// Apply filters to query
function applyFilters(query) {
    // Date range filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateRange.value) {
        case 'today':
            query = query.gte('sale_date', today.toISOString());
            break;
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            query = query.gte('sale_date', yesterday.toISOString())
                        .lt('sale_date', today.toISOString());
            break;
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            query = query.gte('sale_date', weekAgo.toISOString());
            break;
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            query = query.gte('sale_date', monthAgo.toISOString());
            break;
    }

    // Customer filter
    if (customerFilter.value) {
        query = query.eq('customer_id', customerFilter.value);
    }

    // Worker filter
    if (workerFilter.value) {
        query = query.eq('worker_id', workerFilter.value);
    }

    // Minimum amount filter
    if (minAmount.value) {
        query = query.gte('total_amount', minAmount.value);
    }

    return query;
}

// Display sales in table
function displaySales(sales) {
    try {
        console.log('Displaying sales:', JSON.stringify(sales, null, 2));
        salesTable.innerHTML = sales.map(sale => {
            // Handle null/undefined numeric values
            const totalAmount = parseFloat(sale.total_amount) || 0;
            const amountPaid = parseFloat(sale.amount_paid) || 0;
            const remaining = totalAmount - amountPaid;

            // Format dates
            const saleDate = sale.sale_date ? new Date(sale.sale_date).toLocaleDateString('en-PK') : 'N/A';
            const nextVisitDate = sale.next_visit_date ? new Date(sale.next_visit_date).toLocaleDateString('en-PK') : 'N/A';

            // Get customer and worker names
            const customerName = sale.customer?.name || 'Unknown Customer';
            const workerName = sale.worker?.name || 'Unknown Worker';

            console.log('Processing sale:', {
                id: sale.id,
                invoice: sale.invoice_number,
                customer: sale.customer,
                worker: sale.worker,
                total: totalAmount,
                raw: sale
            });

            return `
                <tr>
                    <td>${sale.invoice_number || 'N/A'}</td>
                    <td>${saleDate}</td>
                    <td>${customerName}</td>
                    <td>${workerName}</td>
                    <td>${totalAmount.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}</td>
                    <td>${amountPaid.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}</td>
                    <td>${remaining.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}</td>
                    <td>${nextVisitDate}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewSaleDetails(${sale.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error in displaySales:', error);
        salesTable.innerHTML = '<tr><td colspan="9" class="text-center">Error displaying sales: ' + error.message + '</td></tr>';
    }
}

// Update pagination
function updatePagination() {
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>
        </li>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }

    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
        </li>
    `;

    pagination.innerHTML = paginationHTML;
}

// Change page
window.changePage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadSales();
};

// View sale details
window.viewSaleDetails = async function(saleId) {
    try {
        const { data: sale, error } = await supabase
            .from('sales')
            .select(`
                *,
                customer:customers!customer_id (
                    id,
                    name,
                    phone_number
                ),
                worker:workers!worker_id (
                    id,
                    name,
                    phone_number
                ),
                sale_items (
                    quantity,
                    unit_price,
                    total_price,
                    item:items!item_id (
                        name
                    ),
                    warehouse:warehouses!warehouse_id (
                        name
                    )
                )
            `)
            .eq('id', saleId)
            .single();

        if (error) throw error;

        console.log('Sale details:', JSON.stringify(sale, null, 2));

        // Handle null/undefined numeric values
        const totalAmount = parseFloat(sale.total_amount) || 0;
        const amountPaid = parseFloat(sale.amount_paid) || 0;
        const remaining = totalAmount - amountPaid;

        saleDetails.innerHTML = `
            <div class="mb-3">
                <h6>Invoice: ${sale.invoice_number || 'N/A'}</h6>
                <p>Date: ${sale.sale_date ? new Date(sale.sale_date).toLocaleString() : 'N/A'}</p>
                <p>Customer: ${sale.customer?.name || 'Unknown Customer'}</p>
                <p>Worker: ${sale.worker?.name || 'Unknown Worker'}</p>
            </div>
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
                        ${(sale.sale_items || []).map(item => {
                            // Handle null/undefined numeric values for items
                            const quantity = parseInt(item.quantity) || 0;
                            const unitPrice = parseFloat(item.unit_price) || 0;
                            const totalPrice = parseFloat(item.total_price) || 0;

                            return `
                                <tr>
                                    <td>${item.item?.name || 'Unknown Item'}</td>
                                    <td>${item.warehouse?.name || 'Unknown Warehouse'}</td>
                                    <td>${quantity}</td>
                                    <td>${unitPrice.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}</td>
                                    <td>${totalPrice.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colspan="4" class="text-end">Total Amount:</th>
                            <th>${totalAmount.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}</th>
                        </tr>
                        <tr>
                            <th colspan="4" class="text-end">Paid Amount:</th>
                            <th>${amountPaid.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}</th>
                        </tr>
                        <tr>
                            <th colspan="4" class="text-end">Remaining:</th>
                            <th>${remaining.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}</th>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        saleDetailsModal.show();
    } catch (error) {
        console.error('Error loading sale details:', error);
        alert('Error loading sale details: ' + error.message);
    }
};

// Check admin access
function checkAdminAccess() {
    const adminCode = localStorage.getItem('adminCode');
    if (adminCode !== '0098') {
        window.location.href = '../index.html';
    }
}

// Event listeners
dateRange.addEventListener('change', () => {
    currentPage = 1;
    loadSales();
});

customerFilter.addEventListener('change', () => {
    currentPage = 1;
    loadSales();
});

workerFilter.addEventListener('change', () => {
    currentPage = 1;
    loadSales();
});

minAmount.addEventListener('input', () => {
    currentPage = 1;
    loadSales();
});

// Initialize the page
initializeSalesPage(); 