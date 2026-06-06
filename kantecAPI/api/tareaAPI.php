<?php
require_once 'config/db.php';

class tareaAPI
{
    private PDO $db;

    public function __construct()
    {
        $this->db = (new Database())->getConnection();
    }

    // GET http://localhost/kantecAPI/api/tareas/tablero/idTablero
    public function getTareas(string $idTablero): void
    {   
        $stmt = $this->db->prepare("SELECT * FROM tarea WHERE idTablero = ?");
        $stmt->execute([$idTablero]);
        respond(200, $stmt->fetchAll());
    }

    // GET http://localhost/kantecAPI/api/tareas/tablero/idTablero/columna
    public function getTareasColumna(string $idTablero, int $columna): void
    {   
        $stmt = $this->db->prepare("SELECT * FROM tarea WHERE idTablero = ? AND columna = ?");
        $stmt->execute([$idTablero, $columna]);
        respond(200, $stmt->fetchAll());
    }

    // GET http://localhost/kantecAPI/api/tareas/idTablero/idTarea
    public function getOne(string $idTablero, string $idTarea): void
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

        if (empty($body['idTablero'])) {
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

    // PUT http://localhost/kantecAPI/api/tareas/idTablero/idTarea
    public function update(string $idTablero, string $idTarea): void {
        $body = json_decode(file_get_contents("php://input"), true);

        if (!$body) {
            respond(400, ["error" => "Body inválido o vacío"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$idTablero]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        if(!$tablero) {
            respond (404, ["error" => "Tablero no encontrado"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM tarea WHERE idTablero = ? AND idTarea = ?");
        $stmt->execute([$idTablero, $idTarea]);
        $tarea = $stmt->fetch(PDO::FETCH_ASSOC);

        if(!$tarea) {
            respond (404, ["error" => "Tarea no encontrada"]);
        }

        $nombre = $body['nombre'] ?? $tablero['nombre'];
        $descripcion = $body['descripcion'] ?? $tablero['descripcion'];
        $fechaInicio = $body['fechaInicio'] ?? $tablero['fechaInicio'];
        $fechaFinal = $body['fechaFinal'] ?? $tablero['fechaFinal'];
        $prioridad = $body['prioridad'] ?? $tablero['prioridad'];

        $stmt = $this->db->prepare(
            "UPDATE tarea SET nombre = ?, descripcion = ?, fechaInicio = ?, fechaFinal = ?, prioridad = ? WHERE idTablero = ? AND idTarea = ?"
        );
        $stmt->execute([$nombre, $descripcion, $fechaInicio, $fechaFinal, $prioridad, $idTablero, $idTarea]);
        
        respond(200, ["mensaje" => "Tarea actualizada"]);
    }

    // DELETE http://localhost/kantecAPI/api/tareas/idTablero/idTarea
    public function delete(string $idTablero, string $idTarea): void
    {
        $stmt = $this->db->prepare("DELETE FROM tarea WHERE idTablero = ? AND idTarea = ?");
        $stmt->execute([$idTablero, $idTarea]);

        if ($stmt->rowCount() === 0) {
            respond(404, ["error" => "Tarea no encontrada"]);
        }

        respond(200, ["mensaje" => "Tarea eliminada"]);
    }
}
