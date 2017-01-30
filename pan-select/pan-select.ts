import { Component, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
declare var Hammer: any;

@Component({
	selector: 'pan-select',
	templateUrl: 'pan-select.html'
})
export class PanSelectComponent {
	@ViewChild('wheel') wheel: any;
	@Input() items: Array<any>;
	@Input() selectedItemIndex: number;
	@Input() itemHeight: number;
	@Input() wheelWidth: number = 0;
	@Output() itemSelected = new EventEmitter();

	public gesture: any;
	public translateY: string;
	public isRounding: boolean = false;
	public isVelocityPan: boolean = false;

	private translateYValue: number = 0;
	private lastDelta: number = 0;
	private lastVelocity: number = 0;
	private minPanThreshold: number;
	private maxPanThreshold: number

	constructor() {}

	ngOnInit() {
		this.setupInitialValues();
		this.initializePanGestureListener();
		this.initializeTouchEndEventListener();
	}

	setupInitialValues() {
		this.minPanThreshold = -((this.items.length - 2) * this.itemHeight);
		this.maxPanThreshold = this.itemHeight;

		this.translateYValue = this.selectedItemIndex === 0 ? this.maxPanThreshold : -((this.selectedItemIndex - 1) * this.itemHeight);
		this.setTranslateY();
	}

	initializePanGestureListener() {
		this.gesture = new Hammer(this.wheel.nativeElement, {
			inputClass: Hammer.TouchInput
		});

		this.gesture.get('pan').set({ direction: Hammer.DIRECTION_VERTICAL });

		this.gesture.on('panup pandown', event => {
			this.lastVelocity = event.velocityY;

			if (event.additionalEvent === 'panup') {
			  let yValue = this.translateYValue - Math.abs(this.lastDelta - Math.abs(event.deltaY));

				this.translateYValue = yValue > this.minPanThreshold ? yValue : this.minPanThreshold;
			} else if (event.additionalEvent === 'pandown') {
			  let yValue = this.translateYValue + Math.abs(this.lastDelta - Math.abs(event.deltaY));

				this.translateYValue = yValue < this.maxPanThreshold ? yValue : this.maxPanThreshold;
			}

			this.lastDelta = Math.abs(event.deltaY);
			this.setTranslateY();
		});
	}

	initializeTouchEndEventListener() {
		Observable.fromEvent(this.wheel.nativeElement, 'touchend')
			.subscribe(event => {

				if (this.lastVelocity > 0.5 || this.lastVelocity < -0.5) {
				  this.isVelocityPan = true;

					if (this.lastVelocity > 0.5) {
					  this.translateYValue = this.roundToNearestItemThreshold(this.translateYValue + this.itemHeight);
					} else {
						this.translateYValue = this.roundToNearestItemThreshold(this.translateYValue - this.itemHeight);
					}

					if (this.translateYValue > this.maxPanThreshold)
					  this.translateYValue = this.maxPanThreshold;
					if (this.translateYValue < this.minPanThreshold)
						this.translateYValue = this.minPanThreshold;

					this.setTranslateY();
				} else {
					this.isRounding = true;
					this.translateYValue = this.roundToNearestItemThreshold(this.translateYValue);
					this.setTranslateY();
				}

				Observable.timer(500)
					.subscribe(time => {
						this.isRounding = this.isVelocityPan = false;
					}, error => {
						console.error(error);
					});

				this.lastDelta = this.lastVelocity = 0;
				this.selectedItemIndex = this.translateYValue > 0 ? 0 : Math.abs(this.translateYValue) / this.itemHeight + 1;

				let selectedItem = this.items[this.selectedItemIndex];

				this.itemSelected.emit(selectedItem);
			}, error => {
				console.error(error);
			});
	}

	setTranslateY() {
		this.translateY = `translateY(${this.translateYValue}px)`;
	}

	roundToNearestItemThreshold(value) {
		let high = Math.ceil(value / this.itemHeight) * this.itemHeight;
		let low = Math.floor(value / this.itemHeight) * this.itemHeight;
		let highDiff = high - value;
		let lowDiff = value - low;

		return highDiff > lowDiff ? low : high;
	}
}
