<h1 align="center"> KanTec</h1>

## **Descripción del proyecto:**

La digitalización y los nuevos entornos de trabajo cambiaron mucho la forma en la que los equipos se organizan, se comunican y gestionan sus proyectos. Con el crecimiento del trabajo remoto y la necesidad de coordinar tareas de forma asincrónica, herramientas tradicionales como las planillas quedaron bastante limitadas. 

Hoy en día, muchas organizaciones utilizan metodologías ágiles basadas en la visualización del flujo de trabajo, ya que permiten organizar mejor las tareas, mejorar la comunicación entre los integrantes del equipo y hacer un seguimiento del proyecto desde cualquier lugar.

El nombre del proyecto nace de la combinación de Kanban (看板), el método de organización de equipos de trabajo en producción de productos, popularizado en Japón; y UTEC, la universidad a la que pertenecemos.

El sistema que se desarrollará será una plataforma de gestión de proyectos y tareas grupales enfocada en mejorar la productividad y el trabajo en equipo. La plataforma tendrá como objetivo principal conectar a todos los integrantes de un proyecto en un espacio de trabajo dinámico, intuitivo y fácil de usar, tomando como inspiración herramientas como Trello.

#### **Flujo de trabajo y gestión de tareas**

KanTec permitirá a los usuarios trabajar mediante tableros interactivos divididos en columnas, donde cada una representará una etapa del proyecto. Por defecto, el sistema contará con las siguientes columnas:

* **Pendiente**: tareas que todavía no comenzaron.  
* **Análisis**: tareas que se encuentran en etapa de estudio.  
* **Desarrollo**: tareas que están siendo realizadas.  
* **Hecho**: tareas finalizadas correctamente.

Dentro de cada columna, las tareas estarán representadas mediante tarjetas que simulan ser Post-its. Estas tarjetas mostrarán información importante para que el equipo pueda organizarse mejor, como los usuarios asignados, el nivel de prioridad (*Alta, Media, Baja o Mínima*) y el estado de la fecha de entrega, indicando si la tarea vence hoy, mañana, cuántos días faltan para su vencimiento, si ya está vencida o si fue completada.

#### 

#### **Control de accesos y seguridad**

Para mantener un entorno de trabajo ordenado y adaptable a distintos tipos de equipos, la plataforma contará con módulos de gestión de usuarios y de tableros. Además, existirá un sistema de permisos que permitirá a los creadores de cada tablero definir cuáles integrantes pueden crear, editar o mover tareas y cuáles solamente tendrán permisos de visualización. 

Los integrantes con permisos de crear, editar, mover tareas y asignar usuario a las tareas en el tablero se nombran como "Contribuidor" y los integrantes nombrados como "Espectador" serán los que puedan visualizar todo en el tablero, pero no podrán inferir en él de ninguna forma sobre las tareas. 

También existirá la figura del creador, el cual será el único con permisos de editar el tablero, e invitar y quitar usuarios del tablero, además de tener la capacidad de editar permisos de usuarios miembros del tablero.

## **Guia de Instalación:**

Se debe tener instalado Apache, MySQL, [Node.js](https://nodejs.org/es/download), Angular y [Composer](https://getcomposer.org/doc/00-intro.md#installation-windows). Para los primeros dos en general usamos entornos de desarrollo como [XAMPP](https://www.apachefriends.org/es/index.html), [Wampserver](https://wampserver.aviatechno.net/) o [Laragon](https://laragon.org/download), los cuales los incluyen, cualquiera sirve.

Con Node instalado corremos el siguiente comando para instalar globalmente Angular:  
**npm install \-g @angular/cli**

Encendemos Apache y MySQL desde el entorno de desarrollo.

Dentro de MySQL, ya sea desde la terminal o desde PHPMyAdmin, como usuario root crearemos el usuario que usaremos en la API. Corremos los siguientes comandos: 

* CREATE USER  'tecnologo'@'localhost' identified by 'tecnologo';  
* GRANT ALL PRIVILEGES ON \*.\* TO 'tecnologo'@'localhost';   
* FLUSH PRIVILEGES;

(el usuario y contraseña puede ser cualquiera, en esta guía usamos estos de ejemplo)

Instalamos la última versión de KanTec desde el GitHub [aquí](https://github.com/AlanMachado-dev/KanTec).

Descomprimimos el proyecto, abrimos desde la carpeta raíz la terminal y ejecutamos “npm install”. Ahora desde la carpeta kantecAPI ejecutamos “composer install”.

Dentro de kantecAPI, en el archivo config/db.php se debe setear el usuario y contraseña que creamos anteriormente, y la base de datos que queremos usar (se creará solo).  
<img width="251" height="108" alt="image16" src="https://github.com/user-attachments/assets/48276c09-d517-4f64-97d5-d98aee42193b" />

También debemos crear el archivo **mailConfig.php** dentro de kantecAPI/config para la configuración relacionada al envío de emails. Debe contener la siguiente información:  
<img width="917" height="289" alt="image17" src="https://github.com/user-attachments/assets/a35031c8-8907-4cc1-a1b4-6bbb17e56a64" /> 

Se debe generar una [contraseña de aplicación](https://support.google.com/accounts/answer/185833?hl=es-419) desde una cuenta de Gmail y colocarlas allí.

Copiamos la carpeta kantecAPI a la carpeta www/htdocs de la instalación PHP, y nos aseguramos que quede corriendo Apache (y MySQL).

En la carpeta raíz ejecutamos “*ng build*”. Esto nos generará una carpeta llamada “dist” donde copiaremos el contenido dentro de *KanTec/browser* en la carpeta raíz, junto al kantecAPI. **La API y la app web deben estar en la misma ubicación o no funcionará**.

Se debe llamar al endpoint de “Agregar Triggers” desde un cliente externo como Postman o desde el navegador, sin estos triggers pueden salir errores al borrar objetos en la base de datos.

Finalmente para entrar a la página web accedemos al índice de la app (ej: [http://localhost/index.html](http://localhost/index.html)). 

En nuestro caso instalamos todo en un servidor gestionado por CyberPanel, donde configuramos que tenga como dominio “***kantec.tec.seis***”.  
Además para poder entrar directamente a KanTec sin la necesidad de indicar en la URL “index.html” quitamos el archivo “index.php” que venía por defecto en el servidor, para luego cambiarle el nombre del archivo de la app web “index.html” a “index.php”.

Por último nosotros tuvimos que configurar los host para poder entrar al servidor desde computadoras que estén en la misma red modificando el archivo **hosts** que se encuentra en:

* C:\\Windows\\System32\\drivers\\etc\\hosts (Windows)  
* /etc/hosts (Linux)
