import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { AdminService } from '../../services/admin.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'lib-user-detail',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatCardModule, ReactiveFormsModule, FormsModule, MatSortModule, MatProgressSpinnerModule ],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss'
})
export class UserDetailComponent {
   @Input() user: any;
  @Output() closeDetail = new EventEmitter<void>();
  @Output() orderSelected = new EventEmitter<any>();

  editMode = false;
  saving = false;

  editableFname!: string;
  editableLname!: string;
  editableEmail!: string;
  editablePhone!: string;
  editableCountry!: string;

  constructor(private adminService: AdminService) {}

  close() {
    this.closeDetail.emit();
  }

  selectOrder(order: any) {
    this.orderSelected.emit(order);
  }

  toggleEditMode() {
    this.editMode = true;
    this.editableFname = this.user.fname;
    this.editableLname = this.user.lname;
    this.editableEmail = this.user.email;
    this.editablePhone = this.user.phone;
    this.editableCountry = this.user.country;
  }

  cancelEdit() {
    this.editMode = false;
  }

  saveChanges() {
    this.saving = true;

    const updated = {
      id: this.user.id,
      fname: this.editableFname,
      lname: this.editableLname,
      email: this.editableEmail,
      phone: this.editablePhone,
      country: this.editableCountry
    };

    this.adminService.updateUser(updated).subscribe({
      next: () => {
        Object.assign(this.user, updated);
        this.editMode = false;
        this.saving = false;
      },
      error: () => (this.saving = false)
    });
  }

  upgradeToPremium() {
    this.adminService.upgradeUserToPremium(this.user.phone, this.user.email).subscribe(() => {
      this.user.premium = true;
    });
  }

  downgradeFromPremium() {
    this.adminService.downgradeUserFromPremium(this.user.phone, this.user.email).subscribe(() => {
      this.user.premium = false;
    });
  }

}
