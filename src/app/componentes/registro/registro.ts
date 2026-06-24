import { ChangeDetectorRef, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from "@angular/router";
import { Http } from '../../services/http';
import Swal from 'sweetalert2';
import { ImagenesCropper } from '../imagenes-cropper/imagenes-cropper';
declare var bootstrap: any;

@Component({
  selector: 'app-registro',
  imports: [RouterLink, ReactiveFormsModule, ImagenesCropper],
  templateUrl: './registro.html',
  styles: [''],
})
export class Registro {

  constructor(private http: Http, private _cdr: ChangeDetectorRef) { }

  @ViewChild('modalCodigo') modalRef!: ElementRef;

  imagenSeleccionada!: File;
  extPermitidas = ['image/jpg', 'image/jpeg', 'image/png'];
  formBuilder = inject(FormBuilder);
  private router = inject(Router);

  mostrarError = false;
  loading = false;
  errorMessage?: string;

  mostrarErrorVerificar = false;
  loadingVerificar = false;
  errorMessageVerificar?: string;

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
        Validators.pattern('[a-zA-Zñ ÑáéíóúÁÉÍÓÚ]*'),
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
  
  onImagenPerfil(file: File){
    this.imagenSeleccionada = file;
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
    this.loading = false;
    this._cdr.detectChanges();
  }

  private procederConRegistro(usuario: any) {
    this.http.subirImgUsuario(this.imagenSeleccionada).subscribe({
      next: (respuestaImg) => {
        usuario.imagen = respuestaImg.ruta;
        this.http.registrarUsuario(usuario).subscribe({
          next: (response) => {
            const modal = new bootstrap.Modal(this.modalRef.nativeElement);
            modal.show();
            this.http.enviarCodigo(usuario.alias, usuario.email, usuario.nombre).subscribe({
              next: () => {
              }
            })
          },
          error: (err) => this.manejarErrorGlobal(err)
        });
      },
      error: (err) => this.manejarErrorGlobal(err)
    });
  }

  codigoForm = this.formBuilder.group({
    codigo: ['', {
      validators: [
        Validators.required,
        Validators.pattern('[0-9]{6}')
      ]
    }]
  })

  confirmarCodigo(): void{
    this.loadingVerificar = true;
    this.mostrarErrorVerificar = false;

    let alias = this.registroForm.value.alias;
    let codigo = Number(this.codigoForm.value.codigo);

    if(!alias || !codigo) return;

    this.http.verificarCodigo(alias, codigo).subscribe({
      next: () => {
        let credenciales = {"alias": alias, "password": this.registroForm.value.password};
        this.http.inicioSesion(credenciales).subscribe({
          next: (response) => {
            this.http.guardarToken(response.token);
            this.loadingVerificar = false;
            
            const modal = bootstrap.Modal.getInstance(this.modalRef.nativeElement);
            modal.hide();
            
            this.router.navigate(['/home']);
          },
          error: (err) => console.log(err)
        })
      },
      error: (err) => {
        this.loadingVerificar = false;
        this.errorMessageVerificar = "Código inválido o expirado";
        this.mostrarErrorVerificar = true;
      } 
    })
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

