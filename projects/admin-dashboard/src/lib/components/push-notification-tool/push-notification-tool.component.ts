import { Component } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-push-notification-tool',
  imports: [CommonModule, FormsModule],
  templateUrl: './push-notification-tool.component.html',
  styleUrl: './push-notification-tool.component.scss'
})
export class PushNotificationToolComponent {
    title: string = '';
    body: string = '';
    imageUrl: string = '';
    selectedCategory: string = '';
    selectedFileName: string | null = null;
     categories: string[] = ['PREROLL', 'EDIBLE', 'FLOWER', 'CONCENTRATES', 'BEVERAGE', 'TINCTURES', 'ACCESSORIES'];

    constructor(private adminService: AdminService) {}

    sendNotification() {
      if (!this.title || !this.body) {
          console.error('Title and body are required!');
          return;
      }

      if (this.selectedCategory) {
          // Send to a specific category group
          this.adminService.sendPushNotificationToCategory(this.title, this.body, this.selectedCategory, this.imageUrl)
              .subscribe({
                  next: (response) => {
                      console.log('Category notification sent:', response);
                  },
                  error: (error) => {
                      console.error('Error sending category notification:', error);
                  }
              });
      } else {
          // Send to all users
          this.adminService.sendPushNotificationToAll(this.title, this.body, this.imageUrl)
              .subscribe({
                  next: (response) => {
                      console.log('Notification sent:', response);
                  },
                  error: (error) => {
                      console.error('Error sending notification:', error);
                  }
              });
      }
  }

    clearNotificationForm() {
    this.title = '';
    this.body = '';
    this.imageUrl = '';
    this.selectedFileName = null;
  
    // Reset file input
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; // Clears file input
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    console.log(file)

    if (file) {
      this.adminService.uploadImage(file).subscribe({
        next: (response) => {
          this.imageUrl = response.imageUrl; // Get public URL from backend
          console.log('Image uploaded, public URL:', this.imageUrl);
        },
        error: (error) => {
          console.error('Error uploading image:', error);
        }
      });
    }
  }

}
