import { supabase } from '../../js/config.js';

// DOM Elements
const expensesTableBody = document.getElementById('expensesTableBody');
const categoriesTableBody = document.getElementById('categoriesTableBody');
const addExpenseForm = document.getElementById('addExpenseForm');
const addCategoryForm = document.getElementById('addCategoryForm');

// Load data when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadExpenses();
    loadCategories();
    loadWorkers();
});

// Load expenses
async function loadExpenses() {
    try {
        const { data: expenses, error } = await supabase
            .from('expenses')
            .select(`
                *,
                expense_categories(name),
                workers(name)
            `)
            .order('payment_date', { ascending: false });

        if (error) throw error;

        expensesTableBody.innerHTML = expenses.map(expense => `
            <tr>
                <td>${expense.expense_number}</td>
                <td>${expense.expense_categories.name}</td>
                <td>${expense.workers ? expense.workers.name : 'N/A'}</td>
                <td>${expense.amount}</td>
                <td>${new Date(expense.payment_date).toLocaleDateString()}</td>
                <td>${expense.payment_method}</td>
                <td>${expense.description || ''}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewExpense('${expense.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteExpense('${expense.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading expenses:', error);
        alert('Error loading expenses. Please try again.');
    }
}

// Load categories
async function loadCategories() {
    try {
        const { data: categories, error } = await supabase
            .from('expense_categories')
            .select('*')
            .order('name');

        if (error) throw error;

        // Update categories table
        categoriesTableBody.innerHTML = categories.map(category => `
            <tr>
                <td>${category.name}</td>
                <td>${category.description || ''}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="editCategory('${category.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCategory('${category.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Update category select in expense form
        const categorySelect = addExpenseForm.querySelector('[name="category_id"]');
        categorySelect.innerHTML = categories.map(category => 
            `<option value="${category.id}">${category.name}</option>`
        ).join('');
    } catch (error) {
        console.error('Error loading categories:', error);
        alert('Error loading categories. Please try again.');
    }
}

// Load workers
async function loadWorkers() {
    try {
        const { data: workers, error } = await supabase
            .from('workers')
            .select('*')
            .order('name');

        if (error) throw error;

        const workerSelect = addExpenseForm.querySelector('[name="worker_id"]');
        workerSelect.innerHTML = '<option value="">Select Worker (Optional)</option>' +
            workers.map(worker => `<option value="${worker.id}">${worker.name}</option>`).join('');
    } catch (error) {
        console.error('Error loading workers:', error);
        alert('Error loading workers. Please try again.');
    }
}

// Show add expense modal
window.showAddExpenseModal = function() {
    addExpenseForm.reset();
    const modal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
    modal.show();
};

// Show add category modal
window.showAddCategoryModal = function() {
    addCategoryForm.reset();
    const modal = new bootstrap.Modal(document.getElementById('addCategoryModal'));
    modal.show();
};

// Save expense
window.saveExpense = async function() {
    try {
        const formData = new FormData(addExpenseForm);
        const expenseData = {
            category_id: formData.get('category_id'),
            worker_id: formData.get('worker_id') || null,
            amount: parseFloat(formData.get('amount')),
            payment_date: formData.get('payment_date'),
            payment_method: formData.get('payment_method'),
            description: formData.get('description')
        };

        // Generate expense number
        const date = new Date();
        const { data: count, error: countError } = await supabase
            .from('expenses')
            .select('id', { count: 'exact' });
        
        if (countError) throw countError;
        
        expenseData.expense_number = `EXP-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${(count + 1).toString().padStart(4, '0')}`;

        const { error } = await supabase
            .from('expenses')
            .insert([expenseData]);

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('addExpenseModal')).hide();
        loadExpenses();
        alert('Expense saved successfully!');
    } catch (error) {
        console.error('Error saving expense:', error);
        alert('Error saving expense. Please try again.');
    }
};

// Save category
window.saveCategory = async function() {
    try {
        const formData = new FormData(addCategoryForm);
        const categoryData = {
            name: formData.get('name'),
            description: formData.get('description')
        };

        const { error } = await supabase
            .from('expense_categories')
            .insert([categoryData]);

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('addCategoryModal')).hide();
        loadCategories();
        alert('Category saved successfully!');
    } catch (error) {
        console.error('Error saving category:', error);
        alert('Error saving category. Please try again.');
    }
};

// Delete expense
window.deleteExpense = async function(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) throw error;

        loadExpenses();
        alert('Expense deleted successfully!');
    } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error deleting expense. Please try again.');
    }
};

// Delete category
window.deleteCategory = async function(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
        const { error } = await supabase
            .from('expense_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;

        loadCategories();
        alert('Category deleted successfully!');
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category. Please try again.');
    }
};

// View expense details
window.viewExpense = async function(id) {
    try {
        const { data: expense, error } = await supabase
            .from('expenses')
            .select(`
                *,
                expense_categories(name),
                workers(name)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Populate the view modal
        document.getElementById('viewExpenseNumber').textContent = expense.expense_number;
        document.getElementById('viewExpenseCategory').textContent = expense.expense_categories.name;
        document.getElementById('viewExpenseWorker').textContent = expense.workers ? expense.workers.name : 'N/A';
        document.getElementById('viewExpenseAmount').textContent = expense.amount;
        document.getElementById('viewExpenseDate').textContent = new Date(expense.payment_date).toLocaleDateString();
        document.getElementById('viewExpenseMethod').textContent = expense.payment_method;
        document.getElementById('viewExpenseDescription').textContent = expense.description || 'N/A';

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('viewExpenseModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading expense details:', error);
        alert('Error loading expense details. Please try again.');
    }
};

// Edit category
window.editCategory = async function(id) {
    try {
        const { data: category, error } = await supabase
            .from('expense_categories')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Populate the edit form
        const form = document.getElementById('editCategoryForm');
        form.category_id.value = category.id;
        form.name.value = category.name;
        form.description.value = category.description || '';

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('editCategoryModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading category for edit:', error);
        alert('Error loading category details. Please try again.');
    }
};

// Update category
window.updateCategory = async function() {
    try {
        const form = document.getElementById('editCategoryForm');
        const formData = new FormData(form);
        const categoryData = {
            name: formData.get('name'),
            description: formData.get('description')
        };

        const { error } = await supabase
            .from('expense_categories')
            .update(categoryData)
            .eq('id', formData.get('category_id'));

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('editCategoryModal')).hide();
        loadCategories();
        alert('Category updated successfully!');
    } catch (error) {
        console.error('Error updating category:', error);
        alert('Error updating category. Please try again.');
    }
}; 