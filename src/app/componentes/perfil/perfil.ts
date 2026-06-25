import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Http } from '../../services/http';
import { Usuario } from '../../interfaces/usuario';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { DatePipe } from '@angular/common';
import flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es';
import { ImagenesCropper } from '../imagenes-cropper/imagenes-cropper';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, DatePipe, ImagenesCropper],
  templateUrl: './perfil.html',
  styles: [':host { display: block; width: 100%; }'],
})
export class Perfil implements OnInit, OnDestroy {

  @ViewChild(ImagenesCropper)
  cropper!: ImagenesCropper;

  usuario: Usuario | null = null;
  imagenUsu: string | null = null;
  usuPropio: boolean = false;

  constructor(private http: Http, private router: Router, private ruta: ActivatedRoute, private _cdr: ChangeDetectorRef) { }

  private fpInstance: any;

  ngOnInit(): void {
    let detener = false;
    this.http.verificarToken().subscribe({
      next: () => { },
      error: (err) => {
        this.http.cerrarSesion();
        this.router.navigate(['/ingreso'], { state: { expirado: "true" } });
        detener = true;
      }
    })
    if (detener) return;

    if (!this.http.estaLogueado()) {
      this.router.navigate(['/ingreso']);
    } else {
      const alias = this.ruta.snapshot.paramMap.get('alias');
      if (!alias) return;
      this.http.notificarInvitacion().subscribe(resp => {
        if(resp.tieneNuevas){
          Swal.mixin({
            toast: true,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true,
            didOpen: (toast) => {
              toast.onmouseenter = Swal.stopTimer;
              toast.onmouseleave = Swal.resumeTimer;
            }
          }).fire({
            icon: 'info',
            title: 'Revisa la seccion "Mis invitaciones".'
          });
           
          this.http.marcarComoVistas().subscribe();
          
        }
      })
      
      this.http.getUsuario(alias).subscribe({
        next: (response) => {
          this.usuario = response;
          this.imagenUsu = this.http.getRutaBaseImg() + this.usuario.imagen;

          if (this.http.getAliasDelToken() === alias) {
            this.usuPropio = true;
          }

          this.formularioUsuario.patchValue({
            nombre: this.usuario.nombre,
            fecNac: this.usuario.fecNac,
            bio: this.usuario.bio,
          });
          this._cdr.detectChanges();
        },
        error: (err) => {
        }
      })
    }
  }

  ngOnDestroy(): void {
    this.usuario = null;
    this.imagenUsu = null;
    this.usuPropio = false;
  }

  ngAfterViewInit(): void {
    this.fpInstance = flatpickr("#calendario-nacimiento", {
      locale: Spanish,
      altInput: true,
      altFormat: "j \\d\\e F Y",
      dateFormat: "Y-m-d", 
      maxDate: "today",
      minDate: "1900-01",
    
      onChange: (selectedDates, dateStr, instance) => {
        this.formularioUsuario.patchValue({
          fecNac: instance.formatDate(selectedDates[0], 'Y-m-d')
        })
        this.formularioUsuario.markAsTouched();
        this.formularioUsuario.markAsDirty();
      }
    });
  }

  imagenSeleccionada!: File;
  extPermitidas = ['image/jpg', 'image/jpeg', 'image/png'];
  formBuilder = inject(FormBuilder);

  mostrarError = false;
  loading = false;
  errorMessage?: string;

  hoyStr = new Date().toISOString().split('T')[0]; 

  onImagenPerfil(file: File) {
    this.imagenSeleccionada = file;
    this.formularioUsuario.markAsDirty();
  }

  formularioUsuario = this.formBuilder.group({
    nombre: ['', {
      validators: [
        Validators.maxLength(50),
        Validators.required
      ]
    }],
    imagen: ['',],
    fecNac: ['',],
    bio: ['', {
      validators: [
        Validators.maxLength(100)
      ]
    }]

  })
 

  editarPerfil(): void{
    this.fpInstance?.setDate(this.formularioUsuario.value.fecNac, false);
    this.formularioUsuario.markAsPristine();
    this.cropper.reset();
    
  }

  onSubmit() {
    if (this.formularioUsuario.valid && this.usuario?.alias) {
      const alias = this.usuario.alias;

      if (this.imagenSeleccionada && !this.extPermitidas.includes(this.imagenSeleccionada.type)) {
        this.errorMessage = "Tipo de imagen no permitida!";
        this.mostrarError = true;
        this.loading = false;
        this._cdr.detectChanges();
        return;
      }

      this.loading = true;

      if (this.imagenSeleccionada) {
        this.http.subirImgUsuario(this.imagenSeleccionada).subscribe({
          next: (respuestaImg) => {
            const datosParaEnviar = {
              ...this.formularioUsuario.value,
              imagen: respuestaImg.ruta
            };

            this.enviarDatosUsuario(alias, datosParaEnviar);
          },
          error: (err) => {
            console.error('Error al subir imagen:', err);
            this.loading = false;
            this._cdr.detectChanges();
          }
        });
      } else {
        this.enviarDatosUsuario(alias, this.formularioUsuario.value);
      }
    }
  }

  enviarDatosUsuario(alias: string, datos: any) {
    this.http.actualizarUsuario(alias, datos).subscribe({
      next: () => {
        if (this.usuario) {
          this.usuario.nombre = datos.nombre ?? '';
          this.usuario.email = datos.email ?? '';
          if (datos.imagen) {
            this.usuario.imagen = datos.imagen;
          }
        }
        this.formularioUsuario.reset();
        this.loading = false;
        this.ngOnInit();
        this.http.notificarPerfilModificado();
        let btn = document.getElementById("btnCerrarOffCanvas");
        btn?.click();
      },
      error: (err) => {
        console.error('Error al actualizar usuario:', err);
        this.loading = false;
        this._cdr.detectChanges();
      }
    });
  }

  confirmarBorrado(): void {
    Swal.fire({
      title: "¿Estás seguro/a?",
      text: "¡Esto será irreversible!",
      icon: "warning",
      showCancelButton: true,
      cancelButtonColor: "#3085d6",
      confirmButtonColor: "#d33",
      confirmButtonText: "Sí, borrar.",
      cancelButtonText: "No, cancelar."
    }).then((result) => {
      if (result.isConfirmed && this.usuario?.alias) {

        this.http.borrarUsuario(this.usuario.alias).subscribe({
          next: (response) => {
            Swal.fire({
              title: "¡Usuario borrado!",
              text: "Tu usuario ha sido borrado exitosamente.",
              icon: "success"
            });
            this.http.cerrarSesion();
            this.router.navigate(["/"]);
          },
          error: (error) => {
            Swal.fire({
              title: "Error",
              text: "No se pudo borrar el usuario. Inténtalo de nuevo.",
              icon: "error"
            });
          }
        });

      }
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

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = this.imagenUsu = this.http.getRutaBaseImg() + "usuarios/default.jpg";
  }

}
