import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, switchMap } from 'rxjs';
import { Usuario } from '../interfaces/usuario';
import { TableroInterfaz } from '../interfaces/tablero';
import { Colaborador } from '../interfaces/colaborador';
import { Tarea } from '../interfaces/tarea';
import { Invitacion } from '../interfaces/invitacion';

@Injectable({
  providedIn: 'root',
})
export class Http {

  constructor(private http: HttpClient) { }

  private sesionActiva = new BehaviorSubject<boolean>(this.estaLogueado());
  //BehaviorSubject es una variable que avisa a los que estes suscritos cuando cambia de valor
  sesionActiva$ = this.sesionActiva.asObservable();
  //asObservable() expone la variable como un observable de solo lectura. el $ es convencion de que es un observable
  //los suscriptores pueden escucharlo pero no cambiarlo, solo el servicio

  //sesion//
  inicioSesion(credentials: any): Observable<any> {
    return this.http.post<Usuario>("http://localhost/kantecAPI/api/usuarios/login", credentials);
  }

  cerrarSesion(): void {
    localStorage.removeItem('token');
    this.sesionActiva.next(false); //next(bool) emite el valor de la sesion, en este caso que se cerró
  }

  //token//
  guardarToken(token: string): void {
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

  verificarToken(): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.get<any>("http://localhost/kantecAPI/api/utilidad/token", {headers});
  }

  //usuarios//
  getUsuario(alias: string): Observable<Usuario> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.get<Usuario>("http://localhost/kantecAPI/api/usuarios/" + alias, { headers });
  }

  registrarUsuario(usuario: Usuario): Observable<any> {
    return this.http.post<Usuario>("http://localhost/kantecAPI/api/usuarios", usuario).pipe(
      switchMap(() => this.inicioSesion(usuario)));
  }

  existeUsuario(alias: string): Observable<any> {
    return this.http.get<Usuario>("http://localhost/kantecAPI/api/usuarios/existe/" + alias);
  }

  existeEmail(email: string): Observable<any> {
    return this.http.get<Usuario>("http://localhost/kantecAPI/api/usuarios/existeEmail/" + email);
  }


  actualizarUsuario(alias: string, body: any): Observable<any> {
    return this.http.put<any>("http://localhost/kantecAPI/api/usuarios/" + alias,
      body
    );
  }

  borrarUsuario(alias: string): Observable<any> {
    return this.http.delete<any>("http://localhost/kantecAPI/api/usuarios/" + alias);
  }

  private perfilModificado = new Subject<void>();
  perfilModificado$ = this.perfilModificado.asObservable();

  notificarPerfilModificado(): void {
    this.perfilModificado.next();
  }

  //imagenes//
  subirImgUsuario(archivo: File): Observable<any> {
    const formData = new FormData();

    formData.append('archivo', archivo);

    return this.http.post<any>("http://localhost/kantecAPI/api/imagenes/usuarios", formData);
  }

  subirImgTablero(archivo: File): Observable<any> {
    const formData = new FormData();

    formData.append('archivo', archivo);

    return this.http.post<any>("http://localhost/kantecAPI/api/imagenes/tableros", formData);
  }

  public getRutaBaseImg(): string {
    return "http://localhost/kantecAPI/imagenes/";
  }

  //tableros//
  getTablerosAlias(alias: string): Observable<TableroInterfaz[]>{
    return this.http.get<TableroInterfaz[]>("http://localhost/kantecAPI/api/tableros/usuario/" + alias);
  }

  crearTablero(alias: string): Observable<any>{
    return this.http.post<any>("http://localhost/kantecAPI/api/tableros", {alias: alias});
  }

  getTablero(idTablero: string): Observable<TableroInterfaz>{
    return this.http.get<TableroInterfaz>("http://localhost/kantecAPI/api/tableros/" + idTablero);
  }

  private tableroCreado = new Subject<void>();
  private tableroAceptado = new Subject<void>();


  tableroCreado$ = this.tableroCreado.asObservable();
  tableroAceptado$ = this.tableroAceptado.asObservable();


  notificarTableroCreado(): void {
    this.tableroCreado.next();
  }
  notificarTableroAceptado(): void {
    this.tableroAceptado.next();
  }

  actualizarTablero(idTablero: string, body: any): Observable<any> {
    return this.http.put<any>("http://localhost/kantecAPI/api/tableros/" + idTablero,
      body
    );
  }

  borrarTablero(idTablero: string): Observable<any> {
    return this.http.delete<any>("http://localhost/kantecAPI/api/tableros/" + idTablero);
  }
  
  //colaboraciones//

  getTablerosColaborados(alias: string): Observable<TableroInterfaz[]>{
    return this.http.get<TableroInterfaz[]>("http://localhost/kantecAPI/api/colaboradores/misColaboraciones/" + alias);
  }

  getColaboradoresDeTablero(idTablero: string): Observable<Colaborador[]> {
    return this.http.get<Colaborador[]>("http://localhost/kantecAPI/api/colaboradores/" + idTablero);
  }
  getInvitaciones(alias: string): Observable<Invitacion[]> {
    return this.http.get<Invitacion[]>("http://localhost/kantecAPI/api/colaboradores/invitaciones/" + alias);
  }

  contestarInvitacion(aliasUsuario: string, idTablero: string, acepto: number): Observable<any> {
    return this.http.put<any>("http://localhost/kantecAPI/api/colaboradores/invitacion/", { aliasUsuario: aliasUsuario, idTablero: idTablero, acepto: acepto });
  }

  invitarColaborador(idTablero: string, body: any): Observable<any> {
    return this.http.post<any>("http://localhost/kantecAPI/api/colaboradores/invitar", {idTablero: idTablero, tipoRelacion: body.tipoRelacion, aliasUsuario: body.aliasUsuario});
  }

  //tarea//
  crearTarea(idTablero: string, columna: number, posicion: number): Observable<any>{
    return this.http.post<any>("http://localhost/kantecAPI/api/tareas", {
      "idTablero": idTablero,
      "posicion": posicion + 1,
      "columna": columna
    });
  }

  getTareasTablero(idTablero: string): Observable<Tarea[]> {
    return this.http.get<Tarea[]>("http://localhost/kantecAPI/api/tareas/tablero/" + idTablero);
  }

  getTareasTableroColumna(idTablero: string, columna: number): Observable<Tarea[]> {
    return this.http.get<Tarea[]>("http://localhost/kantecAPI/api/tareas/tablero/" + idTablero + "/" + columna);
  }

  actualizarTarea(idTablero: string, idTarea: number, body: any){
    return this.http.put<any>(`http://localhost/kantecAPI/api/tareas/${idTablero}/${idTarea}`, body);
  }

  actualizarPosicionTarea(idTablero: string, idTarea: number, columna: number, posicion: number): Observable<any>{
    return this.http.put<any>("http://localhost/kantecAPI/api/tareas/posicion/" + idTablero + "/" + idTarea, {
      "columna": columna,
      "posicion": posicion
    });
  }

  borrarTarea(idTablero: string, idTarea: number): Observable<any>{
    return this.http.delete<any>(`http://localhost/kantecAPI/api/tareas/${idTablero}/${idTarea}`);
  }
}
