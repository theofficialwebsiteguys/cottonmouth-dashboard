import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfigService } from '../../projects/admin-dashboard/src/lib/services/config.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  constructor(private configService: ConfigService) {
   this.configService.setApiKey('c27c4d94eea807f6400604d204574663d179418bda4a8fa8a1a8bad48ea0fe3c');
  }
}
