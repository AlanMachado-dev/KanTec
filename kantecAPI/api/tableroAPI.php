<?php
require_once 'config/db.php';

class tableroAPI
{
    private PDO $db;

    public function __construct()
    {
        $this->db = (new Database())->getConnection();
        $this->db->query("SET sql_mode=''");  
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
}