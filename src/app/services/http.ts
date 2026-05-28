import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { Usuario } from '../interfaces/usuario';

@Injectable({
  providedIn: 'root',
})
export class Http {

  private apiUrl = "";

  constructor(private http: HttpClient){}

  inicioSesion(credentials: any): Observable<any>{
    return this.http.post<Usuario>("http://localhost/kantecAPI/api/usuarios/login", credentials);
  }

  cerrarSesion(): void{
    localStorage.removeItem('token');
  }

  //token//
  guardarToken(token: string): void{
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    const data = localStorage.getItem('token');
    return data ? data : null;
  }

  estaLogueado(): boolean {
    return this.getToken() !== null;
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


  //imagenes//
  subirImgUsuario(archivo: File): Observable<any> {
    const formData = new FormData();

    formData.append('archivo', archivo);

    return this.http.post<any>("http://localhost/kantecAPI/api/imagenes/usuarios",formData);
  }

  public getRutaBaseImg(): String{
    return "http://localhost/kantecAPI/imagenes/";
  }
}
