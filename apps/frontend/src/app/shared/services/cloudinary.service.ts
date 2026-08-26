import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
}

@Injectable({
  providedIn: 'root',
})
export class CloudinaryService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  upload(file: File, folder: string): Observable<CloudinaryUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CloudinaryUploadResponse>(`${this.apiUrl}/cloudinary/upload?folder=${folder}`, formData);
  }

  deleteByUrl(url: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/cloudinary/by-url`, { body: { url } });
  }
}
