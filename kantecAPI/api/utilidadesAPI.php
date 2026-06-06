<?php

class utilidadesAPI {
    private PDO $db;

    public function __construct() {
    $this->db = (new Database())->getConnection();
    }

    function agregarTriggers(){
        
        $this->db->exec("
        CREATE TRIGGER eliminarRelacionesTablero BEFORE DELETE
        ON tablero FOR EACH ROW
        BEGIN
        DELETE FROM pertenece WHERE idTablero = OLD.id;
        DELETE FROM tarea WHERE idTablero = OLD.id;
        END
    ");

        $this->db->exec("
        CREATE TRIGGER eliminarRelacionesUsuario BEFORE DELETE
        ON usuario FOR EACH ROW
        BEGIN
        DELETE FROM tablero WHERE aliasCreador = OLD.alias;
        DELETE FROM pertenece WHERE aliasUsuario = OLD.alias;
        END
        ");

        respond(201, ['mensaje' => 'Triggers creados con exito?']);
    }
    
}