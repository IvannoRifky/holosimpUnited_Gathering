document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const confirmationSection = document.getElementById('confirmationMessage');
    const submitBtn = document.getElementById('submitBtn');
    const newRegistrationBtn = document.getElementById('newRegistrationBtn');

    const nameField = document.getElementById('name');
    const locationField = document.getElementById('location');
    const dayField = document.getElementById('attendance-day');
    const memberStatusField = document.getElementById('member-status');
    const newsletterField = document.getElementById('newsletter');

    const nameError = document.getElementById('name-error');
    const locationError = document.getElementById('location-error');
    const dayError = document.getElementById('day-error');
    const statusError = document.getElementById('status-error');

    const STORAGE_KEY = 'holosimp_comifuro_attendees';

    const progressSteps = document.querySelectorAll('.progress-step');

    submitBtn.addEventListener('click', handleSubmit);
    newRegistrationBtn.addEventListener('click', resetForm);

    nameField.addEventListener('input', () => validateField(nameField, nameError));
    locationField.addEventListener('input', () => validateField(locationField, locationError));
    dayField.addEventListener('change', () => validateField(dayField, dayError));
    memberStatusField.addEventListener('change', () => validateField(memberStatusField, statusError));

    initForm();

    function initForm() {
        resetForm(false);
        updateProgressStep(0);
    }

    function handleSubmit() {
        resetErrors();

        if (!validateForm()) {
            showToast('Please fill all required fields', 'error');
            return;
        }

        showLoading(true);

        // Simplified data object
        const formData = {
            name: nameField.value.trim(),
            location: locationField.value.trim(),
            day: dayField.value,
            memberStatus: memberStatusField.value,
            newsletter: newsletterField.checked,
            timestamp: new Date().toISOString()
        };

        // Faster processing (500ms instead of 1500ms)
        setTimeout(() => {
            saveAttendance(formData);
            updateProgressStep(1);
            showConfirmation(formData);
            showLoading(false);
            showToast('Attendance confirmed!', 'success');
        }, 500);
    }

    function validateField(field, errorElement) {
        if (field.value.trim() === '') {
            field.parentElement.classList.add('error');
            errorElement.style.display = 'block';
            return false;
        } else {
            field.parentElement.classList.remove('error');
            field.parentElement.classList.add('success');
            errorElement.style.display = 'none';
            return true;
        }
    }

    function validateForm() {
        let isValid = true;

        if (!validateField(nameField, nameError)) {
            isValid = false;
        }

        if (!validateField(locationField, locationError)) {
            isValid = false;
        }

        if (!validateField(dayField, dayError)) {
            isValid = false;
        }
        
        if (!validateField(memberStatusField, statusError)) {
            isValid = false;
        }

        return isValid;
    }

    function resetErrors() {
        const fields = [nameField, locationField, dayField, memberStatusField];
        const errors = [nameError, locationError, dayError, statusError];

        fields.forEach((field, index) => {
            field.parentElement.classList.remove('error', 'success');
            errors[index].style.display = 'none';
        });
    }

    function showLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loader"></span> Processing...';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Confirm Attendance</span><svg class="btn-icon" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>';
        }
    }

    function showConfirmation(data) {
        const confirmationDetails = document.getElementById('confirmationDetails');
        
        // Personalized message based on membership status
        let statusMsg = '';
        if (data.memberStatus === 'New Member') {
            statusMsg = "Welcome to Holosimp United! We're excited to have you join us.";
        } else {
            statusMsg = "Thanks for confirming your attendance!";
        }
        
        confirmationDetails.innerHTML = `
            <strong>${data.name}</strong>, ${statusMsg}<br>
            We've recorded your attendance for <strong>${data.day}</strong>.<br>
            Make sure to join our WhatsApp group for updates!
        `;

        form.classList.add('hidden');
        confirmationSection.classList.remove('hidden');

        updateProgressStep(2);
    }
    
    function resetForm(showToast = true) {
        nameField.value = '';
        locationField.value = '';
        dayField.value = '';
        memberStatusField.value = '';
        newsletterField.checked = false;
        
        resetErrors();

        confirmationSection.classList.add('hidden');
        form.classList.remove('hidden');

        updateProgressStep(0);

        if (showToast) {
            showToast('Form reset for new registration', 'info');
        }
    }

    function saveAttendance(data) {
        let attendees = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        attendees.push(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(attendees));
        console.log('Attendance saved:', data);
        sendToBackend(data);
    }

    function sendToBackend(data) {
        // This would be where you send data to your server/spreadsheet
        console.log('Data ready to send:', {
            'Full Name': data.name,
            'Location': data.location,
            'Attendance Day': data.day,
            'Membership Status': data.memberStatus,
            'Newsletter': data.newsletter ? 'Yes' : 'No',
            'Registration Date': new Date(data.timestamp).toLocaleString()
        });
        
        // You could add actual AJAX request here if needed
    }

    function updateProgressStep(stepIndex) {
        progressSteps.forEach((step, index) => {
            if (index <= stepIndex) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    function showToast(message, type = 'info') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let iconPath = '';
        switch (type) {
            case 'success':
                iconPath = '<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>';
                break;
            case 'error':
                iconPath = '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>';
                break;
            default:
                iconPath = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>';
        }

        toast.innerHTML = `
        <svg class="toast-icon" viewBox="0 0 24 24">${iconPath}</svg>
        <span class="toast-message">${message}</span>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in-out forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
});