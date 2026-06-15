import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from "@angular/router";
import { Http } from '../../services/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-registro',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './registro.html',
  styles: [''],
})
export class Registro {

  constructor(private http: Http, private _cdr: ChangeDetectorRef) { }

  imagenSeleccionada!: File;
  imagenPreview: string | ArrayBuffer | null = null;
  extPermitidas = ['image/jpg', 'image/jpeg', 'image/png'];
  formBuilder = inject(FormBuilder);
  private router = inject(Router);

  mostrarError = false;
  loading = false;
  errorMessage?: string;

  registroForm = this.formBuilder.group({
    alias: ['', {
      validators: [
        Validators.required,
        Validators.pattern('[a-zA-Z0-9_ñ.]*'),
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
    confirmPassword: ['', [Validators.required, this.matchPassword.bind(this)]],
    email: ['', {
      validators: [
        Validators.required,
        Validators.maxLength(60),
        Validators.email
      ]
    }],
    confirmEmail: ['', [Validators.required, this.matchEmail.bind(this)]],
    nombre: ['', {
      validators: [
        Validators.required,
        Validators.pattern('[a-zA-Zñ ]*'),
        Validators.maxLength(50)
      ]
    }],
    imagen: ['',]
  })
  ngOnInit(): void {
    this.http.sesionActiva$.subscribe(logueado => {
      this.http.getAliasDelToken() || "";
      if (logueado) {
        this.router.navigate(['/home']);
      }
    });
  }
  dragActivo = false;

  onDragEnter(event: DragEvent) {
    event.preventDefault();
    this.dragActivo = true;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragActivo = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragActivo = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragActivo = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.processFileSelected(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.processFileSelected(file);
    }
  }

  processFileSelected(file: File) {
    this.imagenSeleccionada = file;
    console.log(this.imagenSeleccionada.type);
    if (!this.extPermitidas.includes(this.imagenSeleccionada.type)) {
      this.errorMessage = "Tipo de imagen no permitida!"
      this.mostrarError = true;
      this.imagenPreview = null;
      this._cdr.detectChanges();
    } else {
      this.mostrarError = false;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagenPreview = reader.result;
        this._cdr.detectChanges(); 
      };
      reader.readAsDataURL(this.imagenSeleccionada);

      this._cdr.detectChanges();
    }
  }

  afterAlias(aliasTemp: string) {
    this.http.existeUsuario(aliasTemp).subscribe({
      next: (response) => {
        if (response.existe == "true") {
          this.errorMessage = "Alias ya existe!"
          this.mostrarError = true;
          this._cdr.detectChanges();
        } else {
          this.mostrarError = false;
          this._cdr.detectChanges();
        }
      },
      error: (err) => console.log(err)
    });
  }

  afterEmail(emailTemp: string) {
    this.http.existeEmail(emailTemp).subscribe({
      next: (response) => {
        if (response.existe == "true") {
          this.errorMessage = "Email en uso!"
          this.mostrarError = true;
          this._cdr.detectChanges();
        } else {
          this.mostrarError = false;
          this._cdr.detectChanges();
        }
      },
      error: (err) => console.log(err)
    });
  }

  onSubmit() {
    this.registroForm.get('confirmPassword')?.updateValueAndValidity();
    this.registroForm.get('confirmEmail')?.updateValueAndValidity();
    if (this.registroForm.invalid) return;
    this.loading = true;
    this.mostrarError = false; 
    const usuario = this.registroForm.value as any;
    const { alias, email } = this.registroForm.value as any;

    this.http.existeUsuario(alias).subscribe({
      next: (resAlias) => {
        if (resAlias.existe === "true") {
          this.manejarErrorFormulario("Alias ya existe!");
          return;
        }

        this.http.existeEmail(email).subscribe({
          next: (resEmail) => {
            if (resEmail.existe === "true") {
              this.manejarErrorFormulario("El Email ya está registrado!");
              return;
            }

            if (this.imagenSeleccionada && !this.extPermitidas.includes(this.imagenSeleccionada.type)) {
              this.manejarErrorFormulario("Tipo de imagen no permitida!");
              return;
            }

            this.procederConRegistro(usuario);
          },
          error: (err) => { this.manejarErrorGlobal(err); }
        });
      },
      error: (err) => { this.manejarErrorGlobal(err); }
    });
  }

  private manejarErrorFormulario(mensaje: string) {
    this.errorMessage = mensaje;
    this.mostrarError = true;
    this.loading = false;
    this._cdr.detectChanges();
  }

  private manejarErrorGlobal(err: any) {
    Swal.fire({ title: "Error", text: "Ha ocurrido un error inesperado.", icon: "error" });
    console.log(err);
    this.loading = false;
    this._cdr.detectChanges();
  }

  private procederConRegistro(usuario: any) {
    this.http.subirImgUsuario(this.imagenSeleccionada).subscribe({
      next: (respuestaImg) => {
        usuario.imagen = respuestaImg.ruta;
        this.http.registrarUsuario(usuario).subscribe({
          next: (response) => {
            this.http.guardarToken(response.token);
            this.loading = false;
            this.router.navigate(['/home']);
          },
          error: (err) => this.manejarErrorGlobal(err)
        });
      },
      error: (err) => this.manejarErrorGlobal(err)
    });
  }

  matchPassword(control: AbstractControl): ValidationErrors | null {
    if (!this.registroForm) return null;
    const password = this.registroForm.get('password')?.value;
    const confirmPassword = control.value;
    return password === confirmPassword ? null : { noMatch: true };
  }

  matchEmail(control: AbstractControl): ValidationErrors | null {
    if (!this.registroForm) return null;
    const email = this.registroForm.get('email')?.value;
    const confirmEmail = control.value;
    return email === confirmEmail ? null : { noMatch: true };
  }

}

