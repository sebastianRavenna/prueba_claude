<?php
/**
 * ============================================
 * CONTACT.PHP - Procesador del Formulario de Contacto
 * Transformadores Web - VOLTRAN & INDUTRAF
 * ============================================
 */

// Definir constante para permitir acceso a config
define('CONTACT_FORM', true);

// Cargar configuración
require_once 'config.php';

// Establecer headers para respuesta JSON
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

/**
 * Clase para manejar el formulario de contacto
 */
class ContactFormHandler {
    private $config;
    private $errors = [];
    private $lang = 'es';

    public function __construct() {
        global $config;
        $this->config = $config;

        // Detectar idioma
        $this->lang = isset($_POST['lang']) && $_POST['lang'] === 'en' ? 'en' : 'es';
    }

    /**
     * Procesa el formulario
     * @return array
     */
    public function process() {
        try {
            // Verificar honeypot (campo trampa para bots)
            if ($this->checkHoneypot()) {
                return $this->errorResponse('spam_detected');
            }

            // Verificar rate limit
            if ($this->checkRateLimit()) {
                return $this->errorResponse('rate_limit');
            }

            // Obtener y sanitizar datos
            $data = $this->sanitizeInput();

            // Validar datos
            if (!$this->validate($data)) {
                return [
                    'success' => false,
                    'message' => getMessage('validation_error', $this->lang),
                    'errors' => $this->errors
                ];
            }

            // Obtener información de la empresa
            $company = $this->getCompanyInfo($data['company']);
            if (!$company) {
                return $this->errorResponse('invalid_company');
            }

            // Enviar emails
            $emailSent = $this->sendEmails($data, $company);

            if ($emailSent) {
                // Registrar envío para rate limit
                $this->logSubmission();

                return [
                    'success' => true,
                    'message' => getMessage('success', $this->lang)
                ];
            } else {
                return $this->errorResponse('error');
            }

        } catch (Exception $e) {
            if (getConfig('debug_mode')) {
                return [
                    'success' => false,
                    'message' => $e->getMessage()
                ];
            }
            return $this->errorResponse('error');
        }
    }

