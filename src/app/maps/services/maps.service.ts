import { Injectable, OnInit } from '@angular/core';

import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Observable } from 'rxjs';
import { BusInformation } from '../interfaces/map.interface';

@Injectable({
  providedIn: 'root'
})
export class MapsService{

  constructor(
    private afAuth: AngularFireAuth,
    private db: AngularFireDatabase
  ) {}

  getBusInfo():Observable<BusInformation | null> {
    return this.db.object<BusInformation>('/users/6MeXB780HQe9FTBd3v2aqiiwe3g2').valueChanges();
  }
}
