// Client-side JS - handles forms, validation, UI interactions

// Auto-hide flash messages after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(function(message) {
        setTimeout(function() {
            message.style.opacity = '0';
            message.style.transition = 'opacity 0.5s';
            setTimeout(function() {
                message.remove();
            }, 500);
        }, 5000);
    });

    // Confirm before deleting
    const deleteButtons = document.querySelectorAll('.btn-delete, .btn-danger[onclick*="delete"]');
    deleteButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                e.preventDefault();
                return false;
            }
        });
    });

    // Form handling
    const forms = document.querySelectorAll('form[method="post"], form[method="POST"]');
    forms.forEach(function(form) {
        // Show loading spinner on submit
        form.addEventListener('submit', function(e) {
            const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
            if (submitButton && !form.dataset.noLoading) {
                submitButton.classList.add('btn-loading');
                submitButton.disabled = true;
                // Re-enable if validation fails
                setTimeout(function() {
                    if (!form.checkValidity()) {
                        submitButton.classList.remove('btn-loading');
                        submitButton.disabled = false;
                    }
                }, 100);
            }
        });

        // Clear errors when user types
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(function(input) {
            input.addEventListener('input', function() {
                const formGroup = input.closest('.form-group');
                if (formGroup) {
                    formGroup.classList.remove('error');
                    const errorMsg = formGroup.querySelector('.error-message');
                    if (errorMsg) {
                        errorMsg.remove();
                    }
                }
            });

            // Validate when field loses focus
            input.addEventListener('blur', function() {
                validateField(input);
            });
        });
    });

    // Check password match on registration forms
    const passwordInputs = document.querySelectorAll('input[type="password"][name*="confirm"], input[type="password"][name*="password2"]');
    passwordInputs.forEach(function(confirmPassword) {
        const passwordField = document.querySelector('input[type="password"][name*="password"]:not([name*="confirm"])');
        if (passwordField) {
            confirmPassword.addEventListener('blur', function() {
                if (confirmPassword.value && confirmPassword.value !== passwordField.value) {
                    showFieldError(confirmPassword, 'Passwords do not match');
                } else {
                    clearFieldError(confirmPassword);
                }
            });
        }
    });
});

// Validate single field
function validateField(field) {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;

    clearFieldError(field);

    // Check required
    if (field.hasAttribute('required') && !field.value.trim()) {
        showFieldError(field, 'This field is required');
        return false;
    }

    // Check email format
    if (field.type === 'email' && field.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(field.value)) {
            showFieldError(field, 'Please enter a valid email address');
            return false;
        }
    }

    // Check password length
    if (field.type === 'password' && field.value) {
        if (field.value.length < 8) {
            showFieldError(field, 'Password must be at least 8 characters long');
            return false;
        }
    }

    // Check URL format
    if (field.type === 'url' && field.value) {
        try {
            new URL(field.value);
        } catch (e) {
            showFieldError(field, 'Please enter a valid URL');
            return false;
        }
    }

    // Check min/max length
    if (field.hasAttribute('minlength')) {
        const minLength = parseInt(field.getAttribute('minlength'));
        if (field.value.length < minLength) {
            showFieldError(field, `Must be at least ${minLength} characters`);
            return false;
        }
    }

    if (field.hasAttribute('maxlength')) {
        const maxLength = parseInt(field.getAttribute('maxlength'));
        if (field.value.length > maxLength) {
            showFieldError(field, `Must be no more than ${maxLength} characters`);
            return false;
        }
    }

    formGroup.classList.add('success');
    return true;
}

// Show field error
function showFieldError(field, message) {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;

    formGroup.classList.remove('success');
    formGroup.classList.add('error');
    
    const existingError = formGroup.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    const errorMsg = document.createElement('span');
    errorMsg.className = 'error-message';
    errorMsg.textContent = message;
    errorMsg.setAttribute('role', 'alert');
    errorMsg.setAttribute('aria-live', 'polite');
    
    field.parentNode.insertBefore(errorMsg, field.nextSibling);
    field.setAttribute('aria-invalid', 'true');
}

// Clear field error
function clearFieldError(field) {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;

    formGroup.classList.remove('error');
    const errorMsg = formGroup.querySelector('.error-message');
    if (errorMsg) {
        errorMsg.remove();
    }
    field.removeAttribute('aria-invalid');
}

// Toggle button loading state
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('btn-loading');
        button.disabled = true;
    } else {
        button.classList.remove('btn-loading');
        button.disabled = false;
    }
}

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', function() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            const href = link.getAttribute('href');
            if (href === '#' || href === '#!') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                history.pushState(null, null, href);
            }
        });
    });
});


