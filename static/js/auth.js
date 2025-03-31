document.addEventListener('DOMContentLoaded', function() {
    // Show modal when Get Started button is clicked
    const getStartedBtn = document.querySelector('.btn-get-started');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showRegistrationForm();
            document.getElementById('auth-modal').classList.add('show');
        });
    }

    // Close modal when X button is clicked
    document.getElementById('close-auth').addEventListener('click', function() {
        document.getElementById('auth-modal').classList.remove('show');
    });

    // Close modal when clicking outside the content
    document.getElementById('auth-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('show');
        }
    });

    // Toggle between registration and login forms
    document.getElementById('login-link').addEventListener('click', function(e) {
        e.preventDefault();
        showLoginForm();
    });

    document.getElementById('register-link').addEventListener('click', function(e) {
        e.preventDefault();
        showRegistrationForm();
    });

    // Add password toggle functionality
    setupPasswordToggles();

    // Add real-time name validation
    setupNameValidation();

    // Add real-time email validation
    setupEmailValidation();

    // Add password match validation
    setupPasswordMatchValidation();

    // Form validation and submission
    const registrationForm = document.getElementById('registration-form');
    if (registrationForm) {
        registrationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            clearErrors();

            if (validateForm()) {
                submitRegistrationForm();
            }
        });
    }

    // Login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            clearErrors();

            if (validateLoginForm()) {
                submitLoginForm();
            }
        });
    }

    function showLoginForm() {
        document.getElementById('registration-section').style.display = 'none';
        document.getElementById('login-section').style.display = 'block';
    }

    function showRegistrationForm() {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('registration-section').style.display = 'block';
    }

    function setupPasswordToggles() {
        const passwordFields = [
            { input: 'password', toggle: 'toggle-password' },
            { input: 'confirm-password', toggle: 'toggle-confirm-password' },
            { input: 'login-password', toggle: 'toggle-login-password' }
        ];

        passwordFields.forEach(field => {
            const input = document.getElementById(field.input);
            if (!input) return;

            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.id = field.toggle;
            toggle.className = 'password-toggle';
            toggle.innerHTML = '<i class="far fa-eye"></i>';

            const container = input.parentNode;
            container.classList.add('password-input-container');
            container.appendChild(toggle);

            toggle.addEventListener('click', function() {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                this.innerHTML = type === 'password' ? '<i class="far fa-eye"></i>' : '<i class="far fa-eye-slash"></i>';
            });
        });
    }

    function setupNameValidation() {
        const nameInput = document.getElementById('fullname');
        if (!nameInput) return;

        const validIcon = document.createElement('i');
        validIcon.className = 'fas fa-check valid-icon validation-icon';
        const invalidIcon = document.createElement('i');
        invalidIcon.className = 'fas fa-times invalid-icon validation-icon';

        nameInput.parentNode.classList.add('password-input-container');
        nameInput.parentNode.appendChild(validIcon);
        nameInput.parentNode.appendChild(invalidIcon);

        nameInput.addEventListener('input', function() {
            const isValid = /^[a-zA-Z\s]+$/.test(this.value);

            if (this.value.length === 0) {
                validIcon.style.display = 'none';
                invalidIcon.style.display = 'none';
            } else if (isValid) {
                validIcon.style.display = 'block';
                invalidIcon.style.display = 'none';
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
            } else {
                validIcon.style.display = 'none';
                invalidIcon.style.display = 'block';
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            }
        });
    }

    function setupEmailValidation() {
        const emailInputs = ['email', 'login-email'];

        emailInputs.forEach(inputId => {
            const emailInput = document.getElementById(inputId);
            if (!emailInput) return;

            const validIcon = document.createElement('i');
            validIcon.className = 'fas fa-check valid-icon validation-icon';
            const invalidIcon = document.createElement('i');
            invalidIcon.className = 'fas fa-times invalid-icon validation-icon';

            emailInput.parentNode.classList.add('password-input-container');
            emailInput.parentNode.appendChild(validIcon);
            emailInput.parentNode.appendChild(invalidIcon);

            emailInput.addEventListener('input', function() {
                const isValid = /\S+@\S+\.\S+/.test(this.value);

                if (this.value.length === 0) {
                    validIcon.style.display = 'none';
                    invalidIcon.style.display = 'none';
                } else if (isValid) {
                    validIcon.style.display = 'block';
                    invalidIcon.style.display = 'none';
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                } else {
                    validIcon.style.display = 'none';
                    invalidIcon.style.display = 'block';
                    this.classList.add('is-invalid');
                    this.classList.remove('is-valid');
                }
            });
        });
    }

    function setupPasswordMatchValidation() {
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirm-password');
        if (!password || !confirmPassword) return;

        const validIcon = document.createElement('i');
        validIcon.className = 'fas fa-check valid-icon validation-icon';
        const invalidIcon = document.createElement('i');
        invalidIcon.className = 'fas fa-times invalid-icon validation-icon';

        confirmPassword.parentNode.classList.add('password-input-container');
        confirmPassword.parentNode.appendChild(validIcon);
        confirmPassword.parentNode.appendChild(invalidIcon);

        function checkMatch() {
            if (confirmPassword.value.length === 0) {
                validIcon.style.display = 'none';
                invalidIcon.style.display = 'none';
                return;
            }

            const isMatch = password.value === confirmPassword.value;

            if (isMatch) {
                validIcon.style.display = 'block';
                invalidIcon.style.display = 'none';
                confirmPassword.classList.remove('is-invalid');
                confirmPassword.classList.add('is-valid');
            } else {
                validIcon.style.display = 'none';
                invalidIcon.style.display = 'block';
                confirmPassword.classList.add('is-invalid');
                confirmPassword.classList.remove('is-valid');
            }
        }

        password.addEventListener('input', checkMatch);
        confirmPassword.addEventListener('input', checkMatch);
    }

    function validateForm() {
        let isValid = true;
        const fullname = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const reason = document.getElementById('reason').value;

        if (!fullname) {
            showError('fullname', 'Full name is required');
            isValid = false;
        } else if (!/^[a-zA-Z\s]+$/.test(fullname)) {
            showError('fullname', 'Name can only contain letters and spaces');
            isValid = false;
        }

        if (!email) {
            showError('email', 'Email is required');
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            showError('email', 'Please enter a valid email address');
            isValid = false;
        }

        if (!password) {
            showError('password', 'Password is required');
            isValid = false;
        } else if (password.length < 8) {
            showError('password', 'Password must be at least 8 characters');
            isValid = false;
        }

        if (password !== confirmPassword) {
            showError('confirm-password', 'Passwords do not match');
            isValid = false;
        }

        if (!reason) {
            showError('reason', 'Please explain your reason for using CloudVM');
            isValid = false;
        } else if (reason.length < 20) {
            showError('reason', 'Please provide more details (at least 20 characters)');
            isValid = false;
        }

        if (!document.getElementById('terms').checked) {
            showError('terms', 'You must agree to the Terms of Service');
            isValid = false;
        }

        return isValid;
    }

    function validateLoginForm() {
        let isValid = true;
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email) {
            showError('login-email', 'Email is required');
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            showError('login-email', 'Please enter a valid email address');
            isValid = false;
        }

        if (!password) {
            showError('login-password', 'Password is required');
            isValid = false;
        }

        return isValid;
    }

    function showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.classList.add('is-invalid');
        field.classList.remove('is-valid');

        let errorElement = document.getElementById(`${fieldId}-error`);
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = `${fieldId}-error`;
            errorElement.className = 'invalid-feedback';
            field.parentNode.insertBefore(errorElement, field.nextSibling);
        }

        errorElement.textContent = message;
    }

    function clearErrors() {
        const errorMessages = document.querySelectorAll('.invalid-feedback');
        errorMessages.forEach(el => el.remove());

        const invalidFields = document.querySelectorAll('.is-invalid');
        invalidFields.forEach(el => el.classList.remove('is-invalid'));
    }

function submitRegistrationForm() {
    const form = document.getElementById('registration-form');
    const formData = new FormData(form);

    fetch('/register', {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (response.redirected) {
            window.location.href = response.url;
        } else if (!response.ok) {
            return response.json().then(err => { throw err; });
        }
        return response.json();
    })
    .then(data => {
        alert('Registration submitted for admin approval!');
        document.getElementById('auth-modal').classList.remove('show');
    })
    .catch(error => {
        console.error('Error:', error);
        showError('registration-error', error.message || 'Registration failed');
    });
}

function submitLoginForm() {
    const form = document.getElementById('login-form');
    const formData = new FormData(form);
    clearErrors();

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing';
    submitBtn.disabled = true;

    fetch('/login', {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        // Always parse as JSON first
        return response.json().then(data => {
            if (!response.ok) {
                // If the response wasn't OK, throw the error data
                throw data;
            }
            return data;
        });
    })
    .then(data => {
        if (data.success && data.redirect) {
            window.location.href = data.redirect;
        } else {
            showError('login-password', data.error || 'Login failed');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        const errorMsg = error.error || 'Login failed. Please try again.';
        showError('login-password', errorMsg);
    })
    .finally(() => {
        // Restore button state
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    });
}
});