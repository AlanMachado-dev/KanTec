import { Routes } from '@angular/router';
import { Carrusel } from './componentes/carrusel/carrusel';
import { Ingresar } from './componentes/ingresar/ingresar';
import { Registro } from './componentes/registro/registro';

export const routes: Routes = [
    {path : '', component: Carrusel},
    {path : 'ingresar', component: Ingresar},
    {path : 'registro', component: Registro}
    
    
];
