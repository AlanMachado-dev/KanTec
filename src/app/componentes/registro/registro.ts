import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from "@angular/router";
import { Http } from '../../services/http';

@Component({
  selector: 'app-registro',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './registro.html',
  styles: ``,
})
export class Registro {

  constructor(private http: Http, private _cdr: ChangeDetectorRef) { }

  imagenSeleccionada!: File;
  formBuilder = inject(FormBuilder);
  private router = inject(Router);

  mostrarError = false;
  loading = false;

  registroForm = this.formBuilder.group({
    alias: ['', {
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30)
      ]
    }],
    password: ['', {
      validators: [
        Validators.required,
        Validators.minLength(8)
      ]
    }],
    email: ['', {
      validators: [
        Validators.required,
        Validators.maxLength(60)
      ]
    }],
    nombre: ['', {
      validators: [
        Validators.required,
        Validators.maxLength(50)
      ]
    }],
    imagen: ['',]
  })

  onFileSelected(event: any) {
    this.imagenSeleccionada = event.target.files[0];
  }

  onSubmit() {
    if (this.registroForm.valid) {
      this.loading = true;
      this.mostrarError = false;
      const usuario = this.registroForm.value as any;
      console.log("estoy en el onSubmit"); //TEMP
      this.http.existeUsuario(this.registroForm.value.alias as any).subscribe({
        next: (response) => {
          if (response.existe == "true") {
            this.mostrarError = true;
            this.loading = false;
            this._cdr.detectChanges();
          } else {
            this.http.subirImgUsuario(this.imagenSeleccionada).subscribe({
              next: (respuestaImg) => {
                usuario.imagen = respuestaImg.ruta;
                this.http.registrarUsuario(usuario).subscribe({
                  next: (response) => {
                    console.log(response);

                    this.http.guardarToken(response.token);
                    this.loading = false;
                    setTimeout(() => { //deberia agregar un sweetAlert (#sponsor) mientras carga y no un timeout
                      this.router.navigate(['/home']);
                    }, 1000);
                  },
                  error: (err) => {
                    console.log(err);
                    this.loading = false;
                    this._cdr.detectChanges();
                  }

                })
              },
              error: (err) => {
                console.log(err);
                this.loading = false;
                this._cdr.detectChanges();
              }
            })
          }

        },
        error: (err) => {
          console.log(err);
          this.loading = false;
        }
      });
    }
  }
}
