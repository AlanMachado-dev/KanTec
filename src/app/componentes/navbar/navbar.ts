import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { Http } from '../../services/http';
import { Usuario } from '../../interfaces/usuario';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styles: ``,
})
export class Navbar implements OnInit, OnDestroy{

  usuario: Usuario | null = null;
  imagenUsu: string | null = null;
  estaLogueado = false;
  private sub: Subscription = new Subscription(); 
  private router = inject(Router);

  constructor(private http: Http) {}

  ngOnInit(): void { //el codigo dentro corre cuando se crea el componente
    this.sub = this.http.sesionActiva$.subscribe(logueado => { 
      //se suscribe al Observable, cada vez que cambie la variable de sesionActiva se ejecuta el codigo
      this.estaLogueado = logueado;

      if(logueado){
        this.cargarUsuario();
      }else{
        this.usuario = null;
        this.imagenUsu = null;
      }
    })
  }

  ngOnDestroy(): void { //el codigo dentro corre cuando se destruye el componente (mas para evitar memory leaks)
    this.sub.unsubscribe();
  }

  cargarUsuario(){
    const alias = this.http.getAliasDelToken();
    if (!alias) return;

    this.http.getUsuario(alias).subscribe({
      next: (response) => {
        this.usuario = response;
        if(!this.usuario.imagen){ //no tiene imagen
          this.imagenUsu = this.http.getRutaBaseImg() + "usuarios/default.jpg";
        }else{
          this.imagenUsu = this.http.getRutaBaseImg() + this.usuario.imagen;
        }
      },
      error: (err) => console.log(err)
    })
  }

  cerrarSesion(){
    this.http.cerrarSesion();
    this.router.navigate(['']);
  }
  crearTablero(): void {
    const aliasUsuario = this.http.getAliasDelToken() || "";
    this.http.crearTablero(aliasUsuario).subscribe({
      next: () => {
          this.http.notificarTableroCreado();
          this.router.navigate(['/home']); //Lo mando a home o lo mando dentro del componente tablero con ese id?
      }
    });
  }
}
