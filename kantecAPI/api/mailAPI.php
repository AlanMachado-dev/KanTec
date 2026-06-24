<?php
// Cargamos PHPMailer desde la carpeta vendor
require_once 'config/db.php';
require_once __DIR__ . '/../vendor/autoload.php';

// Importamos las clases de PHPMailer que vamos a usar
use PHPMailer\PHPMailer\PHPMailer;  // Clase principal
use PHPMailer\PHPMailer\Exception;  // Para capturar errores


class mailAPI {
    private $config; // Guardamos la config de mail.php
    private PDO $db;

    public function __construct() {
        // Al crear un Mailer, cargamos la configuración
        $this->config = require __DIR__ . '/../config/mailConfig.php';
        $this->db = (new Database())->getConnection();
        $this->db->query("SET sql_mode=''");
    }

    //////////////////////////////// FUNCIONES ////////////////////////////////

    public function send(string $to, string $subject, string $body): bool {
        // Creamos una instancia de PHPMailer
        // El "true" activa las excepciones para poder capturar errores
        $mail = new PHPMailer(true);

        try {
            // --- CONFIGURACIÓN DEL SERVIDOR ---

            $mail->isSMTP();
            // Le decimos que use SMTP (en vez del mail() nativo de PHP)

            $mail->Host = $this->config['host'];
            // Servidor SMTP, ej: smtp.gmail.com

            $mail->SMTPAuth = true;
            // Activamos autenticación (usuario + contraseña)

            $mail->Username = $this->config['username'];
            $mail->Password = $this->config['password'];
            // Credenciales para conectarse al servidor SMTP

            $mail->SMTPSecure = $this->config['encryption'];
            // Tipo de cifrado: 'tls' o 'ssl'

            $mail->Port = $this->config['port'];
            // Puerto: 587 (TLS) o 465 (SSL)


            // --- REMITENTE Y DESTINATARIO ---

            $mail->setFrom($this->config['from_email'], $this->config['from_name']);
            // Lo que el usuario verá como "De:"

            $mail->addAddress($to);
            // A quién le mandamos el mail
            // Se puede llamar varias veces para múltiples destinatarios


            // --- CONTENIDO DEL MAIL ---

            $mail->isHTML(true);
            // Le decimos que el body es HTML (no texto plano)

            $mail->CharSet = 'UTF-8';
            // Para que soporte tildes y caracteres especiales

            $mail->Subject = $subject;
            // Asunto del mail

            $mail->Body = $body;
            // Contenido HTML del mail


            // --- ENVÍO ---

            $mail->send();
            return true; // Si llegó acá, salió todo bien

        } catch (Exception $e) {
            // Si algo falló, lo guardamos en el log de PHP
            // y devolvemos false para manejarlo en la API
            error_log("Error enviando mail: {$mail->ErrorInfo}");
            return false;
        }
    }

    public function sendVerification(string $to, string $nombre, string $codigo): bool {
        $subject = 'Verificá tu cuenta - KanTec';
        $body = "
            <div style='font-family: Arial, sans-serif; max-width: 500px; margin: auto;'>
                <h2>Hola, {$nombre}</h2>
                <p>Tu código de verificación es:</p>
                <h1 style='letter-spacing: 8px; color: #4A90E2;'>{$codigo}</h1>
                <p>Este código expira en <strong>15 minutos</strong>.</p>
                <p>Si no creaste una cuenta, ignorá este mail.</p>
            </div>
        ";
        return $this->send($to, $subject, $body);
    }

    //////////////////////////////// ENDPOINTS ////////////////////////////////

    //POST http://localhost/kantecAPI/api/usuarios/codigo/enviar
    public function enviarCodigo(): void{
        $body = json_decode(file_get_contents("php://input"), true);

        // 1. Generar código aleatorio seguro de 6 dígitos
        $codigo = random_int(100000, 999999);

        // 2. Guardar en la BD: usuario + código + fecha de expiración
        $expira = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        $stmt = $this->db->prepare("SELECT * FROM verificacion WHERE alias = ?");
        $stmt->execute([$body['alias']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!($user === false || empty($user))) {
            $stmt = $this->db->prepare("DELETE FROM verificacion WHERE alias = ?");
            $stmt->execute([$body['alias']]);
        }

        $stmt = $this->db->prepare("
            INSERT INTO verificacion (alias, email, codigo, expiracion)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$body['alias'], $body['email'], $codigo, $expira]);

        // 3. Enviar mail con el código
        $mailer = new mailAPI();
        $mailEnviado = $mailer->sendVerification($body['email'], $body['nombre'], $codigo);

        respond(200, ["success" => "true", "mail" => $mailEnviado]);
    }

