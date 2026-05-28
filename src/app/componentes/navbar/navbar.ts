import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";
import { Http } from '../../services/http';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styles: ``,
})
export class Navbar {

  constructor(private http: Http) {}

  get estaLogueado(): boolean{
    return this.http.estaLogueado();
  }

  cerrarSesion(){
    this.http.cerrarSesion();
  }

}
