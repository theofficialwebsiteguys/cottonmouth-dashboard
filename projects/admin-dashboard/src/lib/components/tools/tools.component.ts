import { Component, ElementRef, ViewChild } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PushNotificationToolComponent } from '../push-notification-tool/push-notification-tool.component';
import { AnnouncementsComponent } from '../announcements/announcements.component';

@Component({
  selector: 'lib-tools',
  imports: [CommonModule, FormsModule, PushNotificationToolComponent, AnnouncementsComponent],
  templateUrl: './tools.component.html',
  styleUrl: './tools.component.css'
})
export class ToolsComponent {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;


  map!: google.maps.Map;
  drawingManager!: google.maps.drawing.DrawingManager;
  drawnZone: google.maps.Circle | google.maps.Polygon | null = null;

  days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  zoneSchedule: Record<string, { enabled: boolean; start: string; end: string }> = {};
  
  // title: string = '';
  // body: string = '';
  // imageUrl: string = '';
  // selectedFileName: string | null = null;
  selectedCategory: string = '';
  categories: string[] = ['PREROLL', 'EDIBLE', 'FLOWER', 'CONCENTRATES', 'BEVERAGE', 'TINCTURES', 'ACCESSORIES'];
  deliveryAvailable: boolean = false;
  carouselImages: string[] = [];
  expandedIndex: number | null = null;
  selectedImageFile: (File | undefined)[] = [];
  uploadedImagePreviewUrl: (string | undefined)[] = [];
  selectedIndex: number | null = null;

  eventTitle = '';
  eventDescription = '';
  eventLocation = '';
  eventDateTime = '';
  eventImage = '';
  eventFile?: File;

  events: any[] = [];
  editingEventId: string | null = null;
  editEventForm = {
    title: '',
    description: '',
    location: '',
    dateTime: '',
    file: undefined as File | undefined
  };

  addBannerFile?: File;
  confirmDeleteIndex: number | null = null;
  orderChanged: boolean = false;
  isSavingOrder: boolean = false;

  bannerSchedules: Record<string, string[]> = {};
  // 'every' = no restriction (schedule saved as [])
  // 'specific' = only show on selected days
  // 'hidden' = never show (schedule saved as special marker ['__hidden__'])
  bannerModes: Record<string, 'every' | 'specific' | 'hidden'> = {};
  editingScheduleIndex: number | null = null;
  schedulesChanged: boolean = false;
  isSavingSchedules: boolean = false;

  readonly weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  tabs: string[] = ['Notifications', 'Banners', 'Announcements'];
  selectedTab = 0;

  isSavingZone: boolean = false;
  zoneSavedSuccessfully: boolean = false;

  emailDomainVerified: boolean = false;
  domainVerificationPending: boolean = false;

  emailSubject: string = '';
  emailBody: string = '';
  flyerFile?: File;
  flyerPreviewUrl: string = '';
  isImageFile: boolean = true;
  targetAudience: string = 'all';

  emailDomain: string = '';
  emailDomainSubmitted: boolean = false;
  userBroadcasts: any[] = [];

  audienceId: string = ''

  activeScheduler: string | null = null;
  scheduleDateTime: string = '';

  isCreatingBroadcast = false;
  broadcastCreatedSuccessfully = false;
  broadcastCreationError: string | null = null;

  isSendingBroadcast = false;
  sendingBroadcastId: string | null = null;

  deletingBroadcastId: string | null = null;
  isLoadingBroadcasts: boolean = false;


  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadCarouselImages();
    this.getDeliveryEligibility();
    this.getEvents();
    this.initZoneSchedule();