    //POST http://localhost/kantecAPI/api/usuarios/codigo/verificar
    public function verificarCodigo(): void{
        $body = json_decode(file_get_contents("php://input"), true);

        $stmt = $this->db->prepare("
            SELECT * FROM verificacion
            WHERE alias = ?
            AND codigo = ?
            AND expiracion > NOW()
        ");
        $stmt->execute([$body['alias'], $body['codigo']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if(!$user){
            respond(400, ["success" => "false", "error" => "Código inválido o expirado"]);
        }

        $stmt = $this->db->prepare("DELETE FROM verificacion WHERE alias = ?");
        $stmt->execute([$body['alias']]);

        $stmt = $this->db->prepare("UPDATE usuario SET verificado = 1 WHERE alias = ?");
        $stmt->execute([$body['alias']]);

        respond(200, ["success" => "true"]);

    }

    //Esta va a ser una funcion que llamara tableroAPI en agregarColaborador
    public function enviarInvitacion(): bool{
        $body = json_decode(file_get_contents("php://input"), true);
        $aliasInvitado = $body['aliasInvitado']; 
        $idTablero = $body['idTablero'];
        $tipoRelacion = $body['tipoRelacion'];
    
        $stmt = $this->db->prepare("SELECT email FROM perfil WHERE alias = ? ");
        $stmt->execute([$aliasInvitado]);
        $email = $stmt->fetchColumn();

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$idTablero]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        $rol = match($tipoRelacion){
            1 => 'Contribuidor',
            2 => 'Espectador',
            default => 'Colaborador'
        };

        $subject = 'Invitacion a tablero - Kantec';

        $body = "
        <div style='font-family: Arial, sans-serif; max-width: 500px; margin: auto;'>
            <h2>Has recibido una invitación</h2>

            <p><strong>{$tablero['aliasCreador']}</strong> te invitó al tablero:</p>

            <h3>{$tablero['titulo']}</h3>

            <p>Rol asignado: <strong>{$rol}</strong></p>

            <p>Ingresa a KanTec para aceptar o rechazar la invitación.</p>
        </div>
        ";

        return $this->send($email,$subject,$body);
    }

    public function avisarAsignacion(): bool{
        $body = json_decode(file_get_contents("php://input"), true);

        $aliasAsignado = $body['aliasAsignado']; 
        $idTablero = $body['idTablero'];
        $idTarea = $body['idTarea'];

        $stmt = $this->db->prepare("SELECT email FROM perfil WHERE alias = ? ");
        $stmt->execute([$aliasAsignado]);
        $email = $stmt->fetchColumn();

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$idTablero]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $this->db->prepare("SELECT * FROM tarea WHERE idTablero = ? and idTarea = ?");
        $stmt->execute([$idTablero, $idTarea]);
        $tarea = $stmt->fetch(PDO::FETCH_ASSOC);

        $fechaInicio = $tarea['fechaInicio'];
        $fechaFinal = $tarea['fechaFinal'];

        if($fechaInicio != "" && $fechaInicio !== $fechaFinal){ // no funciona correctamente el control
            $fecha = "<strong>{$fechaInicio}</strong> a <strong>{$fechaFinal}</strong>";
        }else if($fechaInicio === $fechaFinal){
            $fecha = "<strong>{$fechaInicio}</strong>";
        }else{
            $fecha = "<i>Sin fecha asignada</i>";
        }

        if($tarea['descripcion'] != NULL){
            $descripcion = $tarea['descripcion'];
        }else{
            $descripcion = "";
        }

        $subject = 'Nueva asignación a Tarea - Kantec';
        $body = "
        <div style='font-family: Arial, sans-serif; max-width: 500px; margin: auto;'>
            <h2>Nueva asignación de tarea</h2>

            <p>Te han asignado a una tarea en <strong>{$tablero['titulo']}</strong>:</p>

            <h3>{$tarea['nombre']}</h3>

            <p><i>{$descripcion}</i></p>

            <hr>

            <p>Fecha asignada para terminar tarea: {$fecha}</p>

            <p>Ingresa a KanTec para ver la tarea.</p>
        </div>
        ";

        return $this->send($email,$subject,$body);
    }
}

?>