document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    // Toggle Password Visibility
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = '👁️';
            } else {
                input.type = 'password';
                this.textContent = '👁️‍🗨️';
            }
        });
    });

    const showError = (input, message) => {
        const formGroup = input.closest('.form-group');
        const errorDisplay = formGroup.querySelector('.error-message');
        input.classList.add('error');
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
    };

    const clearError = (input) => {
        const formGroup = input.closest('.form-group');
        const errorDisplay = formGroup.querySelector('.error-message');
        input.classList.remove('error');
        errorDisplay.style.display = 'none';
    };

    const validateEmail = (email) => {
        return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
    };

    const showToast = (message, type = 'success') => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Real-time error clearing
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => clearError(input));
    });

    // Login Submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let isValid = true;
            const identifier = loginForm.querySelector('#email');
            const password = loginForm.querySelector('#password');

            if (!identifier.value) { showError(identifier, 'Email or User ID is required'); isValid = false; }
            
            if (!password.value) { showError(password, 'Password is required'); isValid = false; }

            if (isValid) {
                const formData = new FormData();
                formData.append('email', identifier.value);
                formData.append('password', password.value);

                try {
                    const res = await fetch('api/api.php?action=login', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.status === 'success') {
                        window.location.href = 'index.php';
                    } else {
                        showError(password, data.message);
                    }
                } catch (err) { showError(password, 'Server error. Please try again.'); }
            }
        });
    }

    // Signup Submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let isValid = true;
            const name = signupForm.querySelector('#name');
            const email = signupForm.querySelector('#email');
            const password = signupForm.querySelector('#password');
            const confirm = signupForm.querySelector('#confirmPassword');

            if (!name.value) { showError(name, 'User ID is required'); isValid = false; }
            if (!email.value) { showError(email, 'Email is required'); isValid = false; }
            else if (!validateEmail(email.value)) { showError(email, 'Invalid email format'); isValid = false; }
            
            if (!password.value) { showError(password, 'Password is required'); isValid = false; }
            else if (password.value.length < 6) { showError(password, 'Min 6 characters'); isValid = false; }

            if (password.value !== confirm.value) { showError(confirm, 'Passwords do not match'); isValid = false; }

            if (isValid) {
                const formData = new FormData();
                formData.append('name', name.value);
                formData.append('email', email.value);
                formData.append('password', password.value);

                try {
                    const res = await fetch('api/api.php?action=register', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.status === 'success') {
                        showToast('Registration successful! Redirecting...', 'success');
                        setTimeout(() => window.location.href = 'login.html', 1500);
                    } else {
                        if (data.message === 'EMAIL_EXISTS') {
                            showError(email, 'Email address is already registered');
                        } else if (data.message === 'USERID_EXISTS') {
                            showError(name, 'User ID is already taken');
                        } else {
                            showError(email, data.message);
                        }
                    }
                } catch (err) { showError(email, 'Server error. Please try again.'); }
            }
        });
    }
});
