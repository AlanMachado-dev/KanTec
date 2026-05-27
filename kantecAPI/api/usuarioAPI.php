<?php
require_once 'db.php';

class usuarioAPI {
    private PDO $db;

    public function __construct() {
        $this->db = (new Database())->getConnection();
    }

    // GET http://localhost/kantecAPI/api/usuarios
    public function getAll(): void {
        $stmt = $this->db->query("SELECT * FROM usuario");
        respond(200, $stmt->fetchAll());
    }

    // GET http://localhost/kantecAPI/api/usuarios/itsmafiu
    public function getOne(string $alias): void {
        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ?");
        $stmt->execute([$alias]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user === false || empty($user)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        respond(200, $user);
    }

    // POST http://localhost/kantecAPI/api/usuarios
    public function create(): void {
        $body = json_decode(file_get_contents("php://input"), true);

        if (empty($body['alias']) || empty($body['nombre']) || empty($body['password']) || empty($body['email']) || empty($body['imagen'])) {
            respond(400, ["error" => "todos los campos son requeridos"]);
        }

        $stmt = $this->db->prepare(
            "INSERT INTO usuario (alias, nombre, password, email, imagen) VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([$body['alias'], $body['nombre'], $body['password'], $body['email'], $body['imagen']]);

        respond(201, [
            "mensaje" => "Usuario creado",
            "id"      => $this->db->lastInsertId()
        ]);
    }

    // PUT http://localhost/kantecAPI/api/usuarios/lewan500
    public function update(string $id): void {
        $body = json_decode(file_get_contents("php://input"), true);

        if (!$body) {
            respond(400, ["error" => "Body inválido o vacío"]);
        }

        $stmt = $this->db->prepare(
            "UPDATE usuario SET nombre = ?, email = ?, imagen = ? WHERE alias = ?"
        );
        $stmt->execute([$body['nombre'], $body['email'], $body['imagen'], $id]);

        if ($stmt->rowCount() === 0) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        respond(200, ["mensaje" => "Usuario actualizado"]);
    }

    // DELETE http://localhost/kantecAPI/api/usuarios/ElPro123
    public function delete(string $id): void {
        $stmt = $this->db->prepare("DELETE FROM usuario WHERE alias = ?");
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        respond(200, ["mensaje" => "Usuario eliminado"]);
    }
}

?>