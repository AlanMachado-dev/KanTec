import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { Usuario } from '../interfaces/usuario';

@Injectable({
  providedIn: 'root',
})
export class Http {

  private apiUrl = "";

  constructor(private http: HttpClient){}

  getUsuario(alias: string): Observable<Usuario>{
    return this.http.get<Usuario>("http://localhost/kantecAPI/api/usuarios/"+alias);
  }

  registrarUsuario(usuario: Usuario): Observable<Usuario>{
    return this.http.post<Usuario>("http://localhost/kantecAPI/api/usuarios", usuario).pipe(
      switchMap(() => this.getUsuario(usuario.alias)));
  }

  inicioSesion(usuario: Usuario): Observable<Usuario>{
    return this.http.post<Usuario>("http://localhost/kantecAPI/api/usuarios/login", usuario);
  }
}
