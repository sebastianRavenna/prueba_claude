/**
 * ============================================
 * MAIN.JS - Funcionalidades Generales
 * Transformadores Web - VOLTRAN & INDUTRAF
 * ============================================
 */

/**
 * Configuración global
 */
const App = {
    // Estado de la aplicación
    state: {
        isLoading: false,
        componentsLoaded: false
    },

    /**
     * Inicializa la aplicación
     */
    init() {
        this.setupIntersectionObserver();
        this.setupSmoothScroll();
        this.setupFormValidation();

        // Marcar como inicializado
        document.body.classList.add('app-loaded');

        console.log('Aplicación inicializada');
    },

    /**
     * Configura el Intersection Observer para animaciones al scroll
     */
    setupIntersectionObserver() {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fadeInUp');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observar elementos con clase .animate-on-scroll
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    },

    /**
     * Configura el scroll suave para anclas
     */
    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');

                if (targetId === '#') return;

                const target = document.querySelector(targetId);
                if (target) {
                    e.preventDefault();
                    const headerHeight = document.querySelector('.main-header')?.offsetHeight || 80;

                    window.scrollTo({
                        top: target.offsetTop - headerHeight,
                        behavior: 'smooth'
                    });
                }
            });
        });
    },

    /**
     * Configura la validación de formularios
     */
    setupFormValidation() {
        const contactForm = document.getElementById('contact-form');
        if (!contactForm) return;

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (this.validateForm(contactForm)) {
                await this.submitForm(contactForm);
            }
        });

        // Validación en tiempo real
        const inputs = contactForm.querySelectorAll('.form-control');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            input.addEventListener('input', () => {
                // Limpiar error al escribir
                const group = input.closest('.form-group');
                if (group) {
                    group.classList.remove('has-error');
                }
            });
        });
    },

    /**
     * Valida un campo individual
     * @param {HTMLElement} field - Campo a validar
     * @returns {boolean} - true si es válido
     */
    validateField(field) {
        const group = field.closest('.form-group');
        const errorElement = group?.querySelector('.form-error');
        let isValid = true;
        let errorMessage = '';

        // Limpiar errores previos
        group?.classList.remove('has-error');
        field.classList.remove('error', 'success');

        // Validación de campo requerido
        if (field.required && !field.value.trim()) {
            isValid = false;
            errorMessage = LanguageSwitcher.translate('form_required');
        }

        // Validación de email
        if (isValid && field.type === 'email' && field.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(field.value)) {
                isValid = false;
                errorMessage = LanguageSwitcher.translate('form_invalid_email');
            }
        }

        // Validación de teléfono
        if (isValid && field.type === 'tel' && field.value) {
            const phoneRegex = /^[\d\s\-\+\(\)]{8,20}$/;
            if (!phoneRegex.test(field.value)) {
                isValid = false;
                errorMessage = LanguageSwitcher.translate('form_invalid_phone');
            }
        }

        // Mostrar error o éxito
        if (!isValid) {
            group?.classList.add('has-error');
            field.classList.add('error');
            if (errorElement) {
                errorElement.textContent = errorMessage;
            }
        } else if (field.value) {
            field.classList.add('success');
        }

        return isValid;
    },

    /**
     * Valida todo el formulario
     * @param {HTMLFormElement} form - Formulario a validar
     * @returns {boolean} - true si todos los campos son válidos
     */
    validateForm(form) {
        const fields = form.querySelectorAll('.form-control[required]');
        let isValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Validar selección de empresa
        const companyInputs = form.querySelectorAll('input[name="company"]');
        if (companyInputs.length > 0) {
            const companySelected = Array.from(companyInputs).some(input => input.checked);
            if (!companySelected) {
                isValid = false;
                // Mostrar error en el grupo de empresa
                const companyGroup = companyInputs[0].closest('.form-group');
                if (companyGroup) {
                    companyGroup.classList.add('has-error');
                }
            }
        }

        return isValid;
    },

    /**
     * Envía el formulario
     * @param {HTMLFormElement} form - Formulario a enviar
     */
    async submitForm(form) {
        const submitBtn = form.querySelector('.btn-submit');
        const messageContainer = form.querySelector('.form-message');

        // Estado de carga
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }

        try {
            const formData = new FormData(form);

            const response = await fetch('php/contact.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showFormMessage(messageContainer, 'success', LanguageSwitcher.translate('form_success'));
                form.reset();

                // Limpiar clases de validación
                form.querySelectorAll('.form-control').forEach(field => {
                    field.classList.remove('success', 'error');
                });
            } else {
                this.showFormMessage(messageContainer, 'error', result.message || LanguageSwitcher.translate('form_error'));
            }
        } catch (error) {
            console.error('Error al enviar formulario:', error);
            this.showFormMessage(messageContainer, 'error', LanguageSwitcher.translate('form_error'));
        } finally {
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        }
    },

    /**
     * Muestra un mensaje en el formulario
     * @param {HTMLElement} container - Contenedor del mensaje
     * @param {string} type - Tipo de mensaje ('success' o 'error')
     * @param {string} message - Texto del mensaje
     */
    showFormMessage(container, type, message) {
        if (!container) return;

        container.className = `form-message ${type} show`;
        container.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'} form-message-icon"></i>
            ${message}
        `;

        // Scroll al mensaje
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Ocultar después de 5 segundos
        setTimeout(() => {
            container.classList.remove('show');
        }, 5000);
    }
};

/**
 * Utilidades
 */
const Utils = {
    /**
     * Debounce para optimizar eventos frecuentes
     * @param {Function} func - Función a ejecutar
     * @param {number} wait - Tiempo de espera en ms
     * @returns {Function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle para limitar la frecuencia de ejecución
     * @param {Function} func - Función a ejecutar
     * @param {number} limit - Límite de tiempo en ms
     * @returns {Function}
     */
    throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Formatea un número con separadores de miles
     * @param {number} num - Número a formatear
     * @returns {string}
     */
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
};

/**
 * Animación de contadores
 */
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number[data-count]');

    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const duration = 2000; // 2 segundos
        const step = target / (duration / 16); // 60fps
        let current = 0;

        const updateCounter = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };

        // Iniciar animación cuando sea visible
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                updateCounter();
                observer.disconnect();
            }
        });

        observer.observe(counter);
    });
}

/**
 * Inicialización cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que los componentes estén cargados
    document.addEventListener('componentsLoaded', () => {
        App.init();
        animateCounters();
    });

    // También inicializar si los componentes ya están
    if (document.getElementById('main-header')) {
        App.init();
        animateCounters();
    }
});

/**
 * Efectos de parallax suave (opcional)
 */
window.addEventListener('scroll', Utils.throttle(() => {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.parallax');

    parallaxElements.forEach(el => {
        const speed = el.getAttribute('data-speed') || 0.5;
        el.style.transform = `translateY(${scrolled * speed}px)`;
    });
}, 16));
