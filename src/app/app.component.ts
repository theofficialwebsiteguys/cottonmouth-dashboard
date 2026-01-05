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
   this.configService.setApiKey('9ddf0fd5a3c5a99a8b357e6f6a0766ba82d45daac57dd55a2177fe35b690fa3b');
  }
}
