import { HttpClient } from "@angular/common/http";
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from "@angular/core";
import { PageEvent } from "@angular/material";
import {
  ReportModel,
  ReportFieldInterface,
  FieldQueryInterface
} from "serendip-business-model";
import * as sUtils from "serendip-utility";
import { ClubRatingViewComponent } from "src/app/crm/club-rating-view/club-rating-view.component";
import { ContactsViewComponent } from "src/app/crm/contacts-view/contacts-view.component";
import { DashboardService } from "src/app/dashboard.service";
import { DataService } from "src/app/data.service";
import * as _ from "underscore";

import { LongTextViewComponent } from "../report/long-text-view/long-text-view.component";
import { ObjectidViewComponent } from "../report/objectid-view/objectid-view.component";
import { ShortTextViewComponent } from "../report/short-text-view/short-text-view.component";
import { StarRatingViewComponent } from "../report/star-rating-view/star-rating-view.component";
import { CurrencyViewComponent } from "./currency-view/currency-view.component";
import { DateViewComponent } from "./date-view/date-view.component";
import {
  DashboardWidgetInterface,
  DashboardTabInterface
} from "serendip-business-model";

import { IdbService, Idb } from "src/app/idb.service";

import * as Moment from "moment";
import * as MomentJalaali from "moment-jalaali";
import * as sUtil from "serendip-utility";
import { ObService } from "src/app/ob.service";
import { ReportService } from "src/app/report.service";
import { PriceViewComponent } from "./price-view/price-view.component";

@Component({
  selector: "app-report",
  templateUrl: "./report.component.html",
  styleUrls: ["./report.component.less"]
})
export class ReportComponent implements OnInit {
  fieldDragging: ReportFieldInterface;
  @Output()
  WidgetChange = new EventEmitter<DashboardWidgetInterface>();

  @Output()
  DashboardCommand = new EventEmitter<{
    command: "open-tab";
    tab: DashboardTabInterface;
  }>();

  @Input() minimal: boolean;

  @Output()
  TabChange = new EventEmitter<DashboardTabInterface>();

  @Input() title: string;
  @Input() entityName: string;
  @Input() subtitle: string;
  @Input() icon = "folder-archive-open";

  @Input() entityLabelSingular: string;
  @Input() entityLabelPlural: string;

  @Input() reportName: string;

  @Input() pageSize = 20;
  @Input() pageIndex = 0;

  @Input() selected = [];

  _mode: "report" | "data" = "data";
  reportStore: Idb;
  @Input() page: any[];

  obServiceActive = true;
  reports: { label: string; value: string }[];
  formName: any;
  @Input() formId: any;
  @Input() reportId: string;
  set mode(value: "report" | "data") {
    this._mode = value;
  }

  get mode() {
    return this._mode;
  }
  _ = _;

  moment: typeof Moment = MomentJalaali;

  @Input() pageCount = 1;

  @Input()
  _report: ReportModel;
  set report(value: ReportModel) {
    this._report = value;

    this.page = [];
  }

  get report() {
    return this._report;
  }

  viewComponents = {
    // report views

    ObjectidViewComponent,
    ShortTextViewComponent,
    LongTextViewComponent,
    StarRatingViewComponent,
    DateViewComponent,
    CurrencyViewComponent,
    PriceViewComponent,
    // Business related  report views
    ClubRatingViewComponent,
    ContactsViewComponent
  };

  resultLoading = false;

  constructor(
    private dashboardService: DashboardService,
    private dataService: DataService,
    private idbService: IdbService,
    private reportService: ReportService,
    private changeRef: ChangeDetectorRef,
    private obService: ObService
  ) {}

  reportFieldDragStart(field, index, event) {
    this.fieldDragging = field;
  }

  reportFieldDragEnd(field, index, event) {
    this.fieldDragging = null;
  }

