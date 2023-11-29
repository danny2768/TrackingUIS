import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import * as  mapboxgl from 'mapbox-gl';
(mapboxgl as any).accessToken = environment.mapbox_key

import { MapsRoutingModule } from './maps-routing.module';
import { MapsLayoutComponent } from './layout/maps-layout/maps-layout.component';
import { BusTrackingPageComponent } from './pages/bus-tracking-page/bus-tracking-page.component';
import { SharedModule } from '../shared/shared.module';
import { environment } from 'src/environments/environments';


@NgModule({
  declarations: [
    MapsLayoutComponent,
    BusTrackingPageComponent
  ],
  imports: [
    CommonModule,
    MapsRoutingModule,
    SharedModule
  ]
})
export class MapsModule { }