    /**
     * Sanitiza los datos de entrada
     * @return array
     */
    private function sanitizeInput() {
        return [
            'name' => $this->sanitize($_POST['name'] ?? ''),
            'email' => filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL),
            'phone' => $this->sanitize($_POST['phone'] ?? ''),
            'company' => $this->sanitize($_POST['company'] ?? ''),
            'message' => $this->sanitize($_POST['message'] ?? ''),
            'source_page' => $this->sanitize($_POST['source_page'] ?? ''),
            'source_service' => $this->sanitize($_POST['source_service'] ?? ''),
            'source_equipment' => $this->sanitize($_POST['source_equipment'] ?? ''),
        ];
    }

    /**
     * Sanitiza un string
     * @param string $input
     * @return string
     */
    private function sanitize($input) {
        return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
    }

    /**
     * Valida los datos del formulario
     * @param array $data
     * @return bool
     */
    private function validate($data) {
        $valid = true;

        // Nombre requerido
        if (empty($data['name']) || strlen($data['name']) < 2) {
            $this->errors['name'] = 'Nombre inválido';
            $valid = false;
        }

        // Email requerido y válido
        if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $this->errors['email'] = 'Email inválido';
            $valid = false;
        }

        // Teléfono requerido
        if (empty($data['phone']) || strlen($data['phone']) < 8) {
            $this->errors['phone'] = 'Teléfono inválido';
            $valid = false;
        }

        // Empresa requerida
        if (empty($data['company']) || !in_array($data['company'], ['voltran', 'indutraf'])) {
            $this->errors['company'] = 'Empresa inválida';
            $valid = false;
        }

        // Mensaje requerido
        if (empty($data['message']) || strlen($data['message']) < 10) {
            $this->errors['message'] = 'Mensaje muy corto';
            $valid = false;
        }

        return $valid;
    }

    /**
     * Verifica el campo honeypot
     * @return bool - true si es spam
     */
    private function checkHoneypot() {
        $honeypotField = getConfig('security.honeypot_field', 'website');
        return !empty($_POST[$honeypotField]);
    }

    /**
     * Verifica el rate limit
     * @return bool - true si excedió el límite
     */
    private function checkRateLimit() {
        $ip = $this->getClientIP();
        $limit = getConfig('security.rate_limit', 5);
        $period = getConfig('security.rate_period', 3600);

        // Usar archivo temporal para tracking (en producción usar Redis/DB)
        $logFile = sys_get_temp_dir() . '/contact_form_log.json';

        if (!file_exists($logFile)) {
            return false;
        }

        $logs = json_decode(file_get_contents($logFile), true) ?: [];
        $currentTime = time();

        // Limpiar logs antiguos
        $logs = array_filter($logs, function($timestamp) use ($currentTime, $period) {
            return ($currentTime - $timestamp) < $period;
        });

        // Contar envíos de esta IP
        $ipLogs = array_filter($logs, function($entry) use ($ip) {
            return isset($entry['ip']) && $entry['ip'] === $ip;
        });

        return count($ipLogs) >= $limit;
    }

    /**
     * Registra un envío para el rate limit
     */
    private function logSubmission() {
        $logFile = sys_get_temp_dir() . '/contact_form_log.json';
        $logs = [];

        if (file_exists($logFile)) {
            $logs = json_decode(file_get_contents($logFile), true) ?: [];
        }

        $logs[] = [
            'ip' => $this->getClientIP(),
            'timestamp' => time()
        ];

        file_put_contents($logFile, json_encode($logs));
    }

    /**
     * Obtiene la IP del cliente
     * @return string
     */
    private function getClientIP() {
        $headers = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];

        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ip = $_SERVER[$header];
                // Tomar solo la primera IP si hay múltiples
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        return '0.0.0.0';
    }

    /**
     * Obtiene información de la empresa
     * @param string $companyKey
     * @return array|null
     */
    private function getCompanyInfo($companyKey) {
        return getConfig("companies.{$companyKey}");
    }

    /**
     * Envía los emails
     * @param array $data
     * @param array $company
     * @return bool
     */
    private function sendEmails($data, $company) {
        // Construir contenido del email
        $emailContent = $this->buildEmailContent($data, $company);

        // Enviar email a la empresa
        $toCompany = $this->sendEmail(
            $company['email'],
            "Nuevo mensaje de contacto - {$company['name']}",
            $emailContent['company'],
            $data['email'],
            $data['name']
        );

        // Enviar copia al cliente
        $toClient = $this->sendEmail(
            $data['email'],
            "Confirmación de mensaje - {$company['name']}",
            $emailContent['client'],
            getConfig('smtp.from_email', 'noreply@transformadores.com.ar'),
            $company['name']
        );

        // Enviar copias adicionales
        if (!empty($company['copy_emails'])) {
            foreach ($company['copy_emails'] as $copyEmail) {
                $this->sendEmail(
                    $copyEmail,
                    "Nuevo mensaje de contacto - {$company['name']}",
                    $emailContent['company'],
                    $data['email'],
                    $data['name']
                );
            }
        }

        return $toCompany;
    }

    /**
     * Construye el contenido del email
     * @param array $data
     * @param array $company
     * @return array
     */
    private function buildEmailContent($data, $company) {
        $date = date('d/m/Y H:i');

        // Información adicional del origen
        $sourceInfo = '';
        if (!empty($data['source_service'])) {
            $serviceName = getConfig("services.{$data['source_service']}", $data['source_service']);
            $sourceInfo .= "\nServicio de interés: {$serviceName}";
        }
        if (!empty($data['source_equipment'])) {
            $equipmentName = getConfig("equipment.{$data['source_equipment']}", $data['source_equipment']);
            $sourceInfo .= "\nEquipo de interés: {$equipmentName}";
        }

        // Email para la empresa
        $companyEmail = "
═══════════════════════════════════════════════════════
     NUEVO MENSAJE DE CONTACTO - {$company['name']}
═══════════════════════════════════════════════════════

Fecha: {$date}

DATOS DEL CONTACTO:
───────────────────────────────────────────────────────
Nombre: {$data['name']}
Email: {$data['email']}
Teléfono: {$data['phone']}{$sourceInfo}

MENSAJE:
───────────────────────────────────────────────────────
{$data['message']}

═══════════════════════════════════════════════════════
Este mensaje fue enviado desde el formulario de contacto
del sitio web de Transformadores Industriales.
═══════════════════════════════════════════════════════
";

        // Email de confirmación para el cliente
        $clientEmail = "
═══════════════════════════════════════════════════════
     CONFIRMACIÓN DE MENSAJE - {$company['name']}
═══════════════════════════════════════════════════════

Estimado/a {$data['name']},

Hemos recibido su mensaje correctamente. Nuestro equipo
se pondrá en contacto con usted a la brevedad.

RESUMEN DE SU MENSAJE:
───────────────────────────────────────────────────────
Fecha de envío: {$date}
Empresa contactada: {$company['name']}{$sourceInfo}

Su mensaje:
{$data['message']}

───────────────────────────────────────────────────────

DATOS DE CONTACTO DE {$company['name']}:
• Teléfono: {$company['phone']}
• Email: {$company['email']}
• Dirección: {$company['address']}

═══════════════════════════════════════════════════════
Gracias por contactarnos.
{$company['name']} - Transformadores Industriales
═══════════════════════════════════════════════════════
";

        return [
            'company' => $companyEmail,
            'client' => $clientEmail
        ];
    }

    /**
     * Envía un email
     * @param string $to
     * @param string $subject
     * @param string $body
     * @param string $replyTo
     * @param string $replyToName
     * @return bool
     */
    private function sendEmail($to, $subject, $body, $replyTo = '', $replyToName = '') {
        // Headers del email
        $headers = [];
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-type: text/plain; charset=UTF-8';
        $headers[] = 'From: ' . getConfig('smtp.from_name', 'Formulario Web') . ' <' . getConfig('smtp.from_email', 'noreply@transformadores.com.ar') . '>';

        if (!empty($replyTo)) {
            $replyToHeader = !empty($replyToName) ? "{$replyToName} <{$replyTo}>" : $replyTo;
            $headers[] = "Reply-To: {$replyToHeader}";
        }

        $headers[] = 'X-Mailer: PHP/' . phpversion();

        // Si SMTP está habilitado, aquí iría la lógica de PHPMailer
        // Por ahora usamos mail() nativo
        if (getConfig('smtp.enabled')) {
            // TODO: Implementar PHPMailer para SMTP
            // return $this->sendWithPHPMailer($to, $subject, $body, $headers);
        }

        // Enviar con mail() nativo
        return @mail($to, $subject, $body, implode("\r\n", $headers));
    }

    /**
     * Genera respuesta de error
     * @param string $messageKey
     * @return array
     */
    private function errorResponse($messageKey) {
        return [
            'success' => false,
            'message' => getMessage($messageKey, $this->lang)
        ];
    }
}

// Procesar formulario
$handler = new ContactFormHandler();
$result = $handler->process();

// Enviar respuesta JSON
echo json_encode($result, JSON_UNESCAPED_UNICODE);
