document.addEventListener('DOMContentLoaded', function() {
    // Initialize elements
    const vmTableBody = document.querySelector('table tbody');
    const statsCards = document.querySelectorAll('.card h5');
    const refreshBtn = document.querySelector('.btn-outline-primary');
    const createVmBtn = document.querySelector('.btn-primary');
    const createVmForm = document.getElementById('createVmForm');
    const createVmModal = new bootstrap.Modal(document.getElementById('createVmModal'));
    const filterDropdown = document.querySelector('.dropdown-menu');
    const pagination = document.querySelector('.pagination');
    const profileImage = document.querySelector('.user-profile img');
    const profileUpload = document.createElement('input');
    const settingsLink = document.getElementById('settingsLink');
const passwordResetModal = new bootstrap.Modal(document.getElementById('passwordResetModal'));
const passwordResetForm = document.getElementById('passwordResetForm');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');




    // Current states
    let currentFilter = 'all';
    let currentPage = 1;
    let totalPages = 1;
    const itemsPerPage = 5;



const logoutLink = document.querySelector('.logout-link');
if (logoutLink) {
    logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        fetch('/logout', {
            method: 'GET',
            credentials: 'same-origin'
        }).then(response => {
            if (response.redirected) {
                window.location.href = response.url;
            }
        });
    });
}



    // Load initial data
    fetchVMs();

    // Setup event listeners
    refreshBtn.addEventListener('click', () => {
        currentPage = 1;
        fetchVMs();
    });

    createVmBtn.addEventListener('click', () => createVmModal.show());
    createVmForm.addEventListener('submit', handleCreateVM);

    // Filter dropdown items
    filterDropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            currentFilter = e.target.dataset.filter || 'all';
            currentPage = 1;
            fetchVMs();
            // Update active state in dropdown
            filterDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Pagination event delegation
    pagination.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.closest('.page-item');
        if (!target || target.classList.contains('disabled')) return;

        const action = target.querySelector('.page-link').textContent.toLowerCase();
        if (action === 'previous' && currentPage > 1) {
            currentPage--;
        } else if (action === 'next' && currentPage < totalPages) {
            currentPage++;
        } else if (!isNaN(parseInt(action))) {
            currentPage = parseInt(action);
        }

        fetchVMs();
    });

    // Periodically refresh data every 30 seconds
    setInterval(fetchVMs, 30000);


    settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    passwordResetModal.show();
});

// Password strength indicator
newPasswordInput.addEventListener('input', function() {
    const strengthBar = document.createElement('div');
    strengthBar.className = 'password-strength-bar';
    const strengthContainer = document.querySelector('.password-strength') ||
        document.createElement('div');

    if (!document.querySelector('.password-strength')) {
        strengthContainer.className = 'password-strength';
        this.parentNode.appendChild(strengthContainer);
    }

    strengthContainer.innerHTML = '';
    strengthContainer.appendChild(strengthBar);

    const strength = calculatePasswordStrength(this.value);
    strengthBar.style.width = `${strength.score * 25}%`;
    strengthBar.style.backgroundColor = getStrengthColor(strength.score);
});

    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Real-time password confirmation check
    confirmPasswordInput.addEventListener('input', function() {
        const newPassword = newPasswordInput.value;
        const confirmPassword = this.value;

        if (newPassword && confirmPassword && newPassword !== confirmPassword) {
            this.classList.add('is-invalid');
        } else {
            this.classList.remove('is-invalid');
        }
    });

    // Password reset form handler
    passwordResetForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            confirmPasswordInput.classList.add('is-invalid');
            showAlert('New passwords do not match', 'danger');
            return;
        }

        // Validate password strength
        if (newPassword.length < 8) {
            showAlert('Password must be at least 8 characters', 'danger');
            return;
        }

        try {
            // Disable button and show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Changing...';

            // Here you would typically make an API call to your backend
            // For now, we'll simulate a successful change
            await new Promise(resolve => setTimeout(resolve, 1000));

            showAlert('Password changed successfully!', 'success');
            passwordResetModal.hide();
            passwordResetForm.reset();

            // Reset validation states
            confirmPasswordInput.classList.remove('is-invalid');
        } catch (error) {
            console.error('Error changing password:', error);
            showAlert('Failed to change password: ' + error.message, 'danger');
        } finally {
            const submitBtn = passwordResetForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Change Password';
            }
        }
    });


    // Add this to your event listeners
