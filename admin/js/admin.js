import { supabase } from '../../js/config.js';

// Check admin access
checkAdminAccess();

// DOM Elements
const todaySales = document.getElementById('todaySales');
const totalRevenue = document.getElementById('totalRevenue');
const totalCustomers = document.getElementById('totalCustomers');
const lowStockItems = document.getElementById('lowStockItems');

// Initialize dashboard
async function initializeDashboard() {
    await Promise.all([
        loadTodaySales(),
        loadTotalRevenue(),
        loadTotalCustomers(),
        loadLowStockItems()
    ]);
}

// Load today's sales count
async function loadTodaySales() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count, error } = await supabase
            .from('sales')
            .select('*', { count: 'exact' })
            .gte('sale_date', today.toISOString());

        if (error) throw error;
        todaySales.textContent = count || 0;
    } catch (error) {
        console.error('Error loading today\'s sales:', error);
        todaySales.textContent = 'Error';
    }
}

// Load total revenue
async function loadTotalRevenue() {
    try {
        const { data, error } = await supabase
            .from('sales')
            .select('total_amount');

        if (error) throw error;

        const total = data.reduce((sum, sale) => sum + sale.total_amount, 0);
        totalRevenue.textContent = total.toLocaleString('en-US', {
            style: 'currency',
            currency: 'PKR'
        });
    } catch (error) {
        console.error('Error loading total revenue:', error);
        totalRevenue.textContent = 'Error';
    }
}

// Load total customers
async function loadTotalCustomers() {
    try {
        const { count, error } = await supabase
            .from('customers')
            .select('*', { count: 'exact' });

        if (error) throw error;
        totalCustomers.textContent = count || 0;
    } catch (error) {
        console.error('Error loading total customers:', error);
        totalCustomers.textContent = 'Error';
    }
}

// Load low stock items
async function loadLowStockItems() {
    try {
        const { data: items, error } = await supabase
            .from('items')
            .select(`
                id,
                min_stock_level,
                inventory_stock (quantity)
            `);

        if (error) throw error;

        const lowStockCount = items.filter(item => {
            const totalStock = item.inventory_stock.reduce((sum, stock) => sum + stock.quantity, 0);
            return totalStock <= item.min_stock_level;
        }).length;

        lowStockItems.textContent = lowStockCount;
    } catch (error) {
        console.error('Error loading low stock items:', error);
        lowStockItems.textContent = 'Error';
    }
}

// Check admin access
function checkAdminAccess() {
    const adminCode = localStorage.getItem('adminCode');
    if (adminCode !== '0098') {
        window.location.href = '../index.html';
    }
}

// Initialize the dashboard
initializeDashboard(); 