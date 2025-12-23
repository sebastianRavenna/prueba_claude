/**
 * ============================================
 * COMPONENTS.JS - Carga de Componentes HTML
 * Transformadores Web - VOLTRAN & INDUTRAF
 * ============================================
 */

/**
 * Carga un componente HTML en un contenedor específico
 * @param {string} componentPath - Ruta del archivo HTML del componente
 * @param {string} containerId - ID del contenedor donde insertar el componente
 * @returns {Promise} - Promesa que resuelve cuando el componente está cargado
 */
async function loadComponent(componentPath, containerId) {
    try {
        const response = await fetch(componentPath);

        if (!response.ok) {
            throw new Error(`Error al cargar ${componentPath}: ${response.status}`);
        }

        const html = await response.text();
        const container = document.getElementById(containerId);

        if (container) {
            container.innerHTML = html;
            return true;
        } else {
            console.warn(`Contenedor #${containerId} no encontrado`);
            return false;
        }
    } catch (error) {
        console.error(`Error cargando componente: ${error.message}`);
        return false;
    }
}

/**
 * Carga todos los componentes de la página
 */
async function loadAllComponents() {
    try {
        // Cargar header y footer en paralelo
        const [headerLoaded, footerLoaded] = await Promise.all([
            loadComponent('components/header.html', 'header-container'),
            loadComponent('components/footer.html', 'footer-container')
        ]);

        // Inicializar funcionalidades después de cargar componentes
        if (headerLoaded) {
            initializeHeader();
            setActiveNavLink();
        }

        if (footerLoaded) {
            initializeFooter();
        }

        // Inicializar el sistema de idiomas
        if (typeof initializeLanguage === 'function') {
            initializeLanguage();
        }

        // Disparar evento personalizado cuando los componentes estén listos
        document.dispatchEvent(new CustomEvent('componentsLoaded'));

    } catch (error) {
        console.error('Error al cargar componentes:', error);
    }
}

/**
 * Inicializa las funcionalidades del header
 */
function initializeHeader() {
    const header = document.getElementById('main-header');
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.getElementById('main-nav');

    if (!header) return;

    // Menú móvil toggle
    if (mobileToggle && mainNav) {
        mobileToggle.addEventListener('click', function () {
            this.classList.toggle('active');
            mainNav.classList.toggle('active');

            // Actualizar atributos de accesibilidad
            const isExpanded = this.classList.contains('active');
            this.setAttribute('aria-expanded', isExpanded);

            // Prevenir scroll del body cuando el menú está abierto
            document.body.style.overflow = isExpanded ? 'hidden' : '';
        });

        // Cerrar menú al hacer clic en un enlace
        const navLinks = mainNav.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                mainNav.classList.remove('active');
                document.body.style.overflow = '';
                mobileToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // Efecto de scroll en header
    let lastScrollTop = 0;
    window.addEventListener('scroll', function () {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Añadir clase scrolled cuando hay scroll
        if (scrollTop > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        lastScrollTop = scrollTop;
    }, { passive: true });
}

/**
 * Establece el enlace activo en la navegación basado en la URL actual
 */
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');

        if (href === currentPage) {
            link.classList.add('active');
        } else if (currentPage === '' && href === 'index.html') {
            link.classList.add('active');
        }
    });
}

/**
 * Inicializa las funcionalidades del footer
 */
function initializeFooter() {
    // Actualizar año actual
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Botón volver arriba
    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
        // Mostrar/ocultar botón basado en scroll
        window.addEventListener('scroll', function () {
            if (window.pageYOffset > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        }, { passive: true });

        // Scroll suave hacia arriba
        backToTop.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

/**
 * Inicialización cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', loadAllComponents);
