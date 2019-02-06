import { HttpClient } from "@angular/common/http";
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from "@angular/core";
import {
  DashboardTabInterface,
  DashboardWidgetInterface,
  FormInterface,
  FormPartInterface
} from "serendip-business-model";
import { DashboardService } from "src/app/dashboard.service";
import * as _ from "underscore";

import { DataService } from "../../data.service";
import { Idb, IdbService } from "../../idb.service";

@Component({
  selector: "app-form",
  templateUrl: "./form.component.html",
  styleUrls: ["./form.component.less"]
})
export class FormComponent implements OnInit {
  constructor(
    public dataService: DataService,
    public httpClient: HttpClient,
    public ref: ChangeDetectorRef,
    private dashboardService: DashboardService,
    public idbService: IdbService
  ) {
    this.ProxyWidgetChange.subscribe(item => {
      this.WidgetChange.emit({ inputs: { model: this.model } });
      console.warn("ProxyWidgetChange", item, this.model);
    });
  }

  @Output()
  DashboardCommand = new EventEmitter<{
    command: "open-tab";
    tab: DashboardTabInterface;
  }>();

  _ = _;

  public ProxyWidgetChange = new EventEmitter();
  @Input() saveButtonText = "ثبت";
  @Input() saveButtonIcon = "save-backup-1";

  @Input() title: string;
  @Input() minimal: boolean;

  @Input()
  model: any = false;

  @Input()
  formSchema: FormInterface;
  @Input()
  formsSchema: FormInterface[];

  @Input() formId: string;

  @Input()
  entityName: string;

  @Input()
  entityIcon = "folder-archive-open";
  @Input()
  saveState: boolean;

  loading = false;

  @Input()
  defaultModel: any = {};
  @Input()
  private _mode: "form" | "triggers" = "form";
  public get mode(): "form" | "triggers" {
    return this._mode;
  }
  public set mode(value: "form" | "triggers") {
    if (this._mode !== value) {
      this.WidgetChange.emit({ inputs: { mode: value } });
    }

    this._mode = value;
  }

  @Input()
  documentId: string;

  @Input()
  formType: string;

  @Output()
  WidgetChange = new EventEmitter<DashboardWidgetInterface>();

  @Output()
  TabChange = new EventEmitter<DashboardTabInterface>();

  @Input()
  parts: FormPartInterface[];

  @Input()
  name: string;

  stateDb: Idb;

  wait(timeout) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
  }
  async save() {
    this.loading = true;
    let doc;
    if (!this.model._id) {
      doc = await this.dataService.insert(this.entityName, this.model);
    } else {
      doc = await this.dataService.update(this.entityName, this.model);
    }

    this.WidgetChange.emit({
      inputs: {
        model: doc,
        documentId: doc._id
      }
    });

    await this.wait(1500);

    this.loading = false;
  }

  async init(reset?: boolean) {
    if (!this.formsSchema) {
      this.formsSchema = this.dashboardService.schema.forms;
    }

    if (this.name) {
      this.formSchema = _.findWhere(this.formsSchema, { name: this.name });
    }
    if (this.formId) {
      this.formSchema = (await this.dataService.details(
        "form",
        this.formId
      )) as any;
    }

    if (!this.entityName) {
      if (this.formSchema && this.formSchema.entityName) {
        this.entityName = this.formSchema.entityName;
      }
    }

    if (this.documentId) {
      this.model = await this.dataService.details(
        this.entityName,
        this.documentId,
        false
      );
    }

    if (!this.model || reset) {
      // Object.keys(this.formSchema.defaultModel || {}).forEach(dKey => {
      //   if (
      //     typeof this.model[dKey] === "undefined" ||
      //     (this.model[dKey].length && this.model[dKey].length === 0)
      //   ) {
      //     this.model[dKey] = this.formSchema.defaultModel[dKey];
      //   }
      // });

      if (this.defaultModel && Object.keys(this.defaultModel).length > 0) {
        this.model = _.clone(this.defaultModel);
      } else {
        if (this.formSchema && this.formSchema.defaultModel) {
          this.model = _.clone(this.formSchema.defaultModel);
        } else {
          this.model = {};
        }
      }
    }
    if (!this.model) {
      this.model = {};
    }

    this.WidgetChange.emit({ inputs: { model: this.model } });
  }

  trackByFn(index: any, item: any) {
    return index;
  }

  findFormInSchema(formName): FormInterface {
    return _.findWhere(this.formsSchema, { name: formName });
  }

  async ngOnInit() {
    this.loading = true;

    await this.init();

    this.loading = false;
    this.ref.detectChanges();
  }
}
