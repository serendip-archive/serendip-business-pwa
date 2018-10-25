import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import * as Moment from 'moment'
import * as MomentJalaali from 'moment-jalaali'

import * as sUtil from 'serendip-utility';
import * as _ from 'underscore'
import IranCalendarEvents from '../calendar.iran.events';
import { IdbService } from 'src/app/idb.service';
import { CalendarService } from 'src/app/calendar.service';

@Component({
  selector: 'app-calendar-month',
  templateUrl: './calendar-month.component.html',
  styleUrls: ['./calendar-month.component.less']
})
export class CalendarMonthComponent implements OnInit {


  moment: typeof Moment;

  layoutTimeout;

  @Input() size: "mini" | "large" = "large";
  @Input() showYearTitle: boolean;

  private _calendarType: "persian" | 'gregorian' = "persian";

  viewId: string;
  monthView: { events: any[], date: Date; class: string[]; formats: any; holiday: boolean }[];

  @Input() set calendarType(value: "persian" | 'gregorian') {

    this._calendarType = value;

    if (this.layoutTimeout)
      clearTimeout(this.layoutTimeout);
    this.layoutTimeout = setTimeout(() => {
      this.layoutDays();
    }, 100);

  }

  get calendarType(): "persian" | 'gregorian' {

    return this._calendarType;

  }


  @Input() fadeInDelay: number;

  private _month: number;

  @Input() set month(value: number) {

    if (!this._month) {
      this._month = value;
    } else {
      this._month = value;
      this.layoutDays();
    }

  }

  get month(): number {

    return this._month;

  }


  private _year: number;

  @Input() set year(value: number) {

    if (!this._year) {
      this._year = value;
    } else {
      this._year = value;


      this.layoutDays();


    }
  }

  get year(): number {

    return this._year;

  }


  constructor(private calendarService: CalendarService, private changeRef: ChangeDetectorRef) {

  }

  typeChange() {
    this.layoutDays();
  }

  getMonthName(monthNumber: number) {
    return this.calendarType == "persian" ? MomentJalaali('1400/' + (monthNumber) + '/1', 'jYYYY/jM/jD').format('jMMMM') : Moment.months(monthNumber - 1);
  }

  sleep(timeout) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, timeout);
    })
  }

  async layoutDays() {

    document.getElementById(this.viewId).classList.remove("fadeIn");


    this.monthView = await this.calendarService.fillDaysInMonth(this.month, this.year, this.calendarType);

    setTimeout(() => {
      document.getElementById(this.viewId).classList.add("fadeIn");
    }, this.size == 'mini' ? this.fadeInDelay || 100 + 70 * this.month : 10);

    this.layoutEvents().then(() => { }).catch(() => { });


  }

  async layoutEvents() {

    this.monthView.forEach(element => {
      if (element.class.indexOf("currentMonth") != -1)
        this.calendarService.findEvents(element.formats["YYYY/MM/DD"], element.formats["jYYYY/jMM/jDD"]).then((events) => {

          element.events = events;

          element.holiday = _.findWhere(events, { holiday: true });

        });
    });

  }


  async ngOnInit() {

    this.viewId = `month-view-${Math.random().toString().split('.')[1]}`;

    this.calendarService.subscribeToEventsChange(this.viewId).subscribe(() => {

      this.layoutEvents().then(() => { }).catch(() => { });

    });

  }

  rpd(input) {
    if (!input) {
      input = "";
    }
    const convert = a => {
      return ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"][a];
    };
    return input.toString().replace(/\d/g, convert);
  }

}