document.querySelector('.logout-link').addEventListener('click', function(e) {
    e.preventDefault();
    fetch('/logout', {
        method: 'GET',
        credentials: 'same-origin'
    }).then(response => {
        if (response.redirected) {
            window.location.href = response.url;
        }
    });
});

});

// In your fetchVMs function, update the response handling:

// Add this helper function at the top of your dash.js
function getFriendlyOSName(osType) {
    if (!osType) return 'Unknown';

    const osMap = {
        'ubuntu': 'Ubuntu',
        'debian': 'Debian',
        'windows': 'Windows',
        'redhat': 'Red Hat',
        'fedora': 'Fedora',
        'centos': 'CentOS',
        'kali': 'Kali Linux'
    };

    const lowerType = osType.toLowerCase();
    for (const [key, value] of Object.entries(osMap)) {
        if (lowerType.includes(key)) {
            return value;
        }
    }

    return osType.split('_')[0] || 'Unknown';
}


async function fetchVMs() {
    showLoading(true);
    try {
        const response = await fetch('/api/vms');
        const data = await response.json();

        if (data.status !== 'success') {
            throw new Error(data.message || 'Failed to fetch VMs');
        }

        // Update stats cards
        updateStats(data.stats || {
            total: 0,
            running: 0,
            stopped: 0,
            total_ram: 0
        });

        // Render the VM table
        renderVMs(data.vms || []);

        showLoading(false);
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'danger');
        showLoading(false);
    }
}

function updateStats(stats) {
    document.getElementById('totalVms').textContent = stats.total || 0;
    document.getElementById('runningVms').textContent = stats.running || 0;
    document.getElementById('stoppedVms').textContent = stats.stopped || 0;
    document.getElementById('totalRam').textContent = (stats.total_ram || 0) + ' GB';
}


function setupVMActionListeners() {
    // Start buttons
    document.querySelectorAll('.start-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleVMAction(btn.dataset.id, 'start');
        });
    });

    // Stop buttons
    document.querySelectorAll('.stop-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleVMAction(btn.dataset.id, 'stop');
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleVMAction(btn.dataset.id, 'delete');
        });
    });

    // Restart buttons
    document.querySelectorAll('.restart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleVMAction(btn.dataset.id, 'restart');
        });
    });
}

