import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Usuario } from '../../interfaces/usuario';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-perfil',
  imports: [],
  templateUrl: './perfil.html',
  styles: [':host { display: block; width: 100%; }'],
})
export class Perfil implements OnInit, OnDestroy{
  
  usuario: Usuario | null = null;
  imagenUsu: string | null = null;
  usuPropio: boolean = false;


  constructor(private http: Http, private router: Router, private ruta: ActivatedRoute, private _cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if(!this.http.estaLogueado()){
      this.router.navigate(['/ingreso']);
    }else{
      // const alias = this.http.getAliasDelToken();
      const alias = this.ruta.snapshot.paramMap.get('alias');
      if(!alias) return;

      this.http.getUsuario(alias).subscribe({
        next: (response) => {
          this.usuario = response;
          this.imagenUsu = this.http.getRutaBaseImg() + this.usuario.imagen;
          if(this.http.getAliasDelToken() === alias){
            this.usuPropio = true;
          }
          this._cdr.detectChanges();
        },
        error: (err) => {
          console.log(err);
        }
      })
    }
  }

  ngOnDestroy(): void {
    this.usuario = null;
    this.imagenUsu = null;
    this.usuPropio = false;
  }
}
