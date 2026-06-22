<?php
require_once 'config/db.php';
require_once 'mailAPI.php';

class tableroAPI
{
    private PDO $db;
    private mailAPI $mailer;

    public function __construct()
    {
        $this->db = (new Database())->getConnection();
        $this->db->query("SET sql_mode=''");    
        $this->mailer = new mailAPI();
    }

    // GET http://localhost/kantecAPI/api/tableros/usuario/Luqui86
    public function getTableros(string $alias): void
    {
        $token = verificarToken();

        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ? AND activo = true");
        $stmt->execute([$alias]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user === false || empty($user)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        if ($alias != $token['alias']) {
            respond(403, ["error" => "No puedes consultar los tableros de otro usuario."]);
        }

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE aliasCreador = ? ORDER BY fechaCreacion");
        $stmt->execute([$alias]);
        respond(200, $stmt->fetchAll());
    }

    // GET http://localhost/kantecAPI/api/tableros/id
    public function getOne(string $id): void
    {
        $token = verificarToken();

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$id]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tablero === false || empty($tablero)) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }
        $alias = $token['alias'];
        $stmt = $this->db->prepare("SELECT * FROM pertenece WHERE aliasUsuario = ? AND idTablero = ?");
        $stmt->execute([$alias, $id]);

        $colaboracionSolicitante = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$colaboracionSolicitante) {
            respond(403, ["error" => "No tiene permisos para consultar este tablero"]);
        }


        respond(200, $tablero);
    }

    // POST http://localhost/kantecAPI/api/tableros
    public function create(): void
    {
        $body = json_decode(file_get_contents("php://input"), true);

        $token = verificarToken();

        if (empty($body['alias'])) {
            respond(400, ["error" => "Todos los campos son requeridos"]);
        }
        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ? AND activo = true");
        $stmt->execute([$body['alias']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user === false || empty($user)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        if ($body['alias'] != $token['alias']) {
            respond(403, ["error" => "No puedes crear un tablero en nombre de otro usuario."]);
        }

        date_default_timezone_set('America/Montevideo');
        $fechaActual = date('Y-m-d H:i:s');

        $stmt = $this->db->prepare(
            "INSERT INTO tablero (id,titulo,aliasCreador, fechaCreacion,color) VALUES (?,?,?,?,?)"
        );

        $colores = [
            "#3498DB",
            "#E74C3C",
            "#2ECC71",
            "#F1C40F",
            "#9B59B6"
        ];
        $color = $colores[array_rand($colores)];

        $uuid = $this->db->query(
            "SELECT uuid()"
        )->fetchColumn();

        $stmt->execute([$uuid, 'Titulo', $body['alias'], $fechaActual, $color]);

        //Si llego hasta aca se pudo crear el tablero por lo que agregare en pertenece que este usuario es el creador de este tablero

        $stmt = $this->db->prepare("INSERT INTO pertenece VALUES (?,?,0)");
        $stmt->execute([$uuid, $body["alias"]]);

        //Probablemente podria hacerlo con un trigger pero me parece una mountain

        respond(201, [
            "mensaje" => "Tablero creado"
        ]);
    }

    // PUT http://localhost/kantecAPI/api/tableros/1
    public function update(string $id): void
    {
        $body = json_decode(file_get_contents("php://input"), true);

        $token = verificarToken();

        if (!$body) {
            respond(400, ["error" => "Body inválido o vacío"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$id]);

        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$tablero) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        $alias = $token['alias'];
        $stmt = $this->db->prepare("SELECT * FROM pertenece WHERE aliasUsuario = ? AND idTablero = ?");
        $stmt->execute([$alias, $id]);

        $colaboracionSolicitante = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$colaboracionSolicitante || (int)$colaboracionSolicitante['tipoRelacion'] != (int)0) {
            respond(403, ["error" => "No tiene permisos para editar este tablero"]);
        }

        //Cambio para que se pueda actualizar el tablero sin necesidad de actualizar todas las cosas del tablero
        $titulo = $body['titulo'] ?? $tablero['titulo'];
        $descripcion = $body['descripcion'] ?? $tablero['descripcion'];
        $imagen = $body['imagen'] ?? $tablero['imagen'];
        $color = $body['color'] ?? $tablero['color'];

        $stmt = $this->db->prepare(
            "UPDATE tablero SET titulo = ?, descripcion = ?, imagen = ?, color = ? WHERE id = ?"
        );
        $stmt->execute([$titulo, $descripcion, $imagen, $color, $id]);

        respond(200, ["mensaje" => "Tablero actualizado"]);
    }

    // DELETE http://localhost/kantecAPI/api/tableros/1
    public function delete(string $id): void
    {
        $token = verificarToken();

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$id]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tablero === false || empty($tablero)) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        $alias = $token['alias'];
        $stmt = $this->db->prepare("SELECT * FROM pertenece WHERE aliasUsuario = ? AND idTablero = ?");
        $stmt->execute([$alias, $id]);

        $colaboracionSolicitante = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$colaboracionSolicitante || (int)$colaboracionSolicitante['tipoRelacion'] != (int)0) {
            respond(403, ["error" => "No tiene permisos para borrar este tablero"]);
        }

        $stmt = $this->db->prepare("DELETE FROM tablero WHERE id = ?");
        $stmt->execute([$id]);

        respond(200, ["mensaje" => "Tablero eliminado"]);
    }

    // GET http://localhost/kantecAPI/api/colaboradores/misColaboraciones/alias
    public function misColaboraciones(string $alias): void
    {
        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ? AND activo = true");
        $stmt->execute([$alias]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user === false || empty($user)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        $token = verificarToken();

        if ($token['alias'] != $alias) {
            respond(403, ["error" => "No puedes ver las colaboraciones que no son tuyas"]);
        }

        $stmt = $this->db->prepare("SELECT * from tablero t JOIN usuario u ON t.aliasCreador = u.alias where u.activo = true AND id IN (SELECT p.idTablero from 
pertenece p JOIN usuario u ON p.aliasUsuario = u.alias where aliasUsuario = ? AND tipoRelacion != 0)");
        $stmt->execute([$alias]);

        respond(200, $stmt->fetchAll());
    }

    // GET http://localhost/kantecAPI/api/colaboradores/idTablero
    public function colaboradoresTablero(string $id): void
    {
        $token = verificarToken();

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$id]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tablero === false || empty($tablero)) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        $alias = $token['alias'];
        $stmt = $this->db->prepare("SELECT * FROM pertenece WHERE aliasUsuario = ? AND idTablero = ?");
        $stmt->execute([$alias, $id]);

        $colaboracionSolicitante = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$colaboracionSolicitante) {
            respond(403, ["error" => "No tiene permisos para consultar colaboradores de este tablero"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE activo = true AND alias = (SELECT aliasCreador FROM tablero WHERE id = ?)");
        $stmt->execute([$id]);
        $creadorActivo = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($creadorActivo === false || empty($creadorActivo)) {
            respond(403, ["error" => "Tablero no tiene a su creador activo."]);
        }

        $stmt = $this->db->prepare("SELECT p.aliasUsuario, p.tipoRelacion, pe.imagen from pertenece p JOIN perfil pe JOIN usuario u 
        ON pe.alias = p.aliasUsuario AND u.alias = p.aliasUsuario where p.idTablero = ? AND u.activo = true;");
        $stmt->execute([$id]);

        respond(200, $stmt->fetchAll());
    }

    // POST http://localhost/kantecAPI/api/colaboradores/invitar
    public function agregarColaborador(): void
    {
        $body = json_decode(file_get_contents("php://input"), true);

        $token = verificarToken();

        if (!isset($body['idTablero']) || !isset($body['aliasUsuario']) || !isset($body['tipoRelacion'])) {
            respond(400, ["error" => "Todos los campos son requeridos"]);
        }

        if ($body['tipoRelacion'] != 1 && $body['tipoRelacion'] != 2) {
            respond(400, ['error' => 'Tipo de relación inválido']);
        }

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$body['idTablero']]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tablero === false || empty($tablero)) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ? AND activo = true");
        $stmt->execute([$body['aliasUsuario']]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($usuario === false || empty($usuario)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM pertenece WHERE aliasUsuario = ? AND idTablero = ?");
        $stmt->execute([$body['aliasUsuario'], $body['idTablero']]);
        $colaboracion = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($colaboracion) {
            respond(409, ["codigo" => "YA_COLABORA", "error" => "Usuario ya colabora con este tablero"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM invitacion WHERE aliasInvitado = ? AND idTablero = ?");
        $stmt->execute([$body['aliasUsuario'], $body['idTablero']]);
        $invitacion = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($invitacion) {
            respond(409, ["codigo" => "INVITACION_PENDIENTE", "error" => "El usuario ya tiene una invitación pendiente"]);
        }

        $alias = $token['alias'];
        $stmt = $this->db->prepare("SELECT * FROM pertenece WHERE aliasUsuario = ? AND idTablero = ?");
        $stmt->execute([$alias, $body['idTablero']]);
        $colaboracionSolicitante = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$colaboracionSolicitante || (int)$colaboracionSolicitante['tipoRelacion'] != (int)0) {
            respond(403, ["error" => "No tiene permisos para modificar colaboradores de este tablero"]);
        }

        $stmt = $this->db->prepare("SELECT email FROM perfil WHERE alias = ? ");
        $stmt->execute([$body['aliasUsuario']]);
        $emailInvitado = $stmt->fetchColumn();

        if(!$emailInvitado){
            respond(404, ["error" => "Email del usuario no encontrado"]);
        }

        $stmt = $this->db->prepare("INSERT INTO invitacion (idTablero, aliasInvitado, aliasCreador, tipoRelacion, notificado) VALUES (? ,? ,? ,? , false)");
        $stmt->execute([$body['idTablero'], $body['aliasUsuario'], $tablero['aliasCreador'], $body['tipoRelacion']]);

        $mailEnviado = $this->mailer->enviarInvitacion($emailInvitado,$alias,$tablero['titulo'],$body['tipoRelacion']);

        respond(201, [
            "mensaje" => "Miembro invitado"//, "mailEnviado" => $mailEnviado
        ]);
    }

    // GET http://localhost/kantecAPI/api/colaboradores/invitaciones/alias
    public function getInvitaciones(string $alias)
    {
        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ? AND activo = true");
        $stmt->execute([$alias]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($usuario === false || empty($usuario)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        $token = verificarToken();

        if ($token['alias'] != $alias) {
            respond(403, ["error" => "No puedes ver las invitaciones que no son tuyas"]);
        }

        $stmt = $this->db->prepare("SELECT i.idTablero, i.aliasCreador, t.titulo as tituloTablero, i.tipoRelacion FROM invitacion i JOIN tablero t ON t.id = i.idTablero WHERE i.aliasInvitado = ?");
        $stmt->execute([$alias]);

        respond(200, $stmt->fetchAll());
    }

    // PUT http://localhost/kantecAPI/api/colaboradores/invitacion/
    public function aceptarInvitacion()
    {
        $body = json_decode(file_get_contents("php://input"), true);

        $token = verificarToken();

        if (!isset($body['idTablero']) || !isset($body['aliasUsuario']) || !isset($body['acepto'])) {
            respond(400, ["error" => "Todos los campos son requeridos"]);
        }
        $alias = $token['alias'];
        if ($alias != $body['aliasUsuario']) {
            respond(403, ["error" => "No puedes aceptar invitaciones de otros usuarios."]);
        }
        if ($body['acepto'] == 1) {
            $stmt = $this->db->prepare(
                "SELECT * FROM invitacion WHERE idTablero = ? AND aliasInvitado = ?"
            );
            $stmt->execute([$body['idTablero'], $body['aliasUsuario']]);

            $invitacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$invitacion) {
                respond(404, ["error" => "Invitación no encontrada"]);
            }

            $stmt = $this->db->prepare("INSERT INTO pertenece (idTablero, aliasUsuario, tipoRelacion) VALUES (?, ?, ?)");

            $stmt->execute([$invitacion['idTablero'], $invitacion['aliasInvitado'], $invitacion['tipoRelacion']]);

            $stmt = $this->db->prepare("DELETE from invitacion WHERE idTablero = ? AND aliasInvitado = ?");
            $stmt->execute([$body['idTablero'], $body['aliasUsuario']]);

            respond(200, ["mensaje" => "Se aceptó la invitación"]);
        } else {
            $stmt = $this->db->prepare(
                "SELECT * FROM invitacion WHERE idTablero = ? AND aliasInvitado = ?"
            );
            $stmt->execute([$body['idTablero'], $body['aliasUsuario']]);

            $invitacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$invitacion) {
                respond(404, ["error" => "Invitación no encontrada"]);
            }
            $stmt = $this->db->prepare("DELETE from invitacion WHERE idTablero = ? AND aliasInvitado = ?");
            $stmt->execute([$body['idTablero'], $body['aliasUsuario']]);
            respond(201, ["mensaje" => "Se rechazo la invitacion"]);
        }
    }

    // DELETE http://localhost/kantecAPI/api/colaboradores/miembro
    public function eliminarMiembro()
    {
        $body = json_decode(file_get_contents("php://input"), true);

        $token = verificarToken();

        if (!isset($body['idTablero']) || !isset($body['aliasUsuario'])) {
            respond(400, ["error" => "Todos los campos son requeridos"]);
        }
        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$body['idTablero']]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tablero === false || empty($tablero)) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ? AND activo = true");
        $stmt->execute([$body['aliasUsuario']]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($usuario === false || empty($usuario)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM pertenece WHERE aliasUsuario = ? AND idTablero = ?");
        $stmt->execute([$body['aliasUsuario'], $body['idTablero']]);
        $colaboracion = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$colaboracion) {
            respond(404, ["error" => "Usuario no colabora con este tablero"]);
        }
        if ($colaboracion['tipoRelacion'] == 0) {
            respond(400, ['error' => 'No se puede eliminar al creador del tablero']);
        }

        $alias = $token['alias'];
        $stmt = $this->db->prepare("SELECT * FROM pertenece WHERE aliasUsuario = ? AND idTablero = ?");
        $stmt->execute([$alias, $body['idTablero']]);
        $colaboracionSolicitante = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$colaboracionSolicitante || (int)$colaboracionSolicitante['tipoRelacion'] != (int)0) {
            respond(403, ["error" => "No tiene permisos para modificar colaboradores de este tablero"]);
        }

        $stmt = $this->db->prepare("DELETE from pertenece where idTablero = ? AND aliasUsuario = ?");
        $stmt->execute([$body['idTablero'], $body['aliasUsuario']]);

        respond(200, [
            "mensaje" => "Miembro eliminado del tablero"
        ]);
    }

    // PUT http://localhost/kantecAPI/api/colaboradores/permisos
    public function actualizarPermisosMiembro()
    {
        $body = json_decode(file_get_contents("php://input"), true);

        $token = verificarToken();

        if (!isset($body['idTablero']) || !isset($body['aliasUsuario']) || !isset($body['tipoRelacion'])) {
            respond(400, ["error" => "Todos los campos son requeridos"]);
        }

        $alias = $token['alias']; //Agregar control a todas las operaciones que necesiten un usuario iniciado.

        if ($body['tipoRelacion'] != 1 && $body['tipoRelacion'] != 2) {
            respond(400, ['error' => 'Tipo de relación inválido']);
        }

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$body['idTablero']]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tablero === false || empty($tablero)) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ? AND activo = true");
        $stmt->execute([$body['aliasUsuario']]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($usuario === false || empty($usuario)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM pertenece WHERE aliasUsuario = ? AND idTablero = ?");
        $stmt->execute([$body['aliasUsuario'], $body['idTablero']]);
        $colaboracion = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$colaboracion) {
            respond(404, ["error" => "Usuario no colabora con este tablero"]);
        }

        if ($colaboracion['tipoRelacion'] == 0) {
            respond(400, ['error' => 'No se puede modificar al creador del tablero']);
        }

        if ((int)$colaboracion['tipoRelacion'] == (int)$body['tipoRelacion']) {
            respond(409, ['error' => 'El usuario ya tiene ese permiso']);
            exit();
        }

        $stmt = $this->db->prepare("SELECT * FROM pertenece WHERE aliasUsuario = ? AND idTablero = ?");
        $stmt->execute([$alias, $body['idTablero']]);
        $colaboracionSolicitante = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$colaboracionSolicitante || (int)$colaboracionSolicitante['tipoRelacion'] != (int)0) {
            respond(403, ["error" => "No tiene permisos para modificar colaboradores de este tablero"]);
        }

        $stmt = $this->db->prepare("UPDATE pertenece set tipoRelacion = ? WHERE idTablero = ? AND aliasUsuario = ?");
        $stmt->execute([$body['tipoRelacion'], $body['idTablero'], $body['aliasUsuario']]);

        respond(200, [
            "mensaje" => "Permisos actualizados"
        ]);
    }

    // GET http://localhost/kantecAPI/api/colaboradores/notificaciones
    public function mostrarNotificacionPendiente(){
        $token = verificarToken();

        $alias = $token['alias'];

        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ? AND activo = true");
        $stmt->execute([$alias]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($usuario === false || empty($usuario)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM invitacion WHERE aliasInvitado = ? AND notificado = false LIMIT 1");
        $stmt->execute([$alias]);
        $tienePendientes = $stmt->fetch(PDO::FETCH_ASSOC);

        if($tienePendientes){
            respond(200, ["tieneNuevas" => true]);
        }else {
            respond (200 , ["tieneNuevas" => false]);
        }

    }
    // PUT http://localhost/kantecAPI/api/colaboradores/notificaciones
    public function marcarNotificado()
    {
        $token = verificarToken();

        $alias = $token['alias'];

        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ? AND activo = true");
        $stmt->execute([$alias]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($usuario === false || empty($usuario)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }
        $stmt = $this->db->prepare("UPDATE invitacion SET notificado = true WHERE aliasInvitado = ? AND notificado = false");
        $stmt->execute([$alias]);

        respond(200, ["Notificaciones marcadas como vistas"]);
    }
}
