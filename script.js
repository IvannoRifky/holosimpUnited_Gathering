document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const reviewSection = document.getElementById('reviewForm');
    const confirmationSection = document.getElementById('confirmationMessage');
    const submitBtn = document.getElementById('submitBtn');
    const editBtn = document.getElementById('editBtn');
    const confirmBtn = document.getElementById('confirmBtn');
    const newRegistrationBtn = document.getElementById('newRegistrationBtn');

    const nameField = document.getElementById('name');
    const phoneField = document.getElementById('phone');
    const locationField = document.getElementById('location');
    const dayField = document.getElementById('attendance-day');
    const memberStatusField = document.getElementById('member-status');
    const newsletterField = document.getElementById('newsletter');

    const nameError = document.getElementById('name-error');
    const phoneError = document.getElementById('phone-error');
    const locationError = document.getElementById('location-error');
    const dayError = document.getElementById('day-error');
    const statusError = document.getElementById('status-error');

    const STORAGE_KEY = 'holosimp_comifuro_attendees';
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzgQ25xGC4etkEiNdL-B-frUj_AS6KqswZSrbgrd0kKoFk7L-dD7VgOKgSxKq8Nq8gQmQ/exec'; 
    const progressSteps = document.querySelectorAll('.progress-step');

    // Event listeners
    submitBtn.addEventListener('click', handleSubmit);
    editBtn.addEventListener('click', backToForm);
    confirmBtn.addEventListener('click', finalizeSubmission);
    newRegistrationBtn.addEventListener('click', resetForm);

    // Validasi input fields
    nameField.addEventListener('input', () => validateField(nameField, nameError));
    phoneField.addEventListener('input', () => validateField(phoneField, phoneError));
    locationField.addEventListener('input', () => validateField(locationField, locationError));
    dayField.addEventListener('change', () => validateField(dayField, dayError));
    memberStatusField.addEventListener('change', () => validateField(memberStatusField, statusError));

    // Validasi format nomor WhatsApp
    phoneField.addEventListener('input', function() {
        let value = this.value.replace(/\D/g, '');
        
        // Pastikan nomor dimulai dengan 0 atau 62
        if (value.length > 0) {
            if (value.startsWith('62')) {
                // Nomor sudah dimulai dengan 62, tidak perlu diubah
            } else if (value.startsWith('0')) {
                // Ubah awalan 0 menjadi 62
                value = '62' + value.substring(1);
            } else {
                // Tambahkan 62 di awal nomor
                value = '62' + value;
            }
        }
        
        this.value = value;
    });

    // Inisialisasi form dan coba sinkronisasi data lokal
    initForm();
    syncLocalData();
    
    // Coba sinkronisasi setiap 5 menit
    setInterval(syncLocalData, 5 * 60 * 1000);

    function initForm() {
        resetForm(false);
        updateProgressStep(0);
    }

    function handleSubmit() {
        resetErrors();

        if (!validateForm()) {
            showToast('Silakan isi semua kolom yang wajib diisi', 'error');
            return;
        }

        showLoading(true);

        // Data formulir
        const formData = {
            name: nameField.value.trim(),
            phone: phoneField.value.trim(),
            location: locationField.value.trim(),
            day: dayField.value,
            memberStatus: memberStatusField.value,
            newsletter: newsletterField.checked,
            timestamp: new Date().toISOString()
        };

        // Tampilkan halaman review
        setTimeout(() => {
            showReview(formData);
            showLoading(false);
            updateProgressStep(1);
        }, 500);
    }

    // Fungsi untuk menampilkan halaman review
    function showReview(data) {
        const reviewDetails = document.getElementById('reviewDetails');
        
        reviewDetails.innerHTML = `
            <div class="review-item">
                <div class="review-label">Username WhatsApp:</div>
                <div class="review-value">${data.name}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Nomor WhatsApp:</div>
                <div class="review-value">${data.phone}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Domisili:</div>
                <div class="review-value">${data.location}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Hari Kehadiran:</div>
                <div class="review-value">${data.day}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Status Keanggotaan:</div>
                <div class="review-value">${data.memberStatus}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Beritahu event mendatang:</div>
                <div class="review-value">${data.newsletter ? 'Ya' : 'Tidak'}</div>
            </div>
        `;

        // Simpan data sementara di sessionStorage
        sessionStorage.setItem('temp_registration_data', JSON.stringify(data));
        
        form.classList.add('hidden');
        reviewSection.classList.remove('hidden');
        confirmationSection.classList.add('hidden');
    }

    // Fungsi untuk kembali ke formulir untuk diedit
    function backToForm() {
        form.classList.remove('hidden');
        reviewSection.classList.add('hidden');
        updateProgressStep(0);
    }

    // Fungsi untuk menyelesaikan pendaftaran setelah review
    function finalizeSubmission() {
        showLoading(true, confirmBtn);
        
        // Ambil data yang disimpan
        const formData = JSON.parse(sessionStorage.getItem('temp_registration_data'));
        
        console.log('Mengirim data ke Google Script:', formData);
        console.log('URL tujuan:', GOOGLE_SCRIPT_URL);
        
        // Kirim data ke Google Spreadsheet - UPDATED TO USE NO-CORS MODE
        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
            mode: 'no-cors', // Changed to no-cors mode
        })
        .then(response => {
            console.log('Status response:', response.status);
            // Note: With no-cors mode, we can't access the response content
            // So let's assume success and save the data locally
            
            // Tandai data sebagai partially synced (attempted)
            formData.synced = true; // optimistically assume it worked
            saveAttendance(formData);
            showConfirmation(formData);
            showLoading(false, confirmBtn);
            updateProgressStep(2);
            showToast('Pendaftaran berhasil! (Mode no-cors)', 'success');
        })
        .catch(error => {
            console.error('Error detail:', error);
            
            // Jika gagal, tetap simpan di localStorage tanpa tanda sinkronisasi
            formData.synced = false;
            saveAttendance(formData);
            showConfirmation(formData);
            showLoading(false, confirmBtn);
            updateProgressStep(2);
            showToast('Pendaftaran tersimpan secara lokal. Error: ' + error.message, 'info');
        });
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

        if (!validateField(phoneField, phoneError)) {
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
        const fields = [nameField, phoneField, locationField, dayField, memberStatusField];
        const errors = [nameError, phoneError, locationError, dayError, statusError];

        fields.forEach((field, index) => {
            field.parentElement.classList.remove('error', 'success');
            errors[index].style.display = 'none';
        });
    }

    function showLoading(isLoading, button = submitBtn) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<span class="loader"></span> Memproses...';
        } else {
            button.disabled = false;
            
            if (button === submitBtn) {
                button.innerHTML = '<span class="btn-text">Periksa Informasi</span><svg class="btn-icon" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>';
            } else if (button === confirmBtn) {
                button.innerHTML = '<span class="btn-text">Konfirmasi & Daftar</span><svg class="btn-icon" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>';
            }
        }
    }

    function showConfirmation(data) {
        const confirmationDetails = document.getElementById('confirmationDetails');
        
        // Pesan personal berdasarkan status keanggotaan
        let statusMsg = '';
        if (data.memberStatus === 'New Member') {
            statusMsg = "Selamat datang di Holosimp United! Kami senang Anda bergabung bersama kami.";
        } else {
            statusMsg = "Terima kasih telah terdaftar untuk Comifuro XX! Kami menantikan kehadiran Anda.";
        }
        
        confirmationDetails.innerHTML = `
            <p><strong>Username WhatsApp:</strong> ${data.name}</p>
            <p><strong>Nomor WhatsApp:</strong> ${data.phone}</p>
            <p><strong>Domisili:</strong> ${data.location}</p>
            <p><strong>Hari Kehadiran:</strong> ${data.day}</p>
            <p>${statusMsg}</p>
        `;
        
        form.classList.add('hidden');
        reviewSection.classList.add('hidden');
        confirmationSection.classList.remove('hidden');
    }

    function resetForm(showToastMessage = true) {
        nameField.value = '';
        phoneField.value = '';
        locationField.value = '';
        dayField.value = '';
        memberStatusField.value = '';
        newsletterField.checked = false;
        
        resetErrors();
        
        form.classList.remove('hidden');
        reviewSection.classList.add('hidden');
        confirmationSection.classList.add('hidden');
        
        updateProgressStep(0);
        
        if (showToastMessage) {
            showToast('Formulir telah direset', 'info');
        }
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

    function saveAttendance(data) {
        let attendees = [];
        
        // Coba ambil data lama jika ada
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                attendees = JSON.parse(savedData);
            } catch (e) {
                console.error('Error parsing stored data:', e);
                attendees = [];
            }
        }
        
        // Tambahkan data baru
        attendees.push(data);
        
        // Simpan kembali ke localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(attendees));
    }

    function syncLocalData() {
        // Periksa apakah ada data lokal
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (!savedData) return;
        
        try {
            const attendees = JSON.parse(savedData);
            if (!attendees.length) return;
            
            // Cek apakah ada data yang belum tersinkronisasi
            const unsyncedAttendees = attendees.filter(data => !data.synced);
            if (!unsyncedAttendees.length) return;
            
            console.log('Data yang akan disinkronkan:', unsyncedAttendees);
            showToast('Menyinkronkan data lokal...', 'info');
            
            // Kirim satu per satu untuk debugging
            unsyncedAttendees.forEach((data, index) => {
                console.log(`Mencoba sinkronisasi data ke-${index+1}:`, data);
                
                fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                    mode: 'no-cors', // Changed to no-cors mode
                })
                .then(response => {
                    console.log(`Response status untuk data ke-${index+1}:`, response.status);
                    
                    // With no-cors mode, we can't access the response
                    // so let's assume success
                    attendees[attendees.findIndex(a => 
                        a.name === unsyncedAttendees[index].name && 
                        a.phone === unsyncedAttendees[index].phone && 
                        a.timestamp === unsyncedAttendees[index].timestamp
                    )].synced = true;
                    
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(attendees));
                    showToast(`Berhasil menyinkronkan data ke-${index+1}`, 'success');
                })
                .catch(error => {
                    console.error(`Error sinkronisasi data ke-${index+1}:`, error);
                    showToast(`Gagal menyinkronkan: ${error.message}`, 'error');
                });
            });
        } catch (e) {
            console.error('Error saat parsing data lokal:', e);
            showToast('Error: ' + e.message, 'error');
        }
    }

    // Basic test connection function
    function testGoogleScriptConnection() {
        console.log('Testing connection to Google Script URL...');
        
        fetch(GOOGLE_SCRIPT_URL, {
            method: 'GET',
            mode: 'no-cors', // Using no-cors mode
        })
        .then(response => {
            console.log('Connection test response status:', response.status);
            console.log('Connection to Google Script appears to be working in no-cors mode');
        })
        .catch(error => {
            console.error('Connection test error:', error);
        });
    }
    
    // Run connection test
    testGoogleScriptConnection();
});