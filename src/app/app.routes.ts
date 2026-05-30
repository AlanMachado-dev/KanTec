import { Routes } from '@angular/router';
import { Carrusel } from './componentes/carrusel/carrusel';
import { Ingresar } from './componentes/ingresar/ingresar';
import { Registro } from './componentes/registro/registro';
import { Home } from './componentes/home/home';
import { Tablero } from './componentes/tablero/tablero';

export const routes: Routes = [
    {path : '', component: Carrusel},
    {path : 'ingreso', component: Ingresar},
    {path : 'registro', component: Registro},
    {path : 'home', component: Home},
    {path : 'tablero', component: Tablero}
    
    
];
