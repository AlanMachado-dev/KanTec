<?php

class utilidadesAPI {
    private PDO $db;

    public function __construct() {
    $this->db = (new Database())->getConnection();
    }

    // GET http://localhost/kantecAPI/api/utilidad/triggers
    function agregarTriggers(){
        
        $this->db->exec("
        CREATE TRIGGER eliminarRelacionesTablero BEFORE DELETE
        ON tablero FOR EACH ROW
        BEGIN
            DELETE FROM pertenece WHERE idTablero = OLD.id;
            DELETE FROM invitacion WHERE idTablero = OLD.id;
            DELETE FROM tarea WHERE idTablero = OLD.id;
        END
    ");

        $this->db->exec("
        CREATE TRIGGER eliminarRelacionesUsuario BEFORE DELETE
        ON usuario FOR EACH ROW
        BEGIN
            DELETE FROM tablero WHERE aliasCreador = OLD.alias;
            DELETE FROM pertenece WHERE aliasUsuario = OLD.alias;
            DELETE FROM invitacion WHERE aliasInvitado = OLD.alias OR aliasCreador = OLD.alias;
        END
        ");

        respond(201, ['mensaje' => 'Triggers creados con exito?']);
    }

    // GET http://localhost/kantecAPI/api/utilidad/token
    function verificar(){
        $tokenData = verificarToken();
    }
    
}
