import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import * as Moment from 'moment'
import * as MomentJalaali from 'moment-jalaali'

import * as sUtil from 'serendip-utility';
import * as _ from 'underscore'
import { CalendarService } from '../calendar.service';


@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.less']
})
export class CalendarComponent implements OnInit {

  moment: typeof Moment;

  calendarsToShow = {};

  monthView = [];
  calendarView = "year";
  date;

  calendarType: "persian" | 'gregorian' = "persian";

  calendars = [
    { label: 'خدمات', value: 'service' },
    { label: 'شکایات', value: 'complaint' },
    { label: 'شرکت ها', value: 'company' },
    { label: 'اشخاص', value: 'people' },
    { label: 'فروش', value: 'sale' },
    { label: 'تعاملات', value: 'interaction' },
    { label: 'تقویم ایران', value: 'iran' }
  ];

  constructor(private changeRef: ChangeDetectorRef, private calendarService: CalendarService) {


  }

  calendarsToShowChange() {

    this.calendarService.CalendarsToShow = _.without(_.map(Object.keys(this.calendarsToShow), (key) => {
      if (this.calendarsToShow[key])
        return key;
    }), undefined);

    this.calendarService.emitCalendarsChange();

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

  typeChange() {

  }

  nextMonth() {
    this.date.add(1, 'month');
  }

  prevMonth() {
    this.date.add(-1, 'month');
  }


  nextYear() {
    this.date.add(1, 'year');
  }

  prevYear() {
    this.date.add(-1, 'year');
  }



  ngOnInit() {

    this.calendarsToShow = { iran: true };
    this.calendarsToShowChange();


    this.moment = MomentJalaali;
    this.moment.loadPersian({ dialect: 'persian-modern', usePersianDigits: false });

    this.date = this.moment();
  }

}