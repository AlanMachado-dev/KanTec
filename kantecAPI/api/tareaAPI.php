<?php
require_once 'config/db.php';

class tareaAPI
{
    private PDO $db;

    public function __construct()
    {
        $this->db = (new Database())->getConnection();
    }

    // GET http://localhost/kantecAPI/api/tarea/tablero/id
    public function getTareas(string $idTablero): void
    {   
        $stmt = $this->db->prepare("SELECT * FROM tarea WHERE idTablero = ?");
        $stmt->execute([$idTablero]);
        respond(200, $stmt->fetchAll());
    }

    // GET http://localhost/kantecAPI/api/tarea/id
    public function getOne(string $idTarea, string $idTablero): void
    {
        $stmt = $this->db->prepare("SELECT * FROM tarea WHERE idTablero = ? AND idTarea = ?");
        $stmt->execute([$idTablero, $idTarea]);
        $tarea = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tarea === false || empty($tarea)) {
            respond(404, ["error" => "Tarea no encontrado"]);
        }

        respond(200, $tarea);
    }

    // POST http://localhost/kantecAPI/api/tareas
    public function create(): void
    {
        $body = json_decode(file_get_contents("php://input"), true);

        if (empty($body['idTablero']) || empty($body['posicion']) || empty($body['columna'])) {
            respond(400, ["error" => "Todos los campos son requeridos"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$body['idTablero']]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tablero === false || empty($tablero)) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        date_default_timezone_set('America/Montevideo');
        $fechaActual = date('Y-m-d H:i:s');

        $stmt = $this->db->prepare("SELECT COUNT(*)+1 FROM tarea where idTablero = ?");
        $stmt->execute([$body['idTablero']]);
        $idTarea = $stmt->fetchColumn();
        
        $stmt = $this->db->prepare(
            "INSERT INTO tarea (idTarea,idTablero,nombre,posicion,columna,fechaCreacion) VALUES (?,?,?,?,?,?)"
        );

        $stmt->execute([$idTarea,$body['idTablero'],"Tarea",$body['posicion'],$body['columna'],$fechaActual]);

        respond(201, [
            "mensaje" => "Tarea creada"
        ]);
    }

    // PUT http://localhost/kantecAPI/api/tableros/1
    public function update(string $id): void {
        $body = json_decode(file_get_contents("php://input"), true);

        if (!$body) {
            respond(400, ["error" => "Body inválido o vacío"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$id]);

        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);


        // Si se intenta actualizar el tablero y los datos son iguales el $stmt->rowCount() === 0 va a tirar error de tablero no encontrado
        // y eso esta mal deberia simplemente decir que esta actualizado aunque no haya cambios supongo
        if(!$tablero) {
            respond (404, ["error" => "Tablero no encontrado"]);
        }

        //Cambio para que se pueda actualizar el tablero sin necesidad de actualizar todas las cosas del tablero
        $titulo = $body['titulo'] ?? $tablero['titulo'];
        $descripcion = $body['descripcion'] ?? $tablero['descripcion'];
        $imagen = $body['imagen'] ?? $tablero['imagen'];
        $color = $body['color'] ?? $tablero['color'];

        $stmt = $this->db->prepare(
            "UPDATE tablero SET titulo = ?, descripcion = ?, imagen = ?, color = ? WHERE id = ?"
        );
        $stmt->execute([$titulo, $descripcion, $imagen, $color ,$id]);
        
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
