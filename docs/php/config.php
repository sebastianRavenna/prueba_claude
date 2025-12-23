<?php
/**
 * ============================================
 * CONFIG.PHP - Configuración del Sistema
 * Transformadores Web - VOLTRAN & INDUTRAF
 * ============================================
 */

// Prevenir acceso directo al archivo
if (!defined('CONTACT_FORM')) {
    die('Acceso no autorizado');
}

/**
 * Configuración de correo electrónico
 */
$config = [
    // Configuración general
    'site_name' => 'VOLTRAN & INDUTRAF - Transformadores Industriales',
    'debug_mode' => false, // Cambiar a true para depuración

    // Configuración de empresas
    'companies' => [
        'voltran' => [
            'name' => 'VOLTRAN S.A.',
            'email' => 'info@voltran.com.ar', // Email principal
            'copy_emails' => ['ventas@voltran.com.ar'], // Emails adicionales para copia
            'phone' => '+54 11 5555-1234',
            'address' => 'Av. Industrial 1234, Parque Industrial Norte, Buenos Aires',
        ],
        'indutraf' => [
            'name' => 'INDUTRAF S.R.L.',
            'email' => 'contacto@indutraf.com.ar', // Email principal
            'copy_emails' => ['comercial@indutraf.com.ar'], // Emails adicionales para copia
            'phone' => '+54 351 456-7890',
            'address' => 'Calle Transformadores 567, Zona Industrial Sur, Córdoba',
        ],
    ],

    // Configuración SMTP (para uso con PHPMailer)
    'smtp' => [
        'enabled' => false, // Cambiar a true si usas SMTP
        'host' => 'smtp.ejemplo.com',
        'port' => 587,
        'username' => 'tu_usuario@ejemplo.com',
        'password' => 'tu_password',
        'encryption' => 'tls', // 'tls' o 'ssl'
        'from_email' => 'noreply@transformadores.com.ar',
        'from_name' => 'Formulario de Contacto',
    ],

    // Configuración de seguridad
    'security' => [
        'rate_limit' => 5, // Máximo de envíos por IP en el período
        'rate_period' => 3600, // Período en segundos (1 hora)
        'honeypot_field' => 'website', // Campo trampa para bots
        'token_expiry' => 3600, // Tiempo de validez del token (1 hora)
    ],

    // Mensajes
    'messages' => [
        'es' => [
            'success' => '¡Mensaje enviado correctamente! Nos pondremos en contacto pronto.',
            'error' => 'Hubo un error al enviar el mensaje. Por favor, intente nuevamente.',
            'validation_error' => 'Por favor, complete todos los campos requeridos correctamente.',
            'rate_limit' => 'Ha excedido el límite de envíos. Por favor, intente más tarde.',
            'invalid_company' => 'Por favor, seleccione una empresa válida.',
            'spam_detected' => 'Su mensaje ha sido detectado como spam.',
        ],
        'en' => [
            'success' => 'Message sent successfully! We will contact you soon.',
            'error' => 'There was an error sending the message. Please try again.',
            'validation_error' => 'Please fill in all required fields correctly.',
            'rate_limit' => 'You have exceeded the submission limit. Please try again later.',
            'invalid_company' => 'Please select a valid company.',
            'spam_detected' => 'Your message has been detected as spam.',
        ],
    ],

    // Servicios (para referencia en emails)
    'services' => [
        'fabricacion' => 'Fabricación de Transformadores',
        'mantenimiento' => 'Mantenimiento Preventivo',
        'reparacion' => 'Reparación y Rebobinado',
    ],

    // Equipos (para referencia en emails)
    'equipment' => [
        'distribucion' => 'Transformadores de Distribución',
        'potencia' => 'Transformadores de Potencia',
        'auto' => 'Autotransformadores',
    ],
];

/**
 * Función helper para obtener configuración
 * @param string $key - Clave de configuración (usa notación punto: 'smtp.host')
 * @param mixed $default - Valor por defecto si no existe
 * @return mixed
 */
function getConfig($key, $default = null) {
    global $config;

    $keys = explode('.', $key);
    $value = $config;

    foreach ($keys as $k) {
        if (!isset($value[$k])) {
            return $default;
        }
        $value = $value[$k];
    }

    return $value;
}

/**
 * Función para obtener mensaje traducido
 * @param string $key - Clave del mensaje
 * @param string $lang - Idioma ('es' o 'en')
 * @return string
 */
function getMessage($key, $lang = 'es') {
    global $config;

    $lang = in_array($lang, ['es', 'en']) ? $lang : 'es';

    return $config['messages'][$lang][$key] ?? $config['messages']['es'][$key] ?? $key;
}
