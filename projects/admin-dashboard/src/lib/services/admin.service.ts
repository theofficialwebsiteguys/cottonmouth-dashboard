import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { from, map, Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  constructor(private http: HttpClient, private configService: ConfigService) {}

  // private getHeaders(): { [key: string]: string } {
  //   const sessionData = localStorage.getItem('sessionData');
  //   const token = sessionData ? JSON.parse(sessionData).token : null;
  
  //   if (!token) {
  //     console.error('No API key found, user needs to log in.');
  //     throw new Error('Unauthorized: No API key found');
  //   }
  
  //   return {
  //     Authorization: token,
  //     'Content-Type': 'application/json',
  //   };
  // }

  private getHeaders(): { [key: string]: string } {
    const sessionData = localStorage.getItem('sessionData');
    const token = sessionData ? JSON.parse(sessionData).token : null;
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json', // Ensure JSON data format
    };
  
    headers['x-auth-api-key'] = this.configService.getApiKey(); // Set API key header for guests
  
    return headers;
  }
  

  /** Get all users */
  // getUsers(): Observable<any[]> {
  //   return this.http.get<any[]>(`${environment.apiUrl}/users/`, { headers: this.getHeaders()});
  // }

  // /** Get all orders within a specific date range */
  // getOrdersByDateRange(queryParams: string): Observable<any[]> {
  //   return this.http.get<any[]>(`${environment.apiUrl}/orders/date-range${queryParams}`, { headers: this.getHeaders() });
  // }

  getUserData(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/users/`, { headers: this.getHeaders() });
  }

  getOrdersByEmployeesData(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/orders/employees`, { headers: this.getHeaders() });
  }

  getOrdersData(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/orders/`, { headers: this.getHeaders() });
  }

  uploadImage(file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file); // Append file to FormData

    console.log('FormData Entries:');
    formData.forEach((value, key) => {
      console.log(`${key}:`, value);
    });
    
    return this.http.post<{ imageUrl: string }>(`${environment.apiUrl}/notifications/upload-image`, formData, {
      headers: this.getHeaders(),
    });
  }

  sendPushNotificationToAll(title: string, body: string, imageUrl?: string): Observable<any> {
    const payload = { title, body, image: imageUrl };
    return this.http.post<any>(`${environment.apiUrl}/notifications/sendPushToAll`, payload, { headers: this.getHeaders() });
  }


  sendPushNotificationToCategory(title: string, body: string, category: string, imageUrl?: string): Observable<any> {
    const payload = { title, body, category, image: imageUrl };
    return this.http.post<any>(`${environment.apiUrl}/notifications/sendPushByCategory`, payload, { headers: this.getHeaders() });
  }

  getCarouselImages(): Observable<{ images: string[] }> {
    const url = `${environment.apiUrl}/notifications/images`;
  
    const options = {
      method: 'GET',
      url,
      headers: { 'x-auth-api-key': environment.db_api_key } // Add headers
    };
  
    return from(CapacitorHttp.request(options)).pipe(
      map((response: any) => response.data) // Extract the `data` property
    );
  }

  deleteCarouselImage(index: number) {
    const url = `${environment.apiUrl}/notifications/images/${index}`;
    const headers = {
      'x-auth-api-key': environment.db_api_key
    };
  
    return this.http.delete<{ message: string }>(url, { headers });
  }
  

  addCarouselImage(file: File) {
    const url = `${environment.apiUrl}/notifications/images/add`;
  
    const formData = new FormData();
    formData.append('imageFile', file);
  
    const headers = {
      'x-auth-api-key': environment.db_api_key
    };
  
    return this.http.post<{ imageUrl: string; message: string }>(url, formData, { headers });
  }
  

  replaceCarouselImage(file: File, index: number): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('replaceIndex', index.toString());
  
    // Prepare the request options
    const options = {
      method: 'POST',
      url: `${environment.apiUrl}/notifications/replace`,
      headers: this.getHeaders(),
      data: formData
    };
  
    // Use CapacitorHttp to send the request
    return from(CapacitorHttp.request(options)).pipe(
      map((response: any) => response.data)
    );
  }
  

sendCsvEmail(csvContent: string): Observable<any> {
  const payload = { csvContent };

  // Prepare the request options
  const options = {
    method: 'POST',
    url: `${environment.apiUrl}/businesses/send-csv-email`,
    headers: this.getHeaders(),
    data: payload
  };

  // Use CapacitorHttp to send the request
  return from(CapacitorHttp.request(options)).pipe(
    map((response: any) => response.data)
  );
}

toggleDelivery(): Observable<{ deliveryAvailable: boolean }> {
  const options = {
    url: `${environment.apiUrl}/businesses/toggle-delivery`,
    method: 'POST', // Use PATCH or POST based on your API design
    headers: this.getHeaders()
  };

  // Convert CapacitorHttp request to Observable
  return from(CapacitorHttp.request(options).then(response => response.data));
}

  checkDeliveryEligibility(): Observable<{ deliveryAvailable: boolean }> {
    const options = {
      url: `${environment.apiUrl}/businesses/delivery-eligibility`,
      method: 'GET',
      headers: this.getHeaders()
    };

    // Convert CapacitorHttp request to Observable
    return from(CapacitorHttp.request(options).then(response => response.data));
  }

  updateUser(user: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/users/update`, user, { headers: this.getHeaders() });
  }

  // admin.service.ts
  createEvent(eventData: any): Observable<any> {
    const options = {
      method: 'POST',
      url: `${environment.apiUrl}/businesses/events`,
      headers: this.getHeaders(),
      data: eventData
    };

    return from(CapacitorHttp.request(options)).pipe(
      map((response: any) => response.data)
    );
  }

  deleteEvent(eventId: string): Observable<any> {
    const options = {
      method: 'DELETE',
      url: `${environment.apiUrl}/businesses/events/${eventId}`,
      headers: this.getHeaders()
    };
  
    return from(CapacitorHttp.request(options)).pipe(map((res: any) => res.data));
  }  

  getEvents(): Observable<any[]> {
    const options = {
      method: 'GET',
      url: `${environment.apiUrl}/businesses/events`,
      headers: this.getHeaders()
    };
  
    return from(CapacitorHttp.request(options)).pipe(
      map((response: any) => response.data)
    );
  }

  updateEvent(eventId: string, formData: FormData): Observable<any> {
    const options = {
      method: 'PUT',
      url: `${environment.apiUrl}/businesses/events/${eventId}`,
      headers: this.getHeaders(),
      data: formData,
    };
  
    return from(CapacitorHttp.request(options)).pipe(
      map((res: any) => res.data)
    );
  }
  

  upgradeUserToPremium(phone: string, email: string): Observable<any> {
    const payload = { phone, email };
  
    return this.http.put(
      `${environment.apiUrl}/users/user-membership/upgrade`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  downgradeUserFromPremium(phone: string, email: string): Observable<any> {
    const payload = { phone, email };
  
    return this.http.put(
      `${environment.apiUrl}/users/user-membership/downgrade`,
      payload,
      { headers: this.getHeaders() }
    );
  }
  
  updateDeliveryZone(payload: any) {
    return this.http.post(`${environment.apiUrl}/businesses/zone`, payload, {
      headers: this.getHeaders()
    });
  }

  getDeliveryZone() {
    return this.http.get(`${environment.apiUrl}/businesses/zone`, {
      headers: this.getHeaders()
    });
  }

  sendEmailBlast(formData: FormData): Observable<any> {
    const headers = {
      'x-auth-api-key': environment.db_api_key
    };

    return this.http.post(`${environment.apiUrl}/resend/sendEmails`, formData, { headers });
  }

  registerEmailDomain(domain: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/resend/registerDomain`, { domain }, {       headers: this.getHeaders() });
  }

  getEmailDomainStatus(domain: string): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${environment.apiUrl}/resend/domainStatus?domain=${domain}`, {
      headers: this.getHeaders()
    });
  }

  getSavedEmailDomainStatus(): Observable<{ domain: string, status: string }> {
    return this.http.get<{ domain: string, status: string }>(`${environment.apiUrl}/resend/domainStatusForBusiness`, {
        headers: this.getHeaders()
    });
  }

  createAudience(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/resend/createAudience`, {
      headers: this.getHeaders()
    });
  }

  getAudience(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/resend/getAudience`, {
      headers: this.getHeaders()
    });
  }

  createEmailBroadcast(formData: FormData): Observable<any> {
    const headers = {
      'x-auth-api-key': environment.db_api_key
    };

    return this.http.post(`${environment.apiUrl}/resend/createBroadcast`, formData, {
      headers
    });
  }

  updateBroadcast(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/resend/updateBroadcast`, data, {
      headers: this.getHeaders()
    });
  }

  getBroadcasts(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/resend/getBroadcasts`, {
      headers: this.getHeaders()
    });
  }

  deleteBroadcast(broadcast_id: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/resend/deleteBroadcast?id=${broadcast_id}`, {
      headers: this.getHeaders()
    });
  }

  sendBroadcast(broadcastId: string, schedule: string | null): Observable<any> {
    return this.http.post(`${environment.apiUrl}/resend/sendBroadcast?id=${broadcastId}`, { scheduledAt: schedule }, {
      headers: this.getHeaders()
    });
  }

  getAnnouncements(): Observable<any[]> {
    return this.http.get<any[]>(
      `${environment.apiUrl}/businesses/announcements`,
      { headers: this.getHeaders() }
    );
  }

  createAnnouncement(data: { title: string; message?: string }): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/businesses/announcements`,
      data,
      { headers: this.getHeaders() }
    );
  }

  updateAnnouncement(id: string, data: any): Observable<any> {
    return this.http.put(
      `${environment.apiUrl}/businesses/announcements/${id}`,
      data,
      { headers: this.getHeaders() }
    );
  }

  deleteAnnouncement(id: string): Observable<any> {
    return this.http.delete(
      `${environment.apiUrl}/businesses/announcements/${id}`,
      { headers: this.getHeaders() }
    );
  }


}