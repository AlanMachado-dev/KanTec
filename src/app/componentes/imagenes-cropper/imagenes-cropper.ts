import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges , OnChanges} from '@angular/core';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';

@Component({
  selector: 'app-imagenes-cropper',
  imports: [CommonModule, ImageCropperComponent],
  templateUrl: './imagenes-cropper.html',
  styles: '',
  standalone: true
})
export class ImagenesCropper implements OnChanges{

  @Input() aspectRatio = 1;

  @Input() mensajeImagen: string | null = null;

  @Input() esPerfil: boolean = false;

  @Input() previewInicial: string | ArrayBuffer | null = null;
  preview: string | ArrayBuffer | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['previewInicial']) {
      this.preview = this.previewInicial;
    }
  }

  @Output() imagenRecortada = new EventEmitter<File>();

  extPermitidas = ['image/jpg', 'image/jpeg', 'image/png'];

  
  error: string | null = null;

  dragActivo = false;
  
  // cropper
  imageChangedEvent: any = null;

  archivoRecortado: File | null = null;

  imagenCargada: boolean = false;

  /* ===================== DRAG ===================== */

  onDragEnter(event: DragEvent) {
    event.preventDefault();
    this.setDrag(true);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.setDrag(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.setDrag(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.setDrag(false);

    const file = event.dataTransfer?.files?.[0];
    if (!file) return;

    //crear un input real temporal
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const fakeEvent = {
      target: {
        files: dataTransfer.files
      }
    } as any;

    this.onFileSelected(fakeEvent);
  }

  private setDrag( value: boolean) {
    this.dragActivo = value;
    
  }

  /* ===================== FILE INPUT ===================== */

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!this.extPermitidas.includes(file.type)) {
      this.error = "Tipo de imagen no permitida";
      return;
    }

    this.imagenCargada = false;

    this.imageChangedEvent = event;
  }

  /* ===================== CROPPER ===================== */

  onImageCropper(event: ImageCroppedEvent) {
    if (!event.blob) {
      return;
    }

    this.archivoRecortado = new File(
      [event.blob],
      'imagen.jpg',
      { type: event.blob.type }
    );

    const url = event.objectUrl ?? null;

    this.preview = url;
  }

  /* ===================== APLICAR ===================== */

  aplicarRecorte() {
    if (!this.archivoRecortado) return;

    const max = 5 * 1024 * 1024;

    if (this.archivoRecortado.size > max) {
      this.error = 'La imagen supera los 5MB';
      this.imageChangedEvent = null;
      this.preview = null;
      return;
    }

    this.error = null;

    this.imagenRecortada.emit(this.archivoRecortado);

    this.archivoRecortado = null;
    this.imageChangedEvent = null;
  }

  cancelarRecorte() {
    this.reset();
  }

  reset(){
    this.preview = this.previewInicial;
    this.imageChangedEvent = null;
    this.archivoRecortado = null;
    this.error = null;
    this.dragActivo = false;
    this.imagenCargada = false;
  }

  onImageLoaded(){
    this.imagenCargada = true;
  }
}
