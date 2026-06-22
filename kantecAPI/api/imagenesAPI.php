<?php
require_once 'config/db.php';

class imagenesAPI
{
    public function __construct()
    {
       
    }

    // POST http://localhost/kantecAPI/api/imagenes/usuarios
    public function subirImgUsuario(): void
    {
        $ruta = $this->subirImagen("usuarios");    

        respond(201, ['mensaje' => 'Imagen subida', 'ruta' => $ruta]);
    }
    // POST http://localhost/kantecAPI/api/imagenes/tableros
    public function subirImgTablero(): void
    {
        $ruta = $this->subirImagen("tableros");

        respond(201, ['mensaje'=>'Imagen subida', 'ruta' => $ruta]);
    }

    private function subirImagen(string $carpeta): string {
        if (!isset($_FILES['archivo'])) {
            return $carpeta . "/" . "default.jpg";
        }

        $archivo = $_FILES['archivo'];

        if ($archivo['error'] !== UPLOAD_ERR_OK) {
            respond(400, ['error' => 'Error al subir el archivo']);
        }
        $maximo = 5 * 1024 * 1024; //10MB

        if($archivo['size'] > $maximo){
            respond(400, ['error' => 'La imagen supera los 5 MB']);
        }

        $tiposPermitidos = ['image/png', 'image/jpeg'];

        if (!in_array($archivo['type'], $tiposPermitidos)) {
            respond(400, ['error' => 'Tipo de archivo inválido']);
        }

        $extension = pathinfo($archivo['name'], PATHINFO_EXTENSION);

        $nombreUnico = uniqid() . '.' . $extension;

        $directorio = "./imagenes/" . $carpeta;

        if(!is_dir($directorio)){
            mkdir($directorio, 0755 , true);
        }

        $ruta = "./imagenes/" . $carpeta . "/" . $nombreUnico;

        move_uploaded_file($archivo['tmp_name'], $ruta);

        $ruta = $carpeta . "/" . $nombreUnico;

        return $ruta;
    }

 
}
