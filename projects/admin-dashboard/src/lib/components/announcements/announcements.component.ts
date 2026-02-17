import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './announcements.component.html',
  styleUrls: ['./announcements.component.scss']
})
export class AnnouncementsComponent implements OnInit {

  announcements: any[] = [];

  title = '';
  message = '';

  editingId: string | null = null;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadAnnouncements();
  }

  loadAnnouncements() {
    this.adminService.getAnnouncements().subscribe(res => {
      this.announcements = res;
    });
  }

  createAnnouncement() {
    if (!this.title) return;

    this.adminService.createAnnouncement({
      title: this.title,
      message: this.message || undefined
    }).subscribe(() => {
      this.title = '';
      this.message = '';
      this.loadAnnouncements();
    });
  }

  startEdit(ann: any) {
    this.editingId = ann.id;
    this.title = ann.title;
    this.message = ann.message;
  }

  saveEdit() {
    if (!this.editingId) return;

    this.adminService.updateAnnouncement(this.editingId, {
      title: this.title,
      message: this.message
    }).subscribe(() => {
      this.editingId = null;
      this.title = '';
      this.message = '';
      this.loadAnnouncements();
    });
  }

  deleteAnnouncement(id: string) {
    if (!confirm('Delete this announcement?')) return;

    this.adminService.deleteAnnouncement(id).subscribe(() => {
      this.loadAnnouncements();
    });
  }

  cancelEdit() {
    this.editingId = null;
    this.title = '';
    this.message = '';
  }
}
