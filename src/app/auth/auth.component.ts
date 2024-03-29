import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { AuthService } from "../auth.service";
import { Router, ActivatedRoute, NavigationEnd } from "@angular/router";
import { DomSanitizer } from "@angular/platform-browser";
import { DataService } from "../data.service";
import * as _ from "underscore";
import { MatSnackBar } from "@angular/material";
import { TokenModel } from "serendip-business-model";
import { querystring } from "serendip-utility";
import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";
import { DashboardService } from '../dashboard.service';

@Component({
  selector: "app-auth",
  templateUrl: "./auth.component.html",
  styleUrls: ["./auth.component.less"]
})
export class AuthComponent implements OnInit {
  loading = false;
  tab = "login";
  model: any = { mobileCountryCode: "+98" };

  day = true;
  username: string;
  activationMessage: string;

  message: string;
  messageTimeout: any;
  token: TokenModel;
  profile: any;

  states: any[] = [];
  cities: any[] = [];
  initiating = true;
  qs: any;

  replacePersianDigits(input) {
    if (!input) {
      input = "";
    }
    const map = [
      "&#1632;",
      "&#1633;",
      "&#1634;",
      "&#1635;",
      "&#1636;",
      "&#1637;",
      "&#1638;",
      "&#1639;",
      "&#1640;",
      "&#1641;"
    ];

    return this.sanitizer.bypassSecurityTrustHtml(
      input.toString().replace(/\d(?=[^<>]*(<|$))/g, function ($0) {
        return map[$0];
      })
    );
  }
  constructor(
    public snackBar: MatSnackBar,
    public router: Router,
    public authService: AuthService,
    public dashboardService: DashboardService,
    public activatedRoute: ActivatedRoute,
    public ref: ChangeDetectorRef,
    public dataService: DataService,
    private http: HttpClient,
    public sanitizer: DomSanitizer
  ) { }

  async login(mode?: "user-pass" | "two-factor" | "one-time") {
    if (mode === "user-pass") {
      this.model.oneTimePassword = this.model.password;
    }

    try {
      this.loading = true;

      if (mode === "user-pass") {
        await this.authService.login(
          this.model.username,
          "",
          this.model.password,
          ""
        );
      }

      if (mode === "one-time") {
        await this.authService.login(
          "",
          this.model.mobile,
          "",
          this.model.oneTimePassword
        );
      }

      if (mode === "two-factor") {
        await this.authService.login(
          "",
          this.model.mobile,
          this.model.password,
          this.model.oneTimePassword
        );
      }

      if (localStorage.getItem("lastUrl")) {
        const url = localStorage.getItem("lastUrl");

        localStorage.removeItem("lastUrl");
        this.router.navigateByUrl(url);
      } else {
        this.router.navigateByUrl("/");
      }
    } catch (res) {
      if (res.error && res.error.description === "include password") {
        this.router.navigate(["/auth", "two-factor"]);
      } else {
        switch (res.status) {
          case 0:
            this.showMessage("ارتباط شما با سرور یا اینترنت قطع است.");
            break;
          case 400:
            this.showMessage("شماره موبایل یا رمز عبور وارد شده اشتباه است.");
            break;
          case 403:
            this.showMessage("حساب کاربری خود را فعال کنید.");
            break;
          default:
            this.showMessage(
              "سرور قادر به پاسخگویی نیست لطفا دوباره تلاش کنید."
            );
            break;
        }
      }
    }

    this.loading = false;
  }

