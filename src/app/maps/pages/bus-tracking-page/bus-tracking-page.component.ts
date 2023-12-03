import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { GeolocateControl, LngLat, LngLatLike, Map, Marker } from 'mapbox-gl';
import { MapsService } from '../../services/maps.service';
import { Subscription, tap } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { BusInformation } from '../../interfaces/map.interface';

interface MarkerAndColor {
  color: string;
  marker: Marker;
}

interface PlainMarker {
  color: string;
  lngLat: number[];
}

interface busStop {
  title: string;
  lngLat: [ number, number ];
}

@Component({
  selector: 'app-bus-tracking-page',
  templateUrl: './bus-tracking-page.component.html',
  styleUrls: ['./bus-tracking-page.component.css'],
})
export class BusTrackingPageComponent implements AfterViewInit, OnDestroy {

  public subscription?: Subscription;
  public busMarker?: Marker;

  @ViewChild('map')
  public divMap?: ElementRef;

  public map?: Map;
  public zoom: number = 16.2;
  public currentLngLat: LngLat = new LngLat(-73.120454, 7.140268);
  public markers: MarkerAndColor[] = [];
  public accuracyCircle: boolean = true;

  public busStops: busStop[] = [
    {
      title: 'Bus Stop 1',
      lngLat: [-73.11755338905036, 7.137773732845886],
    },
    {
      title: 'Bus Stop 2',
      lngLat: [-73.11959186790178, 7.139519622690486],
    },
    {
      title: 'Bus Stop 3',
      lngLat: [-73.11952749488535, 7.141552937220155],
    },
    {
      title: 'Bus Stop 4',
      lngLat: [-73.12329331634236, 7.14098871995877],
    },
    {
      title: 'Bus Stop 5',
      lngLat: [-73.12061937988639, 7.1416007030169055],
    },
    {
      title: 'Bus Stop 6',
      lngLat: [-73.11925410352661, 7.140611807371116],
    },
  ]

  constructor( private afAuth: AngularFireAuth, private mapsService: MapsService ){}

  ngAfterViewInit(): void {
    // MapBox Map
    if (!this.divMap) throw 'El elemento html no fue encontrado';

    this.map = new Map({
      container: this.divMap.nativeElement, // container ID
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      center: this.currentLngLat, // starting position [lng, lat]
      zoom: this.zoom, // starting zoom
      maxZoom: 19,
      minZoom: 1,
    });

    // Add geolocate control to the map.
    this.map.addControl(
      new GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        // When active the map will receive updates to the device's location as it changes.
        trackUserLocation: true,
        // Draw an arrow next to the location dot to indicate which direction the device is heading.
        showUserHeading: true,
        showAccuracyCircle: this.accuracyCircle,

      })
    );

    this.busStops.forEach( busStop => {

      const marker = new Marker({
        color: '#C0FF00',
        draggable: false,
        rotation: 0
      })
        .setLngLat( busStop.lngLat )
        .addTo(this.map!)
    });


    // Get Uis Bus data
    this.subscription = this.BusData()

    this.mapListeners();
    this.readFromLocalStorage();
  }

  ngOnDestroy(): void {
    this.map?.remove();

    if ( this.subscription ){
      this.subscription.unsubscribe();
    }
  }

  BusData():Subscription {
    return this.mapsService.getBusInfo()
      .pipe(
        tap( () => {
          if ( this.busMarker ) {
            this.busMarker.remove();
          }
        })
      ).subscribe( busData => {
        console.log(busData);
        if ( busData !== null ) {
          this.busMarker = new Marker({
            color: 'red',
            draggable: false,
          })
            .setLngLat( [busData.Longitude, busData.Latitude] )
            .addTo(this.map!)

          if ( busData.Accident === true ){
            alert('¡Ha ocurrido un accidente!')
          }
        }
      })
  }

  mapListeners() {
    if (!this.map) throw 'Mapa no inicializado';

    this.map.on('zoom', (event) => {
      // console.log(event);
      this.zoom = this.map!.getZoom();
    });

    this.map.on('zoomend', () => {
      if (this.map!.getZoom() < 18) return;
      this.map!.zoomTo(18);
    });

    this.map.on('move', () => {
      this.currentLngLat = this.map!.getCenter();
    });
  }

  zoomIn() {
    this.map?.zoomIn();
  }

  zoomOut() {
    this.map?.zoomOut();
  }

  zoomChanged(value: string) {
    this.zoom = Number(value);
    this.map?.zoomTo(this.zoom);
  }

  createMarker() {
    if (!this.map) return;

    const color = '#xxxxxx'.replace(/x/g, (y) =>
      ((Math.random() * 16) | 0).toString(16)
    );
    const lngLat = this.map.getCenter();

    this.addMarker(lngLat, color, true);
  }

  addMarker(lnglat: LngLatLike, color: string, draggable: boolean) {
    if (!this.map) return;

    const marker = new Marker({
      color: color,
      draggable: draggable,
    })
      .setLngLat(lnglat)
      .addTo(this.map);

    this.markers.push({ color, marker });
    this.saveToLocalStorage();

    marker.on('dragend', () => this.saveToLocalStorage());
  }

  deleteMarker(index: number) {
    // Primero lo eliminamos del mapa
    this.markers[index].marker.remove();
    // Ahora lo eliminamos del arreglo
    this.markers.splice(index, 1);
    this.saveToLocalStorage();
  }

  flyTo(marker: Marker) {
    this.map?.flyTo({
      zoom: 16,
      center: marker.getLngLat(),
    });
  }

  flyToUIS() {
    this.map?.flyTo({
      zoom: 16,
      center: [ -73.1197226, 7.1399599],
    });
  }

  flyToUISBus() {
    if ( !this.busMarker ) return
    this.flyTo(this.busMarker)
  }

  saveToLocalStorage() {
    const plainMarkers: PlainMarker[] = this.markers.map(
      ({ color, marker }) => {
        return {
          color: color,
          lngLat: marker.getLngLat().toArray(),
        };
      }
    );

    localStorage.setItem('plainMarkers', JSON.stringify(plainMarkers));
  }

  readFromLocalStorage() {
    const plainMarkersString = localStorage.getItem('plainMarkers') ?? '[]';
    const plainMarkers: PlainMarker[] = JSON.parse(plainMarkersString);

    plainMarkers.forEach(({ lngLat, color }) => {
      const [lng, lat] = lngLat;
      const coords = new LngLat(lng, lat);

      this.addMarker(coords, color, false);
    });
  }
}
