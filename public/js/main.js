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

    // Check if navigation menu wraps to multiple rows
    function checkNavWrap() {
        const navMenu = document.querySelector('.nav-menu');
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        
        if (navMenu && mobileMenuToggle) {
            // On desktop (wide screens), always show navigation - never hide it
            if (window.innerWidth > 1024) {
                mobileMenuToggle.style.display = 'none';
                navMenu.style.display = 'flex';
                navMenu.style.setProperty('display', 'flex', 'important');
                navMenu.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                checkHeroCirclesWrap();
                return;
            }
            
            // On mobile/tablet, check if menu wraps
            // Remove inline styles to check natural state
            navMenu.style.display = '';
            mobileMenuToggle.style.display = '';
            
            // Force flex to check wrapping
            navMenu.style.display = 'flex';
            
            // Small delay to ensure layout is calculated
            setTimeout(function() {
                const menuItems = navMenu.querySelectorAll('li');
                if (menuItems.length > 0) {
                    const firstItemTop = menuItems[0].offsetTop;
                    let wraps = false;
                    
                    for (let i = 1; i < menuItems.length; i++) {
                        if (menuItems[i].offsetTop > firstItemTop) {
                            wraps = true;
                            break;
                        }
                    }
                    
                    // If menu wraps or screen is narrow, show hamburger
                    if (wraps || window.innerWidth <= 1024) {
                        mobileMenuToggle.style.display = 'flex';
                        navMenu.style.display = 'none';
                        navMenu.classList.remove('active');
                        mobileMenuToggle.setAttribute('aria-expanded', 'false');
                    } else {
                        // Menu fits on one row - show normal menu
                        mobileMenuToggle.style.display = 'none';
                        navMenu.style.display = 'flex';
                        navMenu.classList.remove('active');
                        mobileMenuToggle.setAttribute('aria-expanded', 'false');
                    }
                    
                    // After nav check, check circles (carousel should match hamburger state)
                    checkHeroCirclesWrap();
                }
            }, 10);
        } else {
            // If no nav menu, still check circles
            checkHeroCirclesWrap();
        }
    }

    // Check admin nav wrap
    function checkAdminNavWrap() {
        const adminNavMenu = document.querySelector('.admin-nav-menu');
        const adminMenuToggle = document.querySelector('.admin-mobile-menu-toggle');
        
        if (adminNavMenu && adminMenuToggle) {
            // Remove inline styles to check natural state
            adminNavMenu.style.display = '';
            adminMenuToggle.style.display = '';
            
            // Force flex to check wrapping
            adminNavMenu.style.display = 'flex';
            
            // Small delay to ensure layout is calculated
            setTimeout(function() {
                const menuItems = adminNavMenu.querySelectorAll('li');
                if (menuItems.length > 0) {
                    const firstItemTop = menuItems[0].offsetTop;
                    let wraps = false;
                    
                    for (let i = 1; i < menuItems.length; i++) {
                        if (menuItems[i].offsetTop > firstItemTop) {
                            wraps = true;
                            break;
                        }
                    }
                    
                    // If menu wraps or screen is narrow, show hamburger
                    if (wraps || window.innerWidth <= 1024) {
                        adminMenuToggle.style.display = 'flex';
                        adminNavMenu.style.display = 'none';
                        adminNavMenu.classList.remove('active');
                        adminMenuToggle.setAttribute('aria-expanded', 'false');
                    } else {
                        // Menu fits on one row - show normal menu
                        adminMenuToggle.style.display = 'none';
                        adminNavMenu.style.display = 'flex';
                        adminNavMenu.classList.remove('active');
                        adminMenuToggle.setAttribute('aria-expanded', 'false');
                    }
                }
            }, 10);
        }
    }

    // Check if hamburger menu is showing - if so, also show carousel
    function checkHeroCirclesWrap() {
        const desktopCircles = document.querySelector('.hero-images-desktop');
        const mobileCarousel = document.querySelector('.hero-images-carousel');
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        
        if (!desktopCircles || !mobileCarousel) return;
        
        // Check if hamburger menu is visible (meaning nav would wrap)
        let hamburgerVisible = false;
        if (mobileMenuToggle) {
            const toggleDisplay = window.getComputedStyle(mobileMenuToggle).display;
            hamburgerVisible = toggleDisplay !== 'none' && toggleDisplay !== '';
        }
        
        // Show carousel when hamburger menu is visible
        if (hamburgerVisible) {
            desktopCircles.style.setProperty('display', 'none', 'important');
            mobileCarousel.style.setProperty('display', 'block', 'important');
        } else {
            // Hamburger not visible - show desktop layout
            desktopCircles.style.setProperty('display', 'flex', 'important');
            mobileCarousel.style.setProperty('display', 'none', 'important');
        }
    }

    // Debounce resize handler
    let resizeTimeout;
    function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            checkNavWrap();
            checkAdminNavWrap();
            checkHeroCirclesWrap();
        }, 100);
    }

    // Initialize navigation on page load
    function initializeNavigation() {
        setTimeout(function() {
            checkNavWrap();
            checkAdminNavWrap();
            checkHeroCirclesWrap();
        }, 100);
    }

    // Check on load - wait for DOM and images to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNavigation);
    } else {
        // DOM already loaded
        initializeNavigation();
    }
    
    // Handle browser back/forward cache (bfcache) restoration
    // When user navigates back from external link, reinitialize navigation
    window.addEventListener('pageshow', function(event) {
        // event.persisted is true when page is restored from bfcache
        if (event.persisted) {
            // Clear any inline styles that might hide navigation
            const navMenu = document.querySelector('.nav-menu');
            const adminNavMenu = document.querySelector('.admin-nav-menu');
            const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
            const adminMenuToggle = document.querySelector('.admin-mobile-menu-toggle');
            
            if (navMenu) {
                navMenu.style.display = '';
                navMenu.classList.remove('active');
            }
            if (adminNavMenu) {
                adminNavMenu.style.display = '';
                adminNavMenu.classList.remove('active');
            }
            if (mobileMenuToggle) {
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
            }
            if (adminMenuToggle) {
                adminMenuToggle.setAttribute('aria-expanded', 'false');
            }
            
            // Reinitialize navigation after clearing styles
            initializeNavigation();
        }
    });
    
    // Handle window focus - when user returns to tab/window
    // This ensures navigation is visible when coming back from external links
    window.addEventListener('focus', function() {
        // Small delay to ensure page is fully rendered
        setTimeout(function() {
            const navMenu = document.querySelector('.nav-menu');
            const adminNavMenu = document.querySelector('.admin-nav-menu');
            const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
            const adminMenuToggle = document.querySelector('.admin-mobile-menu-toggle');
            
            // On desktop, always ensure navigation is visible
            if (window.innerWidth > 1024) {
                if (navMenu) {
                    navMenu.style.display = 'flex';
                    navMenu.style.setProperty('display', 'flex', 'important');
                }
                if (adminNavMenu) {
                    adminNavMenu.style.display = 'flex';
                    adminNavMenu.style.setProperty('display', 'flex', 'important');
                }
                if (mobileMenuToggle) {
                    mobileMenuToggle.style.display = 'none';
                }
                if (adminMenuToggle) {
                    adminMenuToggle.style.display = 'none';
                }
                // Re-run check to ensure proper state
                checkNavWrap();
                checkAdminNavWrap();
            }
        }, 100);
    });
    
    window.addEventListener('resize', handleResize);

    // Mobile navigation menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
            mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
            navMenu.classList.toggle('active');
            if (navMenu.classList.contains('active')) {
                navMenu.style.display = 'flex';
            } else {
                navMenu.style.display = 'none';
            }
        });

        // On desktop, always keep navigation visible - never hide it
        // Only allow mobile menu toggle on mobile devices
        document.addEventListener('click', function(e) {
            // On desktop, always ensure navigation is visible
            if (window.innerWidth > 1024) {
                if (navMenu) {
                    navMenu.style.display = 'flex';
                    navMenu.classList.remove('active');
                }
                if (mobileMenuToggle) {
                    mobileMenuToggle.style.display = 'none';
                }
                return; // Don't process mobile menu logic on desktop
            }
            
            // Mobile-only: close menu when clicking outside
            const toggleDisplay = window.getComputedStyle(mobileMenuToggle).display;
            const isMobile = toggleDisplay !== 'none' && toggleDisplay !== '';
            
            if (isMobile && !mobileMenuToggle.contains(e.target) && !navMenu.contains(e.target)) {
                // Only close if menu is currently open (has active class)
                if (navMenu.classList.contains('active')) {
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                    navMenu.classList.remove('active');
                    navMenu.style.display = 'none';
                }
            }
        });

        // Close menu when clicking a link (only on mobile when hamburger is visible)
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                // On desktop, always keep navigation visible
                if (window.innerWidth > 1024) {
                    if (navMenu) {
                        navMenu.style.display = 'flex';
                    }
                    return;
                }
                
                // Mobile-only: close menu when clicking a link
                const toggleDisplay = window.getComputedStyle(mobileMenuToggle).display;
                const isMobile = toggleDisplay !== 'none' && toggleDisplay !== '';
                
                if (isMobile) {
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                    navMenu.classList.remove('active');
                    navMenu.style.display = 'none';
                }
            });
        });
    }

    // Admin mobile navigation menu toggle
    const adminMenuToggle = document.querySelector('.admin-mobile-menu-toggle');
    const adminNavMenu = document.querySelector('.admin-nav-menu');
    
    if (adminMenuToggle && adminNavMenu) {
        adminMenuToggle.addEventListener('click', function() {
            const isExpanded = adminMenuToggle.getAttribute('aria-expanded') === 'true';
            adminMenuToggle.setAttribute('aria-expanded', !isExpanded);
            adminNavMenu.classList.toggle('active');
            if (adminNavMenu.classList.contains('active')) {
                adminNavMenu.style.display = 'flex';
            } else {
                adminNavMenu.style.display = 'none';
            }
        });

        // On desktop, always keep admin navigation visible - never hide it
        // Only allow mobile menu toggle on mobile devices
        document.addEventListener('click', function(e) {
            // On desktop, always ensure admin navigation is visible
            if (window.innerWidth > 1024) {
                if (adminNavMenu) {
                    adminNavMenu.style.display = 'flex';
                    adminNavMenu.classList.remove('active');
                }
                if (adminMenuToggle) {
                    adminMenuToggle.style.display = 'none';
                }
                return; // Don't process mobile menu logic on desktop
            }
            
            // Mobile-only: close menu when clicking outside
            const toggleDisplay = window.getComputedStyle(adminMenuToggle).display;
            const isMobile = toggleDisplay !== 'none' && toggleDisplay !== '';
            
            if (isMobile && !adminMenuToggle.contains(e.target) && !adminNavMenu.contains(e.target)) {
                // Only close if menu is currently open (has active class)
                if (adminNavMenu.classList.contains('active')) {
                    adminMenuToggle.setAttribute('aria-expanded', 'false');
                    adminNavMenu.classList.remove('active');
                    adminNavMenu.style.display = 'none';
                }
            }
        });

        // Close menu when clicking a link (only on mobile when hamburger is visible)
        const adminNavLinks = adminNavMenu.querySelectorAll('.admin-nav-link');
        adminNavLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                // On desktop, always keep admin navigation visible
                if (window.innerWidth > 1024) {
                    if (adminNavMenu) {
                        adminNavMenu.style.display = 'flex';
                    }
                    return;
                }
                
                // Mobile-only: close menu when clicking a link
                const toggleDisplay = window.getComputedStyle(adminMenuToggle).display;
                const isMobile = toggleDisplay !== 'none' && toggleDisplay !== '';
                
                if (isMobile) {
                    adminMenuToggle.setAttribute('aria-expanded', 'false');
                    adminNavMenu.classList.remove('active');
                    adminNavMenu.style.display = 'none';
                }
            });
        });
    }

    // Mobile hero carousel functionality
    const carousel = document.querySelector('.hero-images-carousel');
    if (carousel) {
        const slides = carousel.querySelectorAll('.carousel-slide');
        const indicators = carousel.querySelectorAll('.carousel-indicator');
        const prevBtn = carousel.querySelector('.carousel-btn-prev');
        const nextBtn = carousel.querySelector('.carousel-btn-next');
        let currentSlide = 0;
        let autoSlideInterval;

        function showSlide(index) {
            // Remove active class from all slides and indicators
            slides.forEach(slide => slide.classList.remove('active'));
            indicators.forEach(indicator => indicator.classList.remove('active'));

            // Add active class to current slide and indicator
            if (slides[index]) {
                slides[index].classList.add('active');
            }
            if (indicators[index]) {
                indicators[index].classList.add('active');
            }

            currentSlide = index;
        }

        function nextSlide() {
            const next = (currentSlide + 1) % slides.length;
            showSlide(next);
        }

        function prevSlide() {
            const prev = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(prev);
        }

        // Button event listeners
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                nextSlide();
                resetAutoSlide();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                prevSlide();
                resetAutoSlide();
            });
        }

        // Indicator event listeners
        indicators.forEach(function(indicator, index) {
            indicator.addEventListener('click', function() {
                showSlide(index);
                resetAutoSlide();
            });
        });

        // Auto-slide functionality (optional - slides every 4 seconds)
        function startAutoSlide() {
            autoSlideInterval = setInterval(nextSlide, 4000);
        }

        function resetAutoSlide() {
            clearInterval(autoSlideInterval);
            startAutoSlide();
        }

        // Start auto-slide if carousel is visible (mobile only)
        if (window.innerWidth <= 768) {
            startAutoSlide();
        }

        // Pause auto-slide on hover
        carousel.addEventListener('mouseenter', function() {
            clearInterval(autoSlideInterval);
        });

        carousel.addEventListener('mouseleave', function() {
            if (window.innerWidth <= 768) {
                startAutoSlide();
            }
        });

        // Touch swipe support
        let touchStartX = 0;
        let touchEndX = 0;

        carousel.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        });

        carousel.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });

        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
                resetAutoSlide();
            }
        }
    }
});


