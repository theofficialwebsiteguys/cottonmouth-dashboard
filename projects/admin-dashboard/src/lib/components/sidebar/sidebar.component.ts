import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Output, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'lib-sidebar',
  standalone: true,
  imports: [CommonModule, MatSidenavModule, MatIconModule, MatListModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  isMobile: boolean = false;

  ngOnInit() {
    this.checkScreenSize();
  }

  @HostListener('window:resize', [])
  onResize() {
    this.checkScreenSize();
  }


  @Output() linkClicked = new EventEmitter<void>();

  linkClick() {
    this.linkClicked.emit();
  }

  
  @HostListener('window:resize')
  checkScreenSize() {
    this.isMobile = window.innerWidth < 900;
  }

  handleNavClick() {
    if (this.isMobile) {
      this.sidenav.close();
    }
    this.linkClicked.emit();
  }
}
