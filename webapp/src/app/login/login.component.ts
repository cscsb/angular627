import {ChangeDetectionStrategy, Component, HostListener, OnInit, Renderer2} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

import {LoginService} from './login.service';
import {RegisterUser, ResetPwd, User} from '../model/user';
import {Res} from '../model/response';
import {NzMessageService} from 'ng-zorro-antd';
import {LoginToken} from '../model/login-token';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.less'],
})
export class LoginComponent implements OnInit {

    scale = 1;
    model = {};
    hide = true;
    user: User = new User();
    registerUser = new RegisterUser();
    resetPwd = new ResetPwd();
    translate = false;
    Visible = false;
    resetVisible = false;
    isOkLoading = false;
    findBackEmail: string;

    @HostListener('window:resize', ['$event'])
    onresize(event): void {
        let size = event.target.outerHeight / 768;
        if (size > 1.2) {
            size = 1.2;
        }
        if (size < 1) {
            size = 1;
        }
        this.scale = size;
    }

    constructor(private loginService: LoginService,
                private messageService: NzMessageService,
                private router: Router, private activatedroute: ActivatedRoute) {
    }

    ngOnInit() {
        this.activatedroute.paramMap.subscribe(params => {
            if (params.get('doaction') === 'doregister') {
                this.registerBox();
            }
        });
    }

    formSubmit(): void {


    }

    getScale() {
        return {
            transform: `scale(${this.scale})`
        };
    }

    login() {
        console.log('loggin in ');
        this.loginService.login(this.user).subscribe((res: LoginToken) => {
            this.loginService.tokenSubject.next(res.token);

            // 保存token至sessionStorage
            sessionStorage.setItem('token', res.token);

            this.router.navigate(['/home']);
        },
            (error) => {
                this.messageService.warning('Invalid login');
            });
    }

    register() {
        this.loginService.register(this.registerUser).subscribe(
            res => {
                this.messageService.success('注册成功');
                this.user.userName = this.registerUser.userName;
                this.user.password = this.registerUser.password;
                this.login();
                this.loginBox();
            },
            (error) => {
                this.messageService.warning('Invalid parameters');
            }
        );
    }


    registerBox() {
        this.translate = true;
    }


    loginBox() {
        this.translate = false;
    }

    showModal(): void {
        this.Visible = true;
    }

    handleFindBackOk(): void {
        this.Visible = false;

        this.loginService.retrievePwd(this.findBackEmail).subscribe(
            res => {
                console.log(res);
            }
        );
    }
    handleFindBackCancel(): void {
        this.Visible = false;
    }

    resetCancel(): void {
        this.resetVisible = false;
    }

    resetShowModal(): void {
        this.resetVisible = true;
    }

    resetBackOk(): void {
        this.resetVisible = false;

        this.loginService.resetPwd(this.resetPwd).subscribe(
            res => {
                console.log(res);
            }
        );
    }
}
