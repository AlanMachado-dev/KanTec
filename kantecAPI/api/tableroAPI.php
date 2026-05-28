<?php
require_once 'config/db.php';

class tableroAPI
{
    private PDO $db;

    public function __construct()
    {
        $this->db = (new Database())->getConnection();
    }

    // GET http://localhost/kantecAPI/api/tableros
    public function getAll(): void
    {
        $stmt = $this->db->query("SELECT * FROM tablero");
        respond(200, $stmt->fetchAll());
    }

    // GET http://localhost/kantecAPI/api/tablerosUsuario/Luqui86
    public function getTableros(string $alias): void
    {   
        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE aliasCreador = ?");
        $stmt->execute([$alias]);
        respond(200, $stmt->fetchAll());
    }

    // GET http://localhost/kantecAPI/api/tableros/id
    public function getOne(string $id): void
    {
        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$id]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tablero === false || empty($tablero)) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        respond(200, $tablero);
    }

    // POST http://localhost/kantecAPI/api/tableros
    public function create(): void
    {
        $body = json_decode(file_get_contents("php://input"), true);

        if (empty($body['alias'])) {
            respond(400, ["error" => "Todos los campos son requeridos"]);
        }
        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ?");
        $stmt->execute([$body['alias']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user === false || empty($user)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        date_default_timezone_set('America/Montevideo');
        $fechaActual = date('Y-m-d');

        $stmt = $this->db->prepare(
            "INSERT INTO tablero (titulo,aliasCreador, fechaCreacion) VALUES (?,?,?)"
        );
        $stmt->execute(['Titulo',$body['alias'],$fechaActual]);

        respond(201, [
            "mensaje" => "Tablero creado"
        ]);
    }

    // PUT http://localhost/kantecAPI/api/tableros/1
    public function update(string $id): void
    {
        $body = json_decode(file_get_contents("php://input"), true);

        if (!$body) {
            respond(400, ["error" => "Body inválido o vacío"]);
        }

        $stmt = $this->db->prepare(
            "UPDATE tablero SET titulo = ?, descripcion = ?, imagen = ? WHERE id = ?"
        );
        $stmt->execute([$body['titulo'], $body['descripcion'], $body['imagen'], $id]);

        if ($stmt->rowCount() === 0) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        respond(200, ["mensaje" => "Tablero actualizado"]);
    }

    // DELETE http://localhost/kantecAPI/api/tableros/1
    public function delete(string $id): void
    {
        $stmt = $this->db->prepare("DELETE FROM tablero WHERE id = ?");
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        respond(200, ["mensaje" => "Tablero eliminado"]);
    }
}
