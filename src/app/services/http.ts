import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, switchMap } from 'rxjs';
import { Usuario } from '../interfaces/usuario';
import { Tablero } from '../interfaces/tablero';

@Injectable({
  providedIn: 'root',
})
export class Http {

  constructor(private http: HttpClient){}

  private sesionActiva = new BehaviorSubject<boolean>(this.estaLogueado());
      //BehaviorSubject es una variable que avisa a los que estes suscritos cuando cambia de valor
  sesionActiva$ = this.sesionActiva.asObservable();
      //asObservable() expone la variable como un observable de solo lectura. el $ es convencion de que es un observable
      //los suscriptores pueden escucharlo pero no cambiarlo, solo el servicio

  //sesion//
  inicioSesion(credentials: any): Observable<any>{
    return this.http.post<Usuario>("http://localhost/kantecAPI/api/usuarios/login", credentials);
  }

  cerrarSesion(): void{
    localStorage.removeItem('token');
    this.sesionActiva.next(false); //next(bool) emite el valor de la sesion, en este caso que se cerró
  }

  //token//
  guardarToken(token: string): void{
    localStorage.setItem('token', token);
    this.sesionActiva.next(true); //le dice a los suscriptores que se inició sesion
  }

  getToken(): string | null {
    const data = localStorage.getItem('token');
    return data ? data : null;
  }

  estaLogueado(): boolean {
    return this.getToken() !== null;
  }

  getPayload(): any {
    const token = this.getToken();
    if (!token) return null;

    // El payload es la segunda parte del token, separada por "."
    const payload = token.split('.')[1];

    // Está en base64, hay que decodificarlo
    return JSON.parse(atob(payload));
  }

  getAliasDelToken(): string | null {
    const payload = this.getPayload();
    return payload ? payload.alias : null;
  }

  //usuarios//
  getUsuario(alias: string): Observable<Usuario>{
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.get<Usuario>("http://localhost/kantecAPI/api/usuarios/"+alias, {headers});
  }

  registrarUsuario(usuario: Usuario): Observable<any>{
    return this.http.post<Usuario>("http://localhost/kantecAPI/api/usuarios", usuario).pipe(
      switchMap(() => this.inicioSesion(usuario)));
  }

  existeUsuario(alias: string): Observable<any>{
    return this.http.get<Usuario>("http://localhost/kantecAPI/api/usuarios/existe/"+alias);
  }


  //imagenes//
  subirImgUsuario(archivo: File): Observable<any> {
    const formData = new FormData();

    formData.append('archivo', archivo);

    return this.http.post<any>("http://localhost/kantecAPI/api/imagenes/usuarios",formData);
  }

  subirImgTablero(archivo: File): Observable<any> {
    const formData = new FormData();

    formData.append('archivo', archivo);

    return this.http.post<any>("http://localhost/kantecAPI/api/imagenes/tableros", formData);
  }

  public getRutaBaseImg(): string{
    return "http://localhost/kantecAPI/imagenes/";
  }

  //tableros//
  getTablerosAlias(alias: string): Observable<Tablero[]>{
    return this.http.get<Tablero[]>("http://localhost/kantecAPI/api/tableros/usuario/" + alias);
  }

  crearTablero(alias: string): Observable<any>{
    return this.http.post<any>("http://localhost/kantecAPI/api/tableros", {alias: alias});
  }

  private tableroCreado = new Subject<void>();

  tableroCreado$ = this.tableroCreado.asObservable();

  notificarTableroCreado(): void {
    this.tableroCreado.next();
  }

  actualizarTablero(idTablero: number, body: any): Observable<any> { 
    return this.http.put<any>("http://localhost/kantecAPI/api/tableros/" + idTablero ,
      body
    );
  }

  borrarTablero(idTablero: number): Observable<any> {
    return this.http.delete<any>("http://localhost/kantecAPI/api/tableros/" + idTablero);
  }
  
  getTablerosColaborados(alias: string): Observable<Tablero[]>{
    return this.http.get<Tablero[]>("http://localhost/kantecAPI/api/tableros/colaborador/" + alias);
  }
}
