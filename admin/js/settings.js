import { supabase } from '../../js/config.js';

// Load settings when page loads
document.addEventListener('DOMContentLoaded', loadSettings);

// Load Settings
async function loadSettings() {
    try {
        const { data: settings, error } = await supabase
            .from('settings')
            .select('*')
            .limit(1)
            .single();

        if (error) throw error;

        if (settings) {
            const form = document.getElementById('settingsForm');
            form.company_name.value = settings.company_name || '';
            form.company_address.value = settings.company_address || '';
            form.company_phone.value = settings.company_phone || '';
            form.company_email.value = settings.company_email || '';
            form.company_website.value = settings.company_website || '';
            form.tax_number.value = settings.tax_number || '';
            form.currency.value = settings.currency || 'PKR';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        alert('Error loading settings. Please try again.');
    }
}

// Save Settings
window.saveSettings = async function() {
    try {
        const form = document.getElementById('settingsForm');
        const formData = new FormData(form);
        const data = {
            company_name: formData.get('company_name'),
            company_address: formData.get('company_address'),
            company_phone: formData.get('company_phone'),
            company_email: formData.get('company_email'),
            company_website: formData.get('company_website'),
            tax_number: formData.get('tax_number'),
            currency: formData.get('currency')
        };

        // Handle logo upload if selected
        const logoFile = formData.get('company_logo');
        if (logoFile && logoFile.size > 0) {
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('company-logos')
                .upload(fileName, logoFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('company-logos')
                .getPublicUrl(fileName);

            data.company_logo = publicUrl;
        }

        // Check if settings exist
        const { data: existingSettings, error: checkError } = await supabase
            .from('settings')
            .select('id')
            .limit(1)
            .single();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        let error;
        if (existingSettings) {
            // Update existing settings
            const { error: updateError } = await supabase
                .from('settings')
                .update(data)
                .eq('id', existingSettings.id);
            error = updateError;
        } else {
            // Insert new settings
            const { error: insertError } = await supabase
                .from('settings')
                .insert([data]);
            error = insertError;
        }

        if (error) throw error;

        alert('Settings saved successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings. Please try again.');
    }
}; 