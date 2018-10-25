import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { DashboardService } from '../dashboard.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CrmService } from '../crm.service';
import { GmapsService } from '../gmaps.service';
import * as _ from 'underscore'
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.less']
})
export class MapComponent implements OnInit, OnDestroy {

  private _map: google.maps.Map;

  @Input() mapId: string;

  public mapVisible = false;
  public mapMode: 'explore' | 'select-single' | 'select-multi' | 'analytics';
  private mapClickListener: google.maps.MapsEventListener;
  public mapMarkers: google.maps.Marker[] = [];
  subscription_OnSetVisible: Subscription;
  subscription_OnSetMode: Subscription;
  subscription_OnSetMarkers: Subscription;
  subscription_OnSelectSingle: Subscription;

  constructor(
    public dashboardService: DashboardService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private changeRef: ChangeDetectorRef,
    public crmService: CrmService,
    public gmapsService: GmapsService,
  ) {

  }

  private addMarker(latLng: google.maps.LatLng | { lat: number, lng: number }): google.maps.Marker {

    console.log("addMarker", latLng, Date.now(), this.mapMarkers.length);
    if (!this._map)
      return;

    var marker = new google.maps.Marker({
      position: latLng,
      map: this._map
    });

    this.mapMarkers.push(marker);

    this._map.panTo(latLng);

    this.changeRef.detectChanges();

    console.log(this.mapMarkers.length);


    return marker;
  }


  public clearAllMarkers() {

    this.mapMarkers.forEach((item) => {
      item.setMap(null);
    });

    this.mapMarkers = [];

    this.changeRef.detectChanges();


  }

  public selectDone() {

    this.gmapsService.emitSelectDone({
      mapId: this.mapId,
      positions: _.map(this.mapMarkers, (marker) => {
        return marker.getPosition().toJSON();
      })
    });

    this.mapVisible = false;

  }

  public selectCancel() {

    this.mapVisible = false;
    this.gmapsService.emitSelectCancel({ mapId: this.mapId });

  }

  async wait(timeout: number) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
  }

  private async bindMapEvents(map: google.maps.Map) {


    this.mapClickListener = map.addListener('click', (e) => {
      if (this.mapMode.indexOf("select-") == 0) {
        if (this, this.mapMode == "select-single")
          this.clearAllMarkers();


        this.addMarker(e.latLng);
        this._map.panTo(e.latLng);

      }
    });

  }

  async map(): Promise<google.maps.Map> {

    if (!this._map) {
      this._map = await this.gmapsService.newMap({ mapWrapper: document.getElementById(this.mapId) });

      this.bindMapEvents(this._map);
    }

    return this._map;

  }


  async ngOnInit() {


    if (!this.mapId)
      this.mapId = `gmap-${Date.now()}`;


    console.log(`${this.mapId} being initialized.`);



    this.subscription_OnSetMode = this.gmapsService.subscribeOnSetMode(this.mapId).subscribe((mode) => {

      console.log(`${this.mapId} received setMode ${mode}`);

      this.mapMode = mode as any;

      this.changeRef.detectChanges();


    });


    this.subscription_OnSetVisible = this.gmapsService.subscribeOnSetVisible(this.mapId).subscribe((visible) => {
      console.log(`${this.mapId} received setVisible ${visible}`);
      this.mapVisible = visible;
      this.changeRef.detectChanges();
    });


    this.subscription_OnSetMarkers = this.gmapsService.subscribeOnSetMarkers(this.mapId).subscribe((positions) => {
      this.clearAllMarkers();
      positions.forEach((pos: { lat: number, lng: number }) => {
        this.addMarker(pos);
      });
    });


    this.subscription_OnSelectSingle = this.gmapsService.subscribeOnSelectSingle(this.mapId).subscribe(async (positions) => {


      this.mapMode = "select-single";
      this.mapVisible = true;

      await this.map();

      this.clearAllMarkers();

      positions.forEach(element => {

        this.addMarker(element);

      });

    });

  }

  ngOnDestroy(): void {

    if (this._map)
      this._map.unbindAll();


    if (this.subscription_OnSetVisible)
      this.subscription_OnSetVisible.unsubscribe();

    if (this.subscription_OnSetMode)
      this.subscription_OnSetMode.unsubscribe();

    if (this.subscription_OnSetMarkers)
      this.subscription_OnSetMarkers.unsubscribe();



  }



}