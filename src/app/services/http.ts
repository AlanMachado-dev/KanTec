import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, retry, Subject, switchMap } from 'rxjs';
import { Usuario } from '../interfaces/usuario';
import { TableroInterfaz } from '../interfaces/tablero';
import { Colaborador } from '../interfaces/colaborador';
import { Tarea } from '../interfaces/tarea';
import { Invitacion } from '../interfaces/invitacion';
import { environment } from '../../environments/environment';
import { Asignacion } from '../interfaces/asignacion';

@Injectable({
  providedIn: 'root',
})
export class Http {

  constructor(private http: HttpClient) { }

  private url: string = environment.apiUrl;

  private sesionActiva = new BehaviorSubject<boolean>(this.estaLogueado());
  //BehaviorSubject es una variable que avisa a los que estes suscritos cuando cambia de valor
  sesionActiva$ = this.sesionActiva.asObservable();
  //asObservable() expone la variable como un observable de solo lectura. el $ es convencion de que es un observable
  //los suscriptores pueden escucharlo pero no cambiarlo, solo el servicio

  //sesion//
  inicioSesion(credentials: any): Observable<any> {
    return this.http.post<Usuario>(this.url + "usuarios/login", credentials);
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
    return this.http.get<any>(this.url + "utilidad/token", { headers });
  }

  //usuarios//
  getUsuario(alias: string): Observable<Usuario> {
    // const headers = new HttpHeaders({
    //   'Authorization': 'Bearer ' + this.getToken()
    // });
    // return this.http.get<Usuario>(`${this.url}usuarios/${alias}`, { headers });
    return this.http.get<Usuario>(`${this.url}usuarios/${alias}`);
  }

  registrarUsuario(usuario: Usuario): Observable<any> {
    return this.http.post<Usuario>(this.url + "usuarios", usuario).pipe(
      switchMap(() => this.inicioSesion(usuario)));
  }

  existeUsuario(alias: string): Observable<any> {
    return this.http.get<Usuario>(`${this.url}usuarios/existe/${alias}`);
  }

  existeEmail(email: string): Observable<any> {
    return this.http.get<Usuario>(`${this.url}usuarios/existeEmail/${email}`);
  }


  actualizarUsuario(alias: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.url}usuarios/${alias}`,
      body
    );
  }

  borrarUsuario(alias: string): Observable<any> {
    return this.http.delete<any>(`${this.url}usuarios/${alias}`);
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

    return this.http.post<any>(this.url + "imagenes/usuarios", formData);
  }

  subirImgTablero(archivo: File): Observable<any> {
    const formData = new FormData();

    formData.append('archivo', archivo);

    return this.http.post<any>(this.url + "imagenes/tableros", formData);
  }

  public getRutaBaseImg(): string {
    return "http://localhost/kantecAPI/imagenes/";
  }

  //tableros//
  getTablerosAlias(alias: string): Observable<TableroInterfaz[]>{
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.get<TableroInterfaz[]>(`${this.url}tableros/usuario/${alias}`, { headers });
    // return this.http.get<TableroInterfaz[]>(`http://localhost/kantecAPI/api/tableros/usuario/${alias}`);

  }


  crearTablero(alias: string): Observable<any>{
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.post<any>(this.url+"tableros", {alias: alias},{headers});
  }

  getTablero(idTablero: string): Observable<TableroInterfaz>{
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.get<TableroInterfaz>(`${this.url}tableros/${idTablero}`,{headers});
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
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.put<any>(`${this.url}tableros/${idTablero}`,
      body,{headers}
    );
  }

  borrarTablero(idTablero: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.delete<any>(`${this.url}tableros/${idTablero}` , {headers});
  }

  //colaboraciones//

  getTablerosColaborados(alias: string): Observable<TableroInterfaz[]>{
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.get<TableroInterfaz[]>(`${this.url}colaboradores/misColaboraciones/${alias}`,{headers});
  }

  getColaboradoresDeTablero(idTablero: string): Observable<Colaborador[]> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.get<Colaborador[]>(`${this.url}colaboradores/tablero/${idTablero}`,{headers});
  }
  getInvitaciones(alias: string): Observable<Invitacion[]> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.get<Invitacion[]>(`${this.url}colaboradores/invitaciones/${alias}`,{headers});
  }

  contestarInvitacion(aliasUsuario: string, idTablero: string, acepto: number): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.put<any>(this.url+"colaboradores/invitacion/", { aliasUsuario: aliasUsuario, idTablero: idTablero, acepto: acepto },{headers});
  }

  invitarColaborador(idTablero: string, body: any): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.post<any>(this.url+"colaboradores/invitar", {idTablero: idTablero, tipoRelacion: body.tipoRelacion, aliasUsuario: body.aliasUsuario},{headers});
  }

  eliminarMiembro(idTablero: string, aliasUsuario: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.delete<any>(this.url+"colaboradores/miembro",{ headers,body:{idTablero: idTablero, aliasUsuario: aliasUsuario}});
  }

  modificarPermisos(idTablero: string, aliasUsuario: string, tipoRelacion: number): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': 'Bearer ' + this.getToken()
    });
    return this.http.put<any>(this.url + "colaboradores/permisos", { idTablero: idTablero, aliasUsuario: aliasUsuario , tipoRelacion: tipoRelacion},{headers});
  }
  //tarea//
  crearTarea(idTablero: string, columna: number, posicion: number): Observable<any> {
    return this.http.post<any>(this.url + "tareas", {
      "idTablero": idTablero,
      "posicion": posicion + 1,
      "columna": columna
    });
  }

  getTareasTablero(idTablero: string): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(`${this.url}tareas/tablero/${idTablero}`);
  }

  getTareasTableroColumna(idTablero: string, columna: number): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(`${this.url}tareas/tablero/${idTablero}/${columna}`);
  }

  actualizarTarea(idTablero: string, idTarea: number, body: any) {
    return this.http.put<any>(`${this.url}tareas/${idTablero}/${idTarea}`, body);
  }

  actualizarPosicionTarea(idTablero: string, idTarea: number, columna: number, posicion: number): Observable<any> {
    return this.http.put<any>(`${this.url}tareas/posicion/${idTablero}/${idTarea}`, {
      "columna": columna,
      "posicion": posicion
    });
  }

  borrarTarea(idTablero: string, idTarea: number): Observable<any> {
    return this.http.delete<any>(`${this.url}tareas/${idTablero}/${idTarea}`);
  }


  //asignacion//

  postAsignacion(idTablero: string, idTarea: number, alias: string): Observable<any> {
    return this.http.post<any>(this.url + "asignacion", {
      "idTablero": idTablero,
      "idTarea": idTarea,
      "alias": alias
    });
  }

  getColaboradoresPorTarea(idTablero: string, idTarea: number): Observable<any> {
    return this.http.get<Colaborador[]>(this.url + "asignacion"+"/"+idTablero+"/"+idTarea);
  }

  deleteAsignacion(idTablero: string, idTarea: number, alias: string): Observable<any> {
    return this.http.delete<any>(this.url + "asignacion", {
      body:
      {
        "idTablero": idTablero,
        "idTarea": idTarea,
        "alias": alias
      }
    });
  }

}
