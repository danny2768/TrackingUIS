import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MapsRoutingModule } from './maps-routing.module';
import { MapsLayoutComponent } from './layout/maps-layout/maps-layout.component';
import { BusTrackingPageComponent } from './pages/bus-tracking-page/bus-tracking-page.component';


@NgModule({
  declarations: [
    MapsLayoutComponent,
    BusTrackingPageComponent
  ],
  imports: [
    CommonModule,
    MapsRoutingModule
  ]
})
export class MapsModule { }
