import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CdkDragDrop, CdkDropList, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {fromEvent, Observable, Subject} from 'rxjs';
import {takeUntil, throttleTime} from 'rxjs/operators';
import {NzContextMenuService, NzDropdownMenuComponent, NzFormatBeforeDropEvent, NzMessageService} from 'ng-zorro-antd';
import {ItemArrSort, NoteService} from './note.service';
import {Res} from '../../../model/response';
import {Router} from '@angular/router';
import {LoginService} from '../../../login/login.service';
import {Note2Service} from '../note2/note2.service';
import {Note2Component} from '../note2/note2.component';
import {User} from '../../../model/user';
import {Item} from '../../../model/item';
import {Menu} from '../../../model/menu';

@Component({
    selector: 'app-note',
    templateUrl: './note.component.html',
    styleUrls: ['./note.component.less']
})
export class NoteComponent implements OnInit, AfterViewInit, OnDestroy {
    keyEnter: Observable<any> = fromEvent(window, 'keyup.enter');

    @ViewChild('treeNode') treeNode: Note2Component;

    @ViewChild('doneList', {static: true}) doneList: CdkDropList;
    @ViewChild('buttonEvent', {static: true}) buttonEvent: ElementRef;

    submitSubject: Subject<string> = new Subject();

    destroy$ = new Subject();
    user: User = new User();
    isSpinning = false;
    fieldContent = '';
    editId = null;
    size = 'small';
    activatedId = null;
    done = [];
    itemArrSort: ItemArrSort;

    activeItem: any;
    targetItem: any;

    // 表单拖动事件
    drop(event: CdkDragDrop<string[]>) {
        if (event.previousContainer === event.container) {
            // 同一区域内 移动数据
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
            this.updateItemSort();
        } else {
            // 不同区域内 移动数据
            // transferArrayItem(event.previousContainer.data._data,
            //     event.container.data,
            //     event.previousIndex,
            //     event.currentIndex);
        }
    }

    constructor(private msgService: NzMessageService,
                private noteService: NoteService,
                private loginService: LoginService,
                private note2Service: Note2Service,
                private route: Router,
                private nzContextMenuService: NzContextMenuService) {

    }


    ngOnInit(): void {
        this.onTreeDragEnd();

        this.getUser();
    }

    // 移动
    dragStarted(item: any, i: number, dragEl: HTMLElement) {
        this.noteService.dragSubject.next({item, index: i});
    }

    onTreeDragEnd() {
        this.note2Service.transTreeDragEnd.pipe(
            takeUntil(this.destroy$)
        )
            .subscribe(res => {
                console.log(res);
                this.addItemToOther(res.addKey, res.delKey.item.content);
                this.delItem(res.delKey.item);
            }, error => {
                console.log(error);
            });
    }

    startEdit(id: string) {
        this.editId = id;
    }

    stopEdit(item) {
        this.editId = null;
        this.editItem(item);
    }

    editItem(item) {
        console.log(item);
        this.noteService.editItem({itemId: item.itemId, content: item.content, pId: item.pId})
            .subscribe(
                res => {
                    this.getItems();
                }
            );
    }

    getMenuList(key?: string) {
        this.treeNode.isSpinning = true;
        this.noteService.getMenus().subscribe(res => {
            this.treeNode.isSpinning = false;
            this.treeNode.nodes = res;
            if (this.treeNode.activatedNode && key === this.treeNode.activatedNode.key) {
                this.clearList();
            }
        });
    }

    clearList() {
        this.done = [];
    }

    getUser() {
        this.noteService.getUser().subscribe((res: any) => {
            this.user = res;
            // 登录用户
            this.getMenuList();
        }, (error) => {
            console.log(error);
            if (error.status === 401) {
                if (!localStorage.getItem('uuid')) {
                    this.getUuid();
                } else {
                    this.getMenuList();
                }
            }
        });
    }

    getUuid() {
        console.log('get uuid');
        this.noteService.getUuid().subscribe((res: string) => {
            // 设置uuid
            this.noteService.uuidSubject.next(res);
            localStorage.setItem('uuid', res);
            // 获取菜单
            this.getMenuList();
        });
    }

    // 退出
    logout() {
        this.route.navigateByUrl('login');
        localStorage.removeItem('uuid');
        sessionStorage.removeItem('token');
    }

    // 活动节点变动
    activatedNodeChange(id) {
        const key = this.treeNode.activatedNode.key;
        if (this.activatedId === key) {
            return;
        } else {
            this.activatedId = key;
        }
        this.getItems();
    }


    submit() {
        if (this.treeNode.activatedNode) {
            this.submitSubject.next(this.fieldContent);
        } else {
            this.msgService.warning('请选择一个文件夹');
        }

    }

    addItem(content: string) {
        const key = this.treeNode.activatedNode.key;
        this.noteService.addItem({pId: key, content}).subscribe(
            res => {
                this.msgService.success('添加成功');
                this.getItems();
            }
        );
    }

    addItemToOther(key, content: string) {
        this.noteService.addItem({pId: key, content}).subscribe(
            res => {
                this.msgService.success('移动成功');
            }
        );
    }

    getItems() {
        const key = this.treeNode.activatedNode.key;
        this.isSpinning = true;
        this.noteService.getItems({pId: key}).subscribe(
            (res: Item[]) => {
                this.isSpinning = false;
                this.done = res;
            }
        );
    }

    // 删除节点
    delItem(item) {
        this.isSpinning = true;
        console.log(item);
        this.noteService.delItem(item.itemId).subscribe(
            res => {
                this.getItems();
            }
        );
    }

    //  节点排序
    updateItemSort() {
        let inb = 0;
        const tmpnode: Item = new Item();
        const itemArr = this.done.map((item, index) => {
            console.log(item);
            tmpnode.zindex = index + 1;
            tmpnode.itemId = item.itemId;
            tmpnode.pId = item.pId;
            console.log(item.content + '-->' + tmpnode.zindex);
            this.noteService.updateItemSort_gen(tmpnode).subscribe(
                res => {
                    console.log(res);
                    inb++;
                    if (inb ===  this.done.length) {
                        this.getItems();
                    }
                }
            );
            return item.id;
        });
        /*
        const mid = this.done[0].mid;
        this.noteService.updateItemSort({mid, item_id_arr: itemArr}).subscribe(
            res => {
                this.getItems();
            }
        );
        */
    }

    contextMenu($event: MouseEvent, menu: NzDropdownMenuComponent, item): void {
        this.done.map(x => x.active = false);
        item.active = true;
        this.nzContextMenuService.create($event, menu);
    }

    // 复制
    copy(item) {
        this.activeItem = item;
        this.treeNode.activeItemId = item.id;
        this.setMoveItem();
    }

    // 剪切
    cut(item) {
        this.activeItem = item;
        this.activeItem = item;
        this.treeNode.activeItemId = item.id;
        this.setMoveItem();
    }

    // // 粘贴
    // paste(item) {
    //     this.activeItem = item;
    // }

    // 设置子节点操作到菜单
    setMoveItem() {
        this.treeNode.moveItem.is_catalog = 2;
        this.treeNode.moveItem.drag_file = 'false';
    }


    ngAfterViewInit() {
        // 确认事件
        this.submitSubject.pipe(
            throttleTime(500), // 防抖函数
            takeUntil(this.destroy$) // 退订
        ).subscribe(res => {
            const key = this.treeNode.activatedNode.key;
            this.noteService.addItem({pId: key, content: res})
                .subscribe(
                    res2 => {
                        this.msgService.success('添加成功');
                        this.fieldContent = '';
                        this.getItems();
                    }
                );
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}

