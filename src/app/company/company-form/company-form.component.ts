

import { DashboardService } from "./../../dashboard.service";
import { ActivatedRoute, Router, NavigationEnd } from "@angular/router";
import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { FormArray, FormBuilder, FormGroup, Validators, FormControl } from "@angular/forms";
import { DataService } from "../../data.service";
import { InsertMessage } from "../../messaging/InsertMessage";
import { MessagingService } from "../../messaging.service";
import { Subscription } from "rxjs";
import IranStates from "../../geo/IranStates";
import * as _ from 'underscore';
import { MatChipInputEvent, MatAutocompleteSelectedEvent, MatChipInput, MatChipList, MatSnackBar } from "@angular/material";
import { COMMA, ENTER } from "@angular/cdk/keycodes";
import { GmapsService } from "../../gmaps.service";


@Component({
  selector: 'app-company-form',
  templateUrl: './company-form.component.html',
  styleUrls: ['./company-form.component.css']
})
export class CompanyFormComponent implements OnInit {

  companyForm: FormGroup;

  model: any = {
    socials: [],
    emails: []
  };
  routerSubscription: Subscription;
  iranStates: { "name": string; "Cities": { "name": string; }[]; }[];
  filteredPeople = [];

  cachedEmployees = [];

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];


  rpd(input) {
    if (!input) {
      input = "";
    }
    const convert = a => {
      return ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"][a];
    };
    return input.toString().replace(/\d/g, convert);
  }

  constructor(
    private messagingService: MessagingService,
    public fb: FormBuilder,
    private dataService: DataService,
    private activatedRoute: ActivatedRoute,
    public ref: ChangeDetectorRef,
    private gmapsService: GmapsService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dashboardService: DashboardService
  ) {
    this.iranStates = IranStates;
  }

  filterStates(input) {
    return _.filter(this.iranStates, (iState) => {
      return iState.name.indexOf(input) != -1
    })
  }

  filterCities(state, input) {
    if (!state)
      return [];

    if (this.filterStates(state).length == 1)
      state = this.filterStates(state)[0].name;
    else
      return [];

    return _.filter(_.findWhere(this.iranStates, { name: state }).Cities, (city) => {
      return city.name.indexOf(input) != -1
    })
  }


  getEmployee(_id) {

    if (this.cachedEmployees[_id])
      return this.cachedEmployees[_id];

    return null;

  }
  goEmployee(_id) {
    var person = this.getEmployee(_id);
    this.snackBar.open('اطلاعات موجود از ' + person.firstName + ' ' + person.lastName + ' را میخواهید؟', 'بله', { duration: 2000 }).onAction().subscribe(() => {
      console.log('go to person page');
    });
  }
  removeEmployee(contact, item) {
    contact.get('peoples').value.splice(contact.get('peoples').value.indexOf(item), 1)
  }

  async selectEmployee(contact, event: MatAutocompleteSelectedEvent) {
    contact.get('peoples').value.push(event.option.value);

    this.cachedEmployees[event.option.value] = await this.dataService.details<{ _id: string }>('people', event.option.value);

    contact.get('tempEmployee').setValue('');
    this.ref.detectChanges();
  }

  validateEmployees(contact) {
    contact.get('peoples').value = _.filter(contact.get('peoples').value, (item: string) => {
      return item.length == 24
    })
  }

  async filterPeople(input, currentValues) {
    if (input)
      this.filteredPeople = _.filter(await this.dataService.search('people', input, 10), (item: any) => {
        return currentValues.indexOf(item._id) == -1;
      });

  }
  save() {
    if (!this.companyForm.value._id) {
      this.dataService.insert("company", this.companyForm.value);
    } else {
      this.dataService.update("company", this.companyForm.value);
    }
  }

  reset() {
    this.companyForm.reset();
  }

  getFormArray(form, arrayName) {
    return (form as any).get(arrayName).controls;

  }

  setGeo(contact) {
    navigator.geolocation.getCurrentPosition((data) => {
      contact.get('address').get('geo').setValue(data.coords.latitude + ',' + data.coords.longitude)
      console.log(data);
    }, (error) => {
      console.error(error);
    });
  }

  goGeo(loc) {
    window.open(`https://www.google.com/maps/@${loc},16z?hl=fa`, '_blank');
  }

  async ngOnInit() {

    // this.routerSubscription = this.router.events.subscribe(event => {
    //   if (event instanceof NavigationEnd) {
    //     this.handleParams();
    //   }
    // });




    const params = this.activatedRoute.snapshot.params;


    this.companyForm = this.fb.group({
      _id: [""],
      name: ["", Validators.required],
      type: [[]],
      contacts: this.fb.array([
        this.fb.group({
          name: ["اطلاعات تماس اصلی"],
          faxes: this.fb.array(['']),
          telephones: this.fb.array(['']),
          peoples: this.fb.array([]),
          tempEmployee: [''],
          address: this.fb.group({
            text: [""],
            city: [""],
            state: [""],
            country: [""],
            postalCode: [""],
            geo: [""]
          })
        })
      ])
    });

    //.push(this.fb.control(''))
    this.companyForm.valueChanges.subscribe(data => { });

    if (params.id) {
      var model = await this.dataService.details('company', params.id);
      console.log(model);
      this.companyForm.patchValue(model);
     // this.dashboardService.setCurrentTab({ title: "ویرایش " + params.id });


      // TO Do cache Employees
    }

  }
  handleParams(): any {
    const params = this.activatedRoute.snapshot.params;
    if (params.id) {
     //this.dashboardService.setCurrentTab({ title: "ویرایش " + params.id });
    }
  }

  addMobile() {
    (this.companyForm.controls.mobiles as FormArray).push(
      this.fb.group({
        type: [""],
        value: [""]
      })
    );
  }

  removeMobile(index: number) {
    (this.companyForm.controls.mobiles as FormArray).removeAt(index);
  }

  addSocial() {
    (this.companyForm.controls.socials as FormArray).push(
      this.fb.group({
        type: [""],
        value: [""]
      })
    );
  }

  removeSocial(index: number) {
    (this.companyForm.controls.socials as FormArray).removeAt(index);
  }
}