  removeMobileZero() {
    if (typeof this.model.mobile !== "undefined") {
      this.model.mobile = this.model.mobile.replace(/^0/, "").replace(/ /, "");
    }
  }
  async sleep(timeout) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
  }
  async sendOneTimePassword() {
    if (this.model.mobile) {
      this.loading = true;
      //   await this.sleep(3000);
      try {
        await this.authService.sendOneTimePassword(
          this.model.mobile,
          this.model.mobileCountryCode
        );
        this.router.navigate(["/auth", "code"]);
      } catch (error) {
        switch (error.status) {
          case 0:
            this.showMessage("ارتباط شما با سرور یا اینترنت قطع است.");
            break;
          case 400:
            this.showMessage("فیلدهای ورودی را بازبینی کنید.");
            break;
          default:
            this.showMessage(
              "سرور قادر به پاسخگویی نیست لطفا دوباره تلاش کنید."
            );
            break;
        }
      }
      this.loading = false;
    }
  }

  async changepw(model) {
    if (model.password.length < 8) {
      return this.showMessage("حداقل طول رمز عبور 8 کارکتر میباشد.");
    }
    if (model.password !== model.passwordConfirm) {
      return this.showMessage("رمز عبور و تکرار آن یکی نیستند.");
    }

    try {
      this.loading = true;
      await this.dataService.request({
        method: "POST",
        model: model,
        path: "/api/auth/changePassword",
        retry: false
      });
      this.loading = false;

      this.showMessage("رمز شما تغییر یافت");
    } catch (error) {
      switch (error.status) {
        case 0:
          this.showMessage("ارتباط شما با سرور یا اینترنت قطع است.");
          break;
        case 400:
          this.showMessage("فیلدهای ورودی را بازبینی کنید.");
          break;
        default:
          this.showMessage("سرور قادر به پاسخگویی نیست لطفا دوباره تلاش کنید.");
          break;
      }
      this.loading = false;
    }
  }

  async resetPassword(model) {
    try {
      this.loading = true;
      await this.authService.resetPassword(
        model.mobile,
        model.code,
        model.password,
        model.passwordConfirm
      );
      this.loading = false;

      model.username = model.mobile;

      this.showMessage("رمز شما با موفقیت تعییر یافت. درحال ورود به سیستم ...");

      setTimeout(() => {
        this.login();
      }, 3000);
    } catch (error) {
      this.showMessage("شماره موبایل یا کد وارد شده اشتباه است .");
    }
  }

  async sendResetPasswordToken(model) {
    try {
      this.loading = true;
      await this.authService.sendResetPasswordToken(model.mobile);

      this.tab = "reset";
    } catch (error) {
      switch (error.status) {
        case 0:
          this.showMessage("ارتباط شما با سرور یا اینترنت قطع است.");
          break;
        case 400:
          this.showMessage("شماره موبایل یا کد وارد شده اشتباه است.");
          break;
        default:
          this.showMessage("سرور قادر به پاسخگویی نیست لطفا دوباره تلاش کنید.");
          break;
      }
    }

    this.loading = false;
  }

  async activate(model) {
    try {
      this.loading = true;
      await this.authService.verifyMobile(model.mobile, model.code);
      this.tab = "login";
      this.showMessage("حساب شما فعال شد.وارد اکانت خود شوید.");
    } catch (error) {
      switch (error.status) {
        case 0:
          this.showMessage("ارتباط شما با سرور یا اینترنت قطع است.");
          break;
        case 400:
          this.showMessage("شماره موبایل یا کد وارد شده اشتباه است.");
          break;
        default:
          this.showMessage("سرور قادر به پاسخگویی نیست لطفا دوباره تلاش کنید.");
          break;
      }
    }

    this.loading = false;
  }

  async sendVerify(model) {
    try {
      this.loading = true;
      await this.authService.sendVerify(model.mobile);

      this.showMessage("کد تایید ارسال شد.");
      this.loading = false;
    } catch (error) {
      switch (error.status) {
        case 0:
          this.showMessage("ارتباط شما با سرور یا اینترنت قطع است.");
          break;
        case 400:
          this.showMessage("شماره موبایل وارد شده اشتباه است.");
          break;
        default:
          this.showMessage("سرور قادر به پاسخگویی نیست لطفا دوباره تلاش کنید.");
          break;
      }
    }

    this.loading = false;
  }

  showMessage(msg) {
    const snackRef = this.snackBar.open(msg, "بستن", {
      duration: 3000
    });
    snackRef.onAction().subscribe(() => {
      snackRef.dismiss();
    });
  }

  validateLogin(model) {
    if (!model.username || !model.password) {
      return "وارد کردن تمامی فیلد ها الزامیست.";
    }

    return "";
  }

  validateRegister(model) {
    if (
      !model.name ||
      !model.username ||
      !model.password ||
      !model.passwordConfirm
    ) {
      return "وارد کردن تمامی فیلد ها الزامیست.";
    }

    if (
      !model.username.startsWith("09") ||
      // tslint:disable-next-line:radix
      parseInt(model.username).toString().length !== 10
    ) {
      return "شماره موبایل وارد شده معتبر نیست. مثال : 09120129887";
    }

    if (model.password.length < 8) {
      return "حداقل طول رمز عبور 8 کارکتر میباشد.";
    }
    if (model.password !== model.passwordConfirm) {
      return "رمز عبور و تکرار آن یکی نیستند.";
    }

    return "";
  }

  async register(model) {
    this.loading = true;
    this.model.mobile = model.username;
    try {
      await this.authService.register(model.username, model.password);
      //  await this.dataService.post({ name: model.name }, 'profile', 'save', true);
      this.loading = false;

      this.tab = "activate";
      this.ref.detectChanges();
    } catch (errRes) {
      const err = errRes.error;

      if (err.message === "mobile already exists") {
        this.showMessage("شماره وارد شده قبلا ثبت نام شده است.");
      } else if (err.code === 400) {
        this.showMessage("شماره موبایل و رمز وارد شده را بازبینی کنید.");
      }

      if (err.code === 500) {
        this.showMessage("لطفا مجددا تلاش کنید.");
      }

      if (err.code === 0) {
        this.showMessage("لطفا مجددا تلاش کنید.");
      }

      this.loading = false;
    }
  }

  loginWithCode() { }
  async logout() {
    await this.authService.logout();

    this.router.navigate(["/auth", "login"]);
  }

  handleParams(params) {
    this.tab = params.tab || "login";

    if (this.tab === "user-pass") {
      if (this.model.mobile) {
        this.model.username = this.model.mobile;
      }
    }
  }
  async ngOnInit() {
    this.dataService.setCurrentServer();
    this.initiating = true;
    try {
      await this.authService.token();
    } catch (error) { }

    this.qs = querystring.toObject(location.href.toString());

    if (this.qs.code && this.qs.codeId && this.qs.redirectUri) {
      try {
        localStorage.setItem(
          "token",
          JSON.stringify(
            await this.http
              .post(
                this.dataService.currentServer + "/api/auth/token",
                {
                  grant_type: "authorization_code",
                  code: decodeURIComponent(this.qs.code),
                  codeId: decodeURIComponent(this.qs.codeId),
                  redirectUri: decodeURIComponent(this.qs.redirectUri)
                },
                {
                  headers: {
                    clientId: "serendip-business-pwa"
                  }
                }
              )
              .toPromise()
          )
        );

        location.href = "/";
      } catch (error) {
        setTimeout(() => {
          // tslint:disable-next-line:max-line-length
          location.href = `${environment.sso}/?redirectUri=${encodeURIComponent(
            location.href.toString()
          )}&clientId=serendip-business-pwa`;
        }, 1000);

        return;
      }
    }

    if (!this.authService.loggedIn && environment.sso) {
      if (!querystring.toObject(location.href.toString()).code) {
        location.href = `${environment.sso}/?redirectUri=${encodeURIComponent(
          location.href.toString()
        )}&clientId=serendip-business-pwa`;
        return;
      }
    }

    this.handleParams(this.activatedRoute.snapshot.params);

    this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationEnd) {
        this.handleParams(this.activatedRoute.snapshot.params);
      }
    });
    if (this.authService.loggedIn) {
      if (localStorage.getItem("lastUrl")) {
        this.router.navigateByUrl(localStorage.getItem("lastUrl"));
      } else {
        this.router.navigateByUrl("/");
      }
    } else {
      if (!this.model.mobile && this.tab !== "user-pass") {
        this.router.navigate(["/auth", "login"]);
      }
    }

    this.initiating = false;
  }
}
