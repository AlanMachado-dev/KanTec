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
        $sql = "SELECT 
                    t.idTarea,
                    t.idTablero,
                    t.nombre,
                    t.descripcion,
                    t.fechaCreacion,
                    t.fechaInicio,
                    t.fechaFinal,
                    t.posicion,
                    t.columna,
                    t.prioridad,
                    IF(COUNT(u.alias) = 0, JSON_ARRAY(), JSON_ARRAYAGG(u.alias)) AS asignaciones
                FROM 
                    tarea t
                LEFT JOIN 
                    asignacion a ON t.idTarea = a.idTarea AND t.idTablero = a.idTablero
                LEFT JOIN
                    usuario u ON a.alias = u.alias AND u.activo = TRUE
                WHERE 
                    t.idTablero = ? AND t.columna = ?
                GROUP BY 
                    t.idTarea, t.idTablero
                ORDER BY 
                    t.posicion";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idTablero, $columna]);
        
        // Recuperamos los datos
        $tareas = $stmt->fetchAll();

        // Opcional: Decodificar el JSON en PHP para que sea un array nativo y no un string
        foreach ($tareas as &$tarea) {
            if (isset($tarea['asignaciones'])) {
                $tarea['asignaciones'] = json_decode($tarea['asignaciones'], true);
            }
        }

        respond(200, $tareas);
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
            "INSERT INTO tarea (idTarea,idTablero,nombre,posicion,columna,fechaCreacion,prioridad) VALUES (?,?,?,?,?,?,4)"
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

        $nombre = $body['nombre'] ?? $tarea['nombre'];
        $descripcion = $body['descripcion'] ?? $tarea['descripcion'];
        $fechaInicio = $body['fechaInicio'] ?? $tarea['fechaInicio'];
        $fechaFinal = $body['fechaFinal'] ?? $tarea['fechaFinal'];
        $prioridad = $body['prioridad'] ?? $tarea['prioridad'];

        $stmt = $this->db->prepare(
            "UPDATE tarea SET nombre = ?, descripcion = ?, fechaInicio = ?, fechaFinal = ?, prioridad = ? WHERE idTablero = ? AND idTarea = ?"
        );
        $stmt->execute([$nombre, $descripcion, $fechaInicio, $fechaFinal, $prioridad, $idTablero, $idTarea]);
        
        respond(200, ["mensaje" => "Tarea actualizada"]);
    }

    // PUT http://localhost/kantecAPI/api/tareas/posicion/idTablero/idTarea
    public function updatePosicion(string $idTablero, string $idTarea){
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

        $columna = $body['columna'] ?? $tarea['columna'];
        $posicion = $body['posicion'] ?? $tarea['posicion'];

        $stmt = $this->db->prepare(
            "UPDATE tarea SET columna = ?, posicion = ? WHERE idTablero = ? AND idTarea = ?"
        );
        $stmt->execute([$columna, $posicion, $idTablero, $idTarea]);
        
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
