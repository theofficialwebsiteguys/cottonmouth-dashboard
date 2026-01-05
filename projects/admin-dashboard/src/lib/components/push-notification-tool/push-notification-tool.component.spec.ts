import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PushNotificationToolComponent } from './push-notification-tool.component';

describe('PushNotificationToolComponent', () => {
  let component: PushNotificationToolComponent;
  let fixture: ComponentFixture<PushNotificationToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PushNotificationToolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PushNotificationToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