// Call this after rendering VMs
function renderVMs(vms) {
    const tbody = document.querySelector('table tbody');
    tbody.innerHTML = '';

    if (vms.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="8" class="text-center py-4 text-muted">
                <i class="fas fa-server fa-2x mb-2"></i>
                <p>No virtual machines found</p>
            </td>
        `;
        tbody.appendChild(row);
        return;
    }

    vms.forEach(vm => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${vm.name}</strong>
                <div class="text-muted small">${vm.id}</div>
            </td>
            <td>
                <span class="badge bg-${vm.state === 'running' ? 'success' : 'danger'}">
                    ${vm.state === 'running' ? 'Running' : 'Stopped'}
                </span>
            </td>
            <td>${vm.ip || 'N/A'}</td>
            <td>${getFriendlyOSName(vm.ostype)}</td>
            <td>${vm.cpu} vCPU</td>
            <td>${vm.ram} GB</td>
            <td>${vm.storage} GB</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    ${vm.state === 'running' ? 
                        `<button class="btn btn-outline-secondary stop-btn" data-id="${vm.id}" title="Stop">
                            <i class="fas fa-stop"></i>
                        </button>
                        <button class="btn btn-outline-secondary restart-btn" data-id="${vm.id}" title="Restart">
                            <i class="fas fa-redo"></i>
                        </button>` : 
                        `<button class="btn btn-outline-success start-btn" data-id="${vm.id}" title="Start">
                            <i class="fas fa-play"></i>
                        </button>`}
                    <button class="btn btn-outline-danger delete-btn" data-id="${vm.id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Setup event listeners for the new buttons
    setupVMActionListeners();
}

function updateStats(stats) {
    const statValues = [
        stats.total || 0,
        stats.running || 0,
        stats.stopped || 0,
        stats.total_ram ? stats.total_ram + ' GB' : '0 GB'
    ];

    document.querySelectorAll('.card h5').forEach((el, index) => {
        el.textContent = statValues[index];
    });
}

function updatePagination(totalItems) {
    const pagination = document.querySelector('.pagination');
    pagination.innerHTML = '';

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#">Previous</a>`;
    pagination.appendChild(prevLi);

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        pagination.appendChild(pageLi);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage >= totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#">Next</a>`;
    pagination.appendChild(nextLi);
}

async function handleCreateVM(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    // Get form data
    const formData = {
        name: form.elements['name'].value.trim(),
        os: form.elements['os'].value,
        cpu: parseInt(form.elements['cpu'].value),
        ram: parseInt(form.elements['ram'].value),
        storage: parseInt(form.elements['storage'].value),
        start_after_create: form.elements['startAfterCreate'].checked
    };

    // Validate input
    if (!formData.name) {
        showAlert('Please enter a VM name', 'warning');
        return;
    }

    try {
        // Disable button and show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';

        const response = await fetch('/api/vms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(text || 'Invalid server response');
        }

        const data = await response.json();

        if (!response.ok) {
            // Handle VirtualBox specific errors
            if (data.message && data.message.includes('VBoxManage.exe')) {
                const errorLines = data.message.split('\n');
                const errorMsg = errorLines.find(line => line.includes('error:')) || data.message;
                throw new Error(errorMsg.replace('VBoxManage.exe: error:', '').trim());
            }
            throw new Error(data.message || 'Failed to create VM');
        }

        // Close modal and reset form
        bootstrap.Modal.getInstance(document.getElementById('createVmModal')).hide();
        form.reset();
        showAlert('VM created successfully!', 'success');

        // Refresh VM list
        currentPage = 1;
        await fetchVMs();
    } catch (error) {
        console.error('Error creating VM:', error);
        showAlert('Failed to create VM: ' + (error.message || 'Unknown error'), 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create VM';
    }
}

async function handleVMAction(vmId, action) {
    if (action === 'delete') {
        if (!confirm(`Are you sure you want to delete this VM?\nThis action cannot be undone.`)) {
            return;
        }
    }

    // Find the button that was clicked
    const button = document.querySelector(`.${action}-btn[data-id="${vmId}"]`);
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    }

    try {
        // First get a CSRF token
        const csrfResponse = await fetch('/get-csrf-token');
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.csrf_token;

        const response = await fetch(`/api/vms/${vmId}/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            }
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(text || 'Invalid server response');
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `Failed to ${action} VM`);

        showAlert(`VM ${action} operation completed successfully`, 'success');
        await fetchVMs();
    } catch (error) {
        console.error(`Error ${action}ing VM:`, error);
        showAlert(error.message || `Failed to ${action} VM`, 'danger');
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = `<i class="fas fa-${action === 'start' ? 'play' : action === 'stop' ? 'stop' : 'trash'}"></i>`;
        }
    }
}

function showLoading(show) {
    const table = document.querySelector('table');
    const loadingOverlay = document.querySelector('.loading-overlay');

    if (!loadingOverlay) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        table.parentNode.insertBefore(overlay, table);
    }

    if (show) {
        document.querySelector('.loading-overlay').style.display = 'flex';
        table.style.opacity = '0.5';
    } else {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) overlay.style.display = 'none';
        table.style.opacity = '1';
    }
}

function showAlert(message, type) {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) existingAlert.remove();

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    const container = document.querySelector('.main-content');
    container.insertBefore(alert, container.firstChild);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alert);
        bsAlert.close();
    }, 5000);
}

function calculatePasswordStrength(password) {
    let score = 0;

    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Complexity checks
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    return { score: Math.min(score, 4) }; // Max score of 4
}

function getStrengthColor(score) {
    const colors = [
        '#dc3545', // Red (weak)
        '#fd7e14', // Orange (fair)
        '#ffc107', // Yellow (good)
        '#28a745'  // Green (strong)
    ];
    return colors[Math.min(score, 3)];
}