  reportFieldDrop(event) {
    this.fieldDragging = null;
    if (!event) {
      return;
    }
    if (!event.data) {
      return;
    }

    const eventData: { field: ReportFieldInterface; index: number } =
      event.data;

    if (!eventData.field) {
      return;
    }

    this.report.fields.splice(eventData.index, 1);
    this.report.fields.splice(
      event.index > eventData.index ? event.index - 1 : event.index,
      0,
      eventData.field
    );

    this.changeRef.detectChanges();
  }

  allSelected() {
    return this.selected.length === this.pageSize;
  }
  modelChange() {
    this.report._id = null;
    this.report.label = null;

    this.changeRef.detectChanges();
  }

  reportFieldInputsChange(name, newInputs) {
    this.report.fields = _.map(this.report.fields, item => {
      if (item.name === name) {
        item.template.inputs = newInputs;
      }

      return item;
    });

    this.modelChange();
  }

  objectKeys(obj) {
    return Object.keys(obj);
  }
  trackByFn(index: any, item: any) {
    return item._id;
  }

  getRangeLabel(page: number, pageSize: number, length: number) {
    if (length === 0 || pageSize === 0) {
      return sUtils.text.replaceEnglishDigitsWithPersian(`0 از ${length}`);
    }

    length = Math.max(length, 0);
    const startIndex = page * pageSize;
    const endIndex =
      startIndex < length
        ? Math.min(startIndex + pageSize, length)
        : startIndex + pageSize;
    return sUtils.text.replaceEnglishDigitsWithPersian(
      `${startIndex + 1} - ${endIndex} از ${length}`
    );
  }

  enabledReportFields(): ReportFieldInterface[] {
    return _.where(this.report.fields, { enabled: true });
  }
  extendObj(obj1, obj2) {
    return _.extend({}, obj1, obj2);
  }

  getViewComponent(name) {
    return this.viewComponents[name];
  }

  fieldQuerySelect(
    field: ReportFieldInterface,
    selectedQuery: FieldQueryInterface
  ) {
    field.queries = _.map(field.queries, q => {
      q.enabled = false;
      return q;
    });

    selectedQuery.enabled = true;
  }

  findEnabledFieldQuery(field: ReportFieldInterface) {
    return _.findWhere(field.queries, { enabled: true });
  }

  async deleteReport() {
    this.report.offline = false;
    await this.reportStore.delete(this.report.name);
  }
  async refresh() {
    // if (this.report.name === this.report.entityName + "-default") {
    //   this.result = {
    //     fields: this.report.fields,
    //     name: "",
    //     data: [],
    //     entityName: this.report.entityName,
    //     count: 0,
    //     createDate: new Date()
    //   };

    //   this.result.count = await this.dataService.count(this.report.entityName);
    //   this.pageCount = Math.floor(this.result.count / this.pageSize);
    //   this.changeRef.detectChanges();

    //   this.result.data = await this.dataService.list(
    //     this.report.entityName,
    //     skip,
    //     this.pageSize
    //   );
    // }
    this.resultLoading = true;

    const skip = this.pageIndex * this.pageSize;

    if (!this.report && this.reportName) {
      this.report = _.findWhere(this.dashboardService.schema.reports, {
        name: this.reportName
      }) as any;

      //   this.report.fields = [...this.report.fields, ...commonFields];
    }

    if (!this.report && this.reportId) {
      this.report = (await this.dataService.details(
        "report",
        this.reportId
      )) as any;

      console.log(this.report);
      //   this.report.fields = [...this.report.fields, ...commonFields];
    }

    if (!this.entityName) {
      this.entityName = this.report.entityName;
    }

    const primaryFields = _.findWhere(this.dashboardService.schema.reports, {
      name: "primary"
    }).fields;

    primaryFields.forEach(pf => {
      if (this.report.fields.filter(f => f.name === pf.name).length === 0) {
        this.report.fields.push(pf);
      }
    });

    this.report = await this.reportService.generate({
      entity: this.entityName,
      skip: skip,
      limit: this.pageSize,
      report: this.report,
      save: false
    });

    this.page = this.report.data;

    this.pageCount = Math.floor(this.report.count / this.pageSize);

    this.resultLoading = false;

    // this.WidgetChange.emit({
    //   inputs: {
    //     entityName: this.entityName,
    //     page: this.page,
    //     pageCount: this.pageCount
    //   }
    // });
  }

  async refreshReports() {
    const onlineReports = [];
    const offlineReports = [];

    // try {
    //   onlineReports = await this.dataService.reports(this.entityName);
    // } catch (error) {}

    // try {
    //   offlineReports = await this.reportStore.list(0, 100);
    // } catch (error) {}

    this.reports = _.chain([...offlineReports, ...onlineReports])
      .map(item => {
        return {
          label:
            item.label.trim() +
            " | " +
            sUtil.text.replaceEnglishDigitsWithPersian(
              this.moment(item.createDate).fromNow()
            ) +
            " | توسط " +
            item.user +
            item.offline
              ? " | آفلاین "
              : "",
          value: item._id
        };
      })
      .value();
  }

  sleep(timeout) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
  }
  async changeReport(reportId) {
    this.report = null;

    this.report = await this.reportStore.get(reportId);
    if (this.report) {
      this.report.offline = true;
    }

    if (!this.report) {
      this.report = { _id: reportId } as any;
    }

    await this.refresh();
  }

  async ngOnInit() {
    this.reportStore = await this.idbService.reportIDB();

    await this.refreshReports();

    //   if (!this.page) await this.changePage(0);
    await this.changePage(0);

    this.obService.listen(this.entityName).subscribe(event => {
      if (event.eventType !== "delete" && this.obServiceActive) {
        this.changePage(0);
      }
    });
    // setInterval(() => {
    //   this.WidgetChange.emit({
    //     inputs: { mode: this.mode, report: _.omit(this.report, ["data"]) }
    //   });
    // }, 1000);
  }

  activeFieldQueries() {
    if (
      !this.report ||
      !this.report.fields ||
      this.report.fields.length === 0
    ) {
      return [];
    }

    return this.report.fields.filter(
      item =>
        item.queries &&
        item.queries.length > 0 &&
        item.queries.filter(q => q.enabled).length > 0
    );
  }
  recordSelectChange(_id: string, event: { checked: boolean }) {
    if (event.checked) {
      if (this.selected.indexOf(_id) === -1) {
        this.selected.push(_id);
      }
    } else {
      if (this.selected.indexOf(_id) !== -1) {
        this.selected.splice(this.selected.indexOf(_id), 1);
      }
    }
  }

  allSelectChange($event) {
    if ($event.checked) {
      this.selected = this.getPage().map(item => {
        return item._id;
      });
    } else {
      this.selected = [];
    }
  }
  new() {
    this.DashboardCommand.emit({
      command: "open-tab",
      tab: {
        title: "ثبت " + this.title,
        active: true,
        icon: "office-paper-work-pen",
        widgets: [
          {
            component: "FormComponent",
            inputs: {
              name: this.formName,
              entityIcon: this.icon,
              formId: this.formId
            }
          }
        ]
      }
    });
  }

  edit() {
    this.selected.forEach(_id => {
      this.DashboardCommand.emit({
        command: "open-tab",
        tab: {
          title: "ویرایش " + this.title,
          active: true,
          icon: "office-paper-work-pen",
          widgets: [
            {
              component: "FormComponent",
              inputs: {
                name: this.formName,
                formId: this.formId,
                documentId: _id,
                entityIcon: this.icon
              }
            }
          ]
        }
      });
    });
  }

  async delete() {
    for (let i = 0; i < this.selected.length; i++) {
      await this.dataService.delete(this.report.entityName, this.selected[i]);
    }

    this.page = _.filter(this.page, item => {
      return this.selected.indexOf(item._id) === -1;
    });

    this.selected = [];

    this.changeRef.detectChanges();
  }

  getPage() {
    return this.report.data;
  }
  async changePage(iterate: number) {
    this.resultLoading = true;

    this.pageIndex += iterate;

    if (iterate !== 0) {
      this.selected = [];
    }

    await this.refresh();
    this.resultLoading = false;
  }
}
