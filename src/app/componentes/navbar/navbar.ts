import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { Http } from '../../services/http';
import { Usuario } from '../../interfaces/usuario';
import { Subscription } from 'rxjs';
import { Invitacion } from '../../interfaces/invitacion';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styles: ``,
})
export class Navbar implements OnInit, OnDestroy{

  usuario: Usuario | null = null;
  imagenUsu: string | null = null;
  misInvitaciones: Invitacion[] = [];
  estaLogueado = false;
  private subLogueado: Subscription = new Subscription();
  private subPerfilMod: Subscription = new Subscription(); 
  private router = inject(Router);

  constructor(private http: Http, private _cdr: ChangeDetectorRef) {}

  ngOnInit(): void { //el codigo dentro corre cuando se crea el componente
  
    this.subLogueado = this.http.sesionActiva$.subscribe(logueado => { 
      //se suscribe al Observable, cada vez que cambie la variable de sesionActiva se ejecuta el codigo
      this.estaLogueado = logueado;

      if(logueado){
        this.cargarUsuario();
      }else{
        this.usuario = null;
        this.imagenUsu = null;
      }
    })

    this.subPerfilMod = this.http.perfilModificado$.subscribe(() => {
      this.cargarUsuario();
    })
  }

  ngOnDestroy(): void { //el codigo dentro corre cuando se destruye el componente (mas para evitar memory leaks)
    this.subLogueado.unsubscribe();
  }

  cargarUsuario(){
    const alias = this.http.getAliasDelToken();
    if (!alias) return;

    this.http.getUsuario(alias).subscribe({
      next: (response) => {
        this.usuario = response;
        this.imagenUsu = this.http.getRutaBaseImg() + this.usuario.imagen;
        this._cdr.detectChanges();
      },
      error: (err) => {
        this.http.cerrarSesion();
        this.router.navigate(['/ingreso'], {state: {expirado: "true"}});
      }
    })
  }

  cerrarSesion(){
    this.http.cerrarSesion();
    this.router.navigate(['/']);
  }
  crearTablero(): void {
    const aliasUsuario = this.http.getAliasDelToken() || "";
    this.http.crearTablero(aliasUsuario).subscribe({
      next: () => {
          this.http.notificarTableroCreado();
          this.router.navigate(['/home']); 
      }
    });
  }

  verPerfil(){
    this.router.navigate(['/perfil', this.usuario?.alias]);
  }
  cargarInvitaciones(){
    this.http.getInvitaciones(this.http.getAliasDelToken() || "").subscribe({
      next: (invitaciones) => {
        this.misInvitaciones = invitaciones;
        this._cdr.detectChanges();
      }
    })
  }

  contestarInvitacion(idTablero: string,acepto: number){
    this.http.contestarInvitacion(this.http.getAliasDelToken() || "", idTablero,acepto)
    .subscribe({
      next: () => {
        this.cargarInvitaciones();
        this.http.notificarTableroAceptado();
      }
    });
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = this.imagenUsu = this.http.getRutaBaseImg() + "usuarios/default.jpg";
  }
}
