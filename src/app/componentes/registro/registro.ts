import { Component, inject } from '@angular/core';
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

  constructor(private http: Http){}

  imagenSeleccionada!: File;
  formBuilder = inject(FormBuilder);
  private router = inject(Router);

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
    imagen: ['', ]
  })

  onFileSelected(event: any) {
    this.imagenSeleccionada = event.target.files[0];
  }

  onSubmit(){
    if(this.registroForm.valid){
      const usuario = this.registroForm.value as any;
      this.http.subirImgUsuario(this.imagenSeleccionada).subscribe({
        next: (respuestaImg) => {
          usuario.imagen = respuestaImg.ruta;
          this.http.registrarUsuario(usuario).subscribe({
            next: (response) => {
              console.log(response);

              this.http.guardarToken(response.token);

              console.log("Registro funciona!");

              this.router.navigate(['/home']);
            },
            error: (err) => {
                console.log(err);
              }

          })
        },
        error: (err) => {
            console.log(err);
          }
      })
    }
  }
}
