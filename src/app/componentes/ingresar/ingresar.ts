import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from "@angular/router";
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
          console.log("Inicio sesion funciona!"); //debe reemplazarse por this.router.navigate(['/home']);
          this.usuarioForm.reset();
          this.mostrarError = false;
          this._cdr.detectChanges();
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
