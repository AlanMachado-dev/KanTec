import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { Http } from '../../services/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-ingresar',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './ingresar.html',
  styles: ``,
})
export class Ingresar {

  constructor(private http: Http, private _cdr: ChangeDetectorRef){}

  mostrarError = false;

  formBuilder = inject(FormBuilder);

  private router = inject(Router);

  usuarioForm = this.formBuilder.group({
    alias: ['', Validators.required],
    password: ['', Validators.required]
  })

  onSubmit(){
    this.mostrarError = false;
    if(this.usuarioForm.valid){
      this.http.inicioSesion(this.usuarioForm.value as any).subscribe({
        next: (response) => {
          console.log(response);
          this.http.guardarToken(response.token);
          setTimeout(() => { //deberia agregar un sweetAlert (#sponsor) mientras carga y no un timeout
            this.router.navigate(['/home']);
          }, 1000);
          
          // this.usuarioForm.reset();
          // this.mostrarError = false;
          // this._cdr.detectChanges();
        },

        error: (err) => {
          console.log(err);
          console.log("Usuario o contraseña incorrecta!");
          this.mostrarError = true;
          this._cdr.detectChanges();
        }
      })
    }
  }
}
