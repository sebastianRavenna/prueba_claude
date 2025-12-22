/**
 * ============================================
 * LANGUAGE-SWITCHER.JS - Sistema de Cambio de Idioma
 * Transformadores Web - VOLTRAN & INDUTRAF
 * ============================================
 */

/**
 * Configuración del sistema de idiomas
 */
const LanguageSwitcher = {
    // Idioma actual
    currentLanguage: 'es',

    // Idioma por defecto
    defaultLanguage: 'es',

    // Clave para localStorage
    storageKey: 'transformadores_language',

    /**
     * Inicializa el sistema de idiomas
     */
    init() {
        // Cargar idioma guardado o usar el por defecto
        this.currentLanguage = this.getSavedLanguage();

        // Aplicar traducciones iniciales
        this.applyTranslations();

        // Configurar event listeners para los botones de idioma
        this.setupEventListeners();

        // Actualizar estado visual de los botones
        this.updateButtonState();

        console.log(`Idioma inicializado: ${this.currentLanguage}`);
    },

    /**
     * Obtiene el idioma guardado en localStorage
     * @returns {string} - Código de idioma
     */
    getSavedLanguage() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved && translations[saved]) {
            return saved;
        }

        // Intentar detectar idioma del navegador
        const browserLang = navigator.language.split('-')[0];
        if (translations[browserLang]) {
            return browserLang;
        }

        return this.defaultLanguage;
    },

    /**
     * Guarda el idioma en localStorage
     * @param {string} lang - Código de idioma
     */
    saveLanguage(lang) {
        localStorage.setItem(this.storageKey, lang);
    },

    /**
     * Cambia el idioma actual
     * @param {string} lang - Código de idioma ('es' o 'en')
     */
    setLanguage(lang) {
        if (!translations[lang]) {
            console.warn(`Idioma '${lang}' no disponible`);
            return;
        }

        this.currentLanguage = lang;
        this.saveLanguage(lang);
        this.applyTranslations();
        this.updateButtonState();

        // Disparar evento personalizado
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: lang }
        }));

        console.log(`Idioma cambiado a: ${lang}`);
    },

    /**
     * Aplica las traducciones a todos los elementos con data-translate
     */
    applyTranslations() {
        const currentTranslations = translations[this.currentLanguage];

        if (!currentTranslations) {
            console.error('No se encontraron traducciones para:', this.currentLanguage);
            return;
        }

        // Seleccionar todos los elementos con atributo data-translate
        const elements = document.querySelectorAll('[data-translate]');

        elements.forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = currentTranslations[key];

            if (translation) {
                // Verificar si es un input (placeholder)
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                }
                // Verificar si es un botón o tiene texto interno
                else {
                    // Preservar iconos si existen
                    const icon = element.querySelector('i');
                    if (icon) {
                        const iconHtml = icon.outerHTML;
                        element.innerHTML = iconHtml + '<span>' + translation + '</span>';
                    } else {
                        element.textContent = translation;
                    }
                }
            }
        });

        // Actualizar atributo lang del HTML
        document.documentElement.lang = this.currentLanguage;
    },

    /**
     * Configura los event listeners para los botones de idioma
     */
    setupEventListeners() {
        // Esperar a que los componentes estén cargados
        document.addEventListener('componentsLoaded', () => {
            this.bindLanguageButtons();
        });

        // También intentar enlazar inmediatamente por si ya están cargados
        this.bindLanguageButtons();
    },

    /**
     * Enlaza los eventos a los botones de idioma
     */
    bindLanguageButtons() {
        const langButtons = document.querySelectorAll('.lang-btn');

        langButtons.forEach(button => {
            // Evitar múltiples event listeners
            if (button.hasAttribute('data-listener-attached')) {
                return;
            }

            button.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = button.getAttribute('data-lang');
                if (lang) {
                    this.setLanguage(lang);
                }
            });

            button.setAttribute('data-listener-attached', 'true');
        });

        // Actualizar estado visual después de enlazar
        this.updateButtonState();
    },

    /**
     * Actualiza el estado visual de los botones de idioma
     */
    updateButtonState() {
        const langButtons = document.querySelectorAll('.lang-btn');

        langButtons.forEach(button => {
            const lang = button.getAttribute('data-lang');
            const isActive = lang === this.currentLanguage;

            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive.toString());
        });
    },

    /**
     * Obtiene una traducción específica
     * @param {string} key - Clave de traducción
     * @param {string} lang - Código de idioma (opcional, usa el actual)
     * @returns {string} - Texto traducido o la clave si no existe
     */
    translate(key, lang = null) {
        const targetLang = lang || this.currentLanguage;
        const langTranslations = translations[targetLang];

        if (langTranslations && langTranslations[key]) {
            return langTranslations[key];
        }

        console.warn(`Traducción no encontrada: ${key}`);
        return key;
    },

    /**
     * Alterna entre los idiomas disponibles
     */
    toggleLanguage() {
        const newLang = this.currentLanguage === 'es' ? 'en' : 'es';
        this.setLanguage(newLang);
    }
};

/**
 * Función global para inicializar el idioma (llamada desde components.js)
 */
function initializeLanguage() {
    LanguageSwitcher.init();
}

/**
 * Función helper global para obtener traducciones
 * @param {string} key - Clave de traducción
 * @returns {string} - Texto traducido
 */
function t(key) {
    return LanguageSwitcher.translate(key);
}

// Inicializar cuando el DOM esté listo si los componentes ya están cargados
document.addEventListener('DOMContentLoaded', () => {
    // Si los componentes ya están cargados, inicializar
    if (document.getElementById('main-header')) {
        LanguageSwitcher.init();
    }
});