    if(!this.emailDomainVerified){
      this.getDomainVerification();
    }

  }

  ngAfterViewChecked(): void {
    if (this.selectedTab === 3 && this.mapContainer && !this.map) {
      this.initMap();
      this.loadDeliveryZone();
    }
  }
  
  triggerFileInput() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // clearNotificationForm() {
  //   this.title = '';
  //   this.body = '';
  //   this.imageUrl = '';
  //   this.selectedFileName = null;
  
  //   // Reset file input
  //   const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  //   if (fileInput) {
  //     fileInput.value = ''; // Clears file input
  //   }
  // }

  // onFileSelected(event: any) {
  //   const file: File = event.target.files[0];

  //   console.log(file)

  //   if (file) {
  //     this.adminService.uploadImage(file).subscribe({
  //       next: (response) => {
  //         this.imageUrl = response.imageUrl; // Get public URL from backend
  //         console.log('Image uploaded, public URL:', this.imageUrl);
  //       },
  //       error: (error) => {
  //         console.error('Error uploading image:', error);
  //       }
  //     });
  //   }
  // }

  onEventFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.eventFile = file;
    }
  }


  getDeliveryEligibility(): void {
    this.adminService.checkDeliveryEligibility().subscribe(response => {
      this.deliveryAvailable = response.deliveryAvailable;
    });
  }

  onToggleDelivery(): void {
    this.adminService.toggleDelivery().subscribe(response => {
      this.deliveryAvailable = response.deliveryAvailable;
    });
  }

  loadCarouselImages() {
    this.adminService.getCarouselImages().subscribe(response => {
      const sorted = [...response.images].sort((a, b) => {
        const aNum = Number.parseInt(/carousel(\d+)\./.exec(a)?.[1] ?? '0');
        const bNum = Number.parseInt(/carousel(\d+)\./.exec(b)?.[1] ?? '0');
        return aNum - bNum;
      });
      this.carouselImages = sorted.map(imgUrl => `${imgUrl}?v=${Date.now()}`);
      this.bannerSchedules = response.schedules ?? {};
      this.bannerModes = {};
      Object.entries(this.bannerSchedules).forEach(([name, days]) => {
        if (days.includes('__hidden__')) {
          this.bannerModes[name] = 'hidden';
        } else if (days.length > 0) {
          this.bannerModes[name] = 'specific';
        } else {
          this.bannerModes[name] = 'every';
        }
      });
    });
  }

  toggleDropdown(index: number) {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  onImageFileSelected(event: any, index: number) {
    const file = event.target.files[0];
    if (file) {
      this.selectedImageFile[index] = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.uploadedImagePreviewUrl[index] = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  replaceImage(index: number) {
    if (!this.selectedImageFile[index]) return;

    this.adminService.replaceCarouselImage(this.selectedImageFile[index]!, index)
      .subscribe(response => {
        this.carouselImages[index] = `${response.imageUrl}?v=${new Date().getTime()}`;
        this.selectedImageFile[index] = undefined;
        this.uploadedImagePreviewUrl[index] = undefined;
      });
  }

//   sendNotification() {
//     if (!this.title || !this.body) {
//         console.error('Title and body are required!');
//         return;
//     }

//     if (this.selectedCategory) {
//         // Send to a specific category group
//         this.adminService.sendPushNotificationToCategory(this.title, this.body, this.selectedCategory, this.imageUrl)
//             .subscribe({
//                 next: (response) => {
//                     console.log('Category notification sent:', response);
//                 },
//                 error: (error) => {
//                     console.error('Error sending category notification:', error);
//                 }
//             });
//     } else {
//         // Send to all users
//         this.adminService.sendPushNotificationToAll(this.title, this.body, this.imageUrl)
//             .subscribe({
//                 next: (response) => {
//                     console.log('Notification sent:', response);
//                 },
//                 error: (error) => {
//                     console.error('Error sending notification:', error);
//                 }
//             });
//     }
// }

clearEventForm() {
  this.eventTitle = '';
  this.eventDescription = '';
  this.eventLocation = '';
  this.eventDateTime = '';
  this.eventImage = '';
}


createEvent() {
  if (!this.eventTitle || !this.eventDescription || !this.eventDateTime) {
    console.error('Missing required fields (title, description, dateTime)');
    return;
  }

  const formData = new FormData();
  formData.append('title', this.eventTitle);
  formData.append('description', this.eventDescription);
  formData.append('location', this.eventLocation);
  formData.append('dateTime', this.eventDateTime);

  // If user selected a file, attach it
  if (this.eventFile) {
    formData.append('imageFile', this.eventFile); // "imageFile" must match the field name used in multer.single('imageFile')
  }

  // Now call the service method that posts FormData
  this.adminService.createEvent(formData).subscribe({
    next: (response) => {
      console.log('Event created successfully:', response);
      // reset fields
      this.eventTitle = '';
      this.eventDescription = '';
      this.eventLocation = '';
      this.eventDateTime = '';
      this.eventFile = undefined;
    },
    error: (error) => {
      console.error('Error creating event:', error);
    }
  });
}

  deleteEvent(eventId: string) {
    if (confirm('Are you sure you want to delete this event?')) {
      this.adminService.deleteEvent(eventId).subscribe({
        next: () => {
          this.events = this.events.filter(e => e.id !== eventId);
        },
        error: (err) => console.error('Error deleting event', err)
      });
    }
  }

  getEvents() {
    this.adminService.getEvents().subscribe({
      next: (res) => {
        this.events = res;
      },
      error: (err) => console.error('Error fetching events', err)
    });
  }

  startEditEvent(event: any) {
    this.editingEventId = event.id;
    this.editEventForm = {
      title: event.title,
      description: event.description,
      location: event.location,
      dateTime: event.dateTime.split('.')[0], // trim milliseconds for input compatibility
      file: undefined
    };
  }

  onEditEventFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.editEventForm.file = file;
    }
  }
  
  saveEventChanges() {
    if (!this.editingEventId) return;
  
    const formData = new FormData();
    formData.append('title', this.editEventForm.title);
    formData.append('description', this.editEventForm.description);
    formData.append('location', this.editEventForm.location);
    formData.append('dateTime', this.editEventForm.dateTime);
    if (this.editEventForm.file) {
      formData.append('imageFile', this.editEventForm.file);
    }
  
    this.adminService.updateEvent(this.editingEventId, formData).subscribe({
      next: (res) => {
        console.log('Event updated:', res);
        this.getEvents(); // reload list
        this.editingEventId = null;
      },
      error: (err) => console.error('Error updating event:', err)
    });
  }
  
  cancelEventEdit() {
    this.editingEventId = null;
  }
  

  confirmDelete(index: number) {
    this.confirmDeleteIndex = index;
  }

  cancelDelete() {
    this.confirmDeleteIndex = null;
  }

  deleteImage(index: number) {
    const imageUrl = this.carouselImages[index];
    this.adminService.deleteCarouselImage(imageUrl).subscribe({
      next: (res) => {
        console.log(res.message);
        this.confirmDeleteIndex = null;
        this.expandedIndex = null;
        this.loadCarouselImages();
      },
      error: (err) => {
        console.error('Error deleting image:', err);
        this.confirmDeleteIndex = null;
      }
    });
  }

  moveImage(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= this.carouselImages.length) return;

    const temp = this.carouselImages[index];
    this.carouselImages[index] = this.carouselImages[newIndex];
    this.carouselImages[newIndex] = temp;
    this.orderChanged = true;
  }

  saveOrder() {
    this.isSavingOrder = true;
    const cleanUrls = this.carouselImages.map(url => url.split('?')[0]);
    this.adminService.reorderCarouselImages(cleanUrls).subscribe({
      next: () => {
        this.orderChanged = false;
        this.loadCarouselImages();
      },
      error: (err: any) => console.error('Error saving order:', err),
      complete: () => { this.isSavingOrder = false; }
    });
  }

  getBaseName(url: string): string {
    return url.split('?')[0].split('/').pop() ?? '';
  }

  toggleScheduleEditor(index: number) {
    this.editingScheduleIndex = this.editingScheduleIndex === index ? null : index;
  }

  getBannerMode(baseName: string): 'every' | 'specific' | 'hidden' {
    return this.bannerModes[baseName] ?? 'every';
  }

  setBannerMode(baseName: string, mode: 'every' | 'specific' | 'hidden') {
    this.bannerModes[baseName] = mode;
    if (mode === 'every') {
      this.bannerSchedules[baseName] = [];
    } else if (mode === 'hidden') {
      this.bannerSchedules[baseName] = ['__hidden__'];
    } else {
      // Switch to specific: pre-select all 7 so admin starts from "all on, turn off what you don't want"
      const current = this.bannerSchedules[baseName] ?? [];
      const validDays = current.filter(d => this.weekDays.includes(d));
      this.bannerSchedules[baseName] = validDays.length > 0 ? validDays : [...this.weekDays];
    }
    this.schedulesChanged = true;
  }

  isDaySelected(baseName: string, day: string): boolean {
    const schedule = this.bannerSchedules[baseName] ?? [];
    return schedule.includes(day);
  }

  getSelectedDays(baseName: string): string[] {
    const schedule = this.bannerSchedules[baseName] ?? [];
    return schedule.filter(d => this.weekDays.includes(d));
  }

  toggleScheduleDay(baseName: string, day: string) {
    const current = this.bannerSchedules[baseName] ?? [];
    if (current.includes(day)) {
      this.bannerSchedules[baseName] = current.filter(d => d !== day);
    } else {
      this.bannerSchedules[baseName] = [...current, day];
    }
    this.schedulesChanged = true;
  }

  // kept for template backwards-compat (chips on card face still use this)
  getActiveDays(baseName: string): string[] {
    if (this.getBannerMode(baseName) !== 'specific') return [];
    return this.getSelectedDays(baseName);
  }

  saveSchedules() {
    this.isSavingSchedules = true;
    this.adminService.saveBannerSchedules(this.bannerSchedules).subscribe({
      next: () => {
        this.schedulesChanged = false;
      },
      error: (err: any) => console.error('Error saving schedules:', err),
      complete: () => { this.isSavingSchedules = false; }
    });
  }

  onAddBannerFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.addBannerFile = file;
    }
  }
  
  uploadNewBanner() {
    if (!this.addBannerFile) return;
  
    this.adminService.addCarouselImage(this.addBannerFile).subscribe({
      next: (res) => {
        console.log(res.message);
        this.addBannerFile = undefined;
        this.loadCarouselImages(); // Refresh
      },
      error: (err) => console.error('Error adding banner:', err)
    });
  }
  
  initZoneSchedule(): void {
    this.days.forEach(day => {
      this.zoneSchedule[day] = { enabled: false, start: '', end: '' };
    });
  }

  initMap(): void {
    const center = new google.maps.LatLng(40.7128, -74.0060);

    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center,
      zoom: 12,
    });

    this.drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [
          google.maps.drawing.OverlayType.POLYGON,
          google.maps.drawing.OverlayType.CIRCLE
        ]
      },
      polygonOptions: {
        fillColor: '#2196f3',
        strokeWeight: 2,
        fillOpacity: 0.3,
        editable: true
      },
      circleOptions: {
        fillColor: '#4caf50',
        strokeWeight: 2,
        fillOpacity: 0.3,
        editable: true
      }
    });

    this.drawingManager.setMap(this.map);

    google.maps.event.addListener(this.drawingManager, 'overlaycomplete', (event:any) => {
      if (this.drawnZone) {
        this.drawnZone.setMap(null);
      }
      this.drawnZone = event.overlay;
    });
  }

  saveZone(): void {
    this.isSavingZone = true;
    this.zoneSavedSuccessfully = false;

    let geometry;
  
    if (this.drawnZone instanceof google.maps.Circle) {
      const center = this.drawnZone.getCenter();
      const radius = this.drawnZone.getRadius();
      geometry = {
        type: 'circle',
        center: { lat: center?.lat(), lng: center?.lng() },
        radius
      };
    } else if (this.drawnZone instanceof google.maps.Polygon) {
      const path = this.drawnZone.getPath().getArray().map(coord => ({
        lat: coord.lat(),
        lng: coord.lng()
      }));
      geometry = {
        type: 'polygon',
        path
      };
    }
  
    const activeSchedule = Object.entries(this.zoneSchedule)
      .filter(([_, val]) => val.enabled)
      .map(([day, val]) => ({ day, startTime: val.start, endTime: val.end }));
  
    const payload = {
      geometry,
      schedule: activeSchedule
    };
  
    this.adminService.updateDeliveryZone(payload).subscribe({
      next: (res) => {
        console.log('Delivery zone saved:', res);
        this.zoneSavedSuccessfully = true;
        setTimeout(() => this.zoneSavedSuccessfully = false, 3000); // Clear success after 3s
      },
      error: (err) => {
        console.error('Error saving zone:', err);
      },
      complete: () => {
        this.isSavingZone = false;
      }
    });
  }

  loadDeliveryZone(): void {
    this.adminService.getDeliveryZone().subscribe({
      next: (data: any) => {
        if (!data?.geometry) return;

        const { geometry, schedule } = data;

        if (geometry.type === 'circle') {
          const circle = new google.maps.Circle({
            center: geometry.center,
            radius: geometry.radius,
            map: this.map,
            fillColor: '#4caf50',
            strokeWeight: 2,
            fillOpacity: 0.3,
            editable: true
          });
          this.drawnZone = circle;
          this.map.setCenter(geometry.center);
        } else if (geometry.type === 'polygon') {
          const polygon = new google.maps.Polygon({
            paths: geometry.path,
            map: this.map,
            fillColor: '#2196f3',
            strokeWeight: 2,
            fillOpacity: 0.3,
            editable: true
          });
          this.drawnZone = polygon;
          this.map.setCenter(geometry.path[0]);
        }

        schedule.forEach((entry: any) => {
          this.zoneSchedule[entry.day] = {
            enabled: true,
            start: entry.startTime,
            end: entry.endTime
          };
        });
      },
      error: (err) => console.error('Error loading zone:', err)
    });
  }
  
  onFlyerSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.flyerFile = file;

    const fileType = file.type;
    this.isImageFile = fileType.startsWith('image/');

    if (this.isImageFile) {
      const reader = new FileReader();
      reader.onload = () => {
        this.flyerPreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.flyerPreviewUrl = file.name;
    }
  }

  sendEmailBlast() {
    if (!this.emailSubject || !this.emailBody) {
      console.error('Subject and body are required.');
      return;
    }

    const formData = new FormData();
    formData.append('subject', this.emailSubject);
    formData.append('body', this.emailBody);
    formData.append('audience', this.targetAudience);

    if (this.flyerFile) {
      formData.append('flyer', this.flyerFile);
    }

    this.adminService.sendEmailBlast(formData).subscribe({
      next: (res) => {
        console.log('Email sent:', res);
        this.clearEmailForm();
      },
      error: (err) => {
        console.error('Failed to send email:', err);
      }
    });
  }

  clearEmailForm() {
    this.emailSubject = '';
    this.emailBody = '';
    this.flyerFile = undefined;
    this.flyerPreviewUrl = '';
    this.isImageFile = true;
    this.targetAudience = 'all';

    const fileInput = document.getElementById('flyerInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  registerEmailDomain() {
    if (!this.emailDomain) {
      console.error('Domain is required.');
      return;
    }

    this.emailDomainSubmitted = true;
    this.domainVerificationPending = true;

    // this.adminService.registerEmailDomain(this.emailDomain).subscribe({
    //   next: (res) => {
    //     console.log('Domain registered, checking verification...');
    //     this.getDomainVerification();
    //   },
    //   error: (err) => {
    //     console.error('Error registering domain:', err);
    //     this.emailDomainSubmitted = false;
    //     this.domainVerificationPending = false;
    //   }
    // });
  }

  getDomainVerification() {
    // this.adminService.getSavedEmailDomainStatus().subscribe({
    //   next: (res) => {
    //     const isVerified = res.status === 'verified';

    //     this.emailDomainVerified = isVerified;
    //     this.domainVerificationPending = !isVerified;
    //     this.emailDomainSubmitted = true;

    //     if (isVerified) {
    //       setTimeout(() => {
    //         this.getAudienceThenBroadcasts();
    //       }, 1000); // 600ms delay to avoid rate limit
    //     }
    //   },
    //   error: (err) => {
    //     console.error('Error polling domain verification:', err);
    //   }
    // });
  }

  getAudienceThenBroadcasts() {
    this.adminService.getAudience().subscribe({
      next: (audienceRes) => {
        this.audienceId = audienceRes.data.id;
        console.log(this.audienceId)
          setTimeout(() => {
            this.loadBroadcasts();
          }, 1000); // 600ms delay to avoid rate limit
      },
      error: (err) => {
        console.error('Failed to get audience:', err);
      }
    });
  }

  loadBroadcasts() {
    this.isLoadingBroadcasts = true;
    this.adminService.getBroadcasts().subscribe({
      next: (res) => {
        this.userBroadcasts = res.broadcasts.filter((b: any) => b.data.status !== 'sent');
        console.log(this.userBroadcasts);
      },
      error: (err) => console.error('Error loading broadcasts', err),
      complete: () => {
        this.isLoadingBroadcasts = false;
      }
    });
  }

  toggleScheduler(id: string) {
    this.activeScheduler = this.activeScheduler === id ? null : id;
  }

  scheduleBroadcast(broadcastId: string, sendNow: boolean = false) {
    const scheduledTime = sendNow
      ? null
      : this.scheduleDateTime;

    this.sendingBroadcastId = broadcastId;

    // if (!scheduledTime) {
    //   console.warn('No datetime selected');
    //   return;
    // }

    console.log(broadcastId)
    this.adminService.sendBroadcast(broadcastId, scheduledTime).subscribe({
      next: () => {
        console.log(sendNow ? 'Broadcast sent now' : 'Broadcast scheduled');
        this.loadBroadcasts();
        this.activeScheduler = null;
      },
      error: (err) => console.error('Error scheduling broadcast', err),
      complete: () => {
        this.sendingBroadcastId = null;
      }
    });
  }

  createBroadcast() {
    if (!this.emailSubject || !this.emailBody) {
      console.error('Subject and body are required.');
      return;
    }
    
    this.isCreatingBroadcast = true;
    this.broadcastCreatedSuccessfully = false;
    this.broadcastCreationError = null;

    const formData = new FormData();
    formData.append('subject', this.emailSubject);
    formData.append('body', this.emailBody);
    formData.append('audienceId', this.audienceId);

    if (this.flyerFile) {
      formData.append('flyer', this.flyerFile);
    }

    this.adminService.createEmailBroadcast(formData).subscribe({
      next: (res) => {
        console.log('Broadcast created:', res);
        this.clearEmailForm();
        this.broadcastCreatedSuccessfully = true
        setTimeout(() => this.loadBroadcasts(), 1000); // Avoid rate limit
      },
      error: (err) => {
        this.broadcastCreationError = 'Failed to create broadcast.';
        console.error('Broadcast creation failed:', err);
      },
      complete: () => {
        this.isCreatingBroadcast = false;
      }
    });
  }



  createAudience() {
    this.adminService.createAudience().subscribe({
      next: (res) => {
        console.log('Audience created:', res);
        this.audienceId = res.id;
      },
      error: (err) => {
        console.error('Broadcast creation failed:', err);
      }
    });
  }

  getAudience() {
    this.adminService.getAudience().subscribe({
      next: (res) => {
        console.log('Audience:', res);
        this.audienceId = res.id;
      },
      error: (err) => {
        console.error('Broadcast creation failed:', err);
      }
    });
  }

  formatDate(dateString: string): string {
    if(dateString === null){
      return 'Not Scheduled';
    }
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  confirmDeleteBroadcast(broadcastId: string) {
    if (confirm('Are you sure you want to delete this broadcast?')) {
      this.deletingBroadcastId = broadcastId;
      this.adminService.deleteBroadcast(broadcastId).subscribe({
        next: () => {
          console.log('Broadcast deleted');
          this.userBroadcasts = this.userBroadcasts.filter(b => b.data.id !== broadcastId);
        },
        error: (err) => console.error('Error deleting broadcast', err),
        complete: () => this.deletingBroadcastId = null
      });
    }
  }


}
