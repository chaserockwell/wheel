import { Component, Input, ViewChild, SimpleChanges } from '@angular/core';
import { Events } from 'ionic-angular';
import { Observable } from 'rxjs';

import {OverviewService} from './services/overview-service';
declare var Hammer: any;

@Component({
	selector: 'overview-navigation',
	templateUrl: './views/navigation.html'
})

export class OverviewNavigation {
	@ViewChild('wheel') wheel: any;
	@Input() family: any;

	public activeItems: any = []; // We only have 5 items in here at a time.
	public inactiveItems: any = []; // This is where all the extra items are stored.
	public gesture: any;
	public translateX: string; // Our translateX string for transform
	public translations: any = { // These control the translateY movement of menu items
		item1: -50,
		item2: -20,
		item3: -10,
		item4: -20,
		item5: -50,
	};

	private translateXValue: number = 0;
	private lastDelta: number = 0; // This is where to start each pan event from.
	private lastVelocity: number = 0; // Right now we just use this to determine the direction the pan was going at the end.
	private yMap: any = {}; // We store the Y translations for each x value here.
	private touchStarted: boolean = false;
	private lastDirection: string = '';

	constructor(public overviewService: OverviewService, private events: Events){
		this.setupEventSubscriptions();
		this.setupYMap();
	}

	setupInitialValues() {
		this.setTranslateX();
	}

	// We need to setup a map for menu item y values as the x value of the menu changes
	setupYMap() {
		let thirdCount = 0;
		let tenthCount = 0;
		let thirdValue = 0;
		let tenthValue = 0;

		// So we loop from 0 - 100
		for (let i = 0; i <= 100; i++) {
			// And create an empty object for each number named y1, y2, y3, etc.
			this.yMap[`y${i}`] = {};

			// On every third number we need to add one to the thirdValue variable
			// and reset the thirdCount
			if (thirdCount === 3) {
			  thirdValue++;
				thirdCount = 0;
			}

			// Then on every tenth number we need to add one to the tenthValue variable
			// and reset the tenthCount
			if (tenthCount === 10) {
				tenthValue++;
				tenthCount = 0;
			}

			// Assign values to the map items
			this.yMap[`y${i}`].third = thirdValue;
			this.yMap[`y${i}`].tenth = tenthValue;

			// And add one to each count.
			thirdCount++;
			tenthCount++;
		}
	}

	initializePanGestureListener() {
		// Setup the hammer gesture
		this.gesture = new Hammer(this.wheel.nativeElement, {
			inputClass: Hammer.TouchInput // We need this for phone touch support
		});

		// Make sure we're only watching horizontal panning, we don't need vertical
		this.gesture.get('pan').set({ direction: Hammer.DIRECTION_HORIZONTAL });

		// Set event listener for panning
		this.gesture.on('panleft panright', event => {
			this.touchStarted = true;
			this.lastVelocity = event.velocityX;

			// The math is different for left pan and right pan so we need to
			// check for those here.
			if (event.additionalEvent === 'panleft') {
				// For left we'll subtract the last position - new position from
				// the current translateXValue
			  let xValue = this.translateXValue - Math.abs(this.lastDelta - Math.abs(event.deltaX));

				this.translateXValue = xValue;

				// If we're continuing a left move then update the item y translations
				if (this.lastDirection === 'left') {
					this.translations.item5 = -50 + this.yMap[`y${Math.abs(xValue) % 100}`].third;
					this.translations.item4 = -20 + this.yMap[`y${Math.abs(xValue) % 100}`].tenth;
					this.translations.item3 = -10 - this.yMap[`y${Math.abs(xValue) % 100}`].tenth;
					this.translations.item2 = -20 - this.yMap[`y${Math.abs(xValue) % 100}`].third;
				}

				// If we've gone the length of an item (100px) then we need to
				// push a new item into the array.
				if (Math.abs(xValue) >= 98) {
					// If we have inactiveItems, we'll push one from there.
					if (this.inactiveItems.length) {
						this.inactiveItems.unshift(this.activeItems.shift());
						this.activeItems.push(this.inactiveItems.pop());
					} else {
						// Otherwise we'll just push one from the other side of active items.
						this.activeItems.push(this.activeItems.shift());
					}

					this.translateXValue += Math.abs(xValue);

					// Then we need to reset the y values
					this.resetItemYTranslations();
				}

				this.lastDirection = 'left';
			} else if (event.additionalEvent === 'panright') {
				// If we're going right, we'll add the value instead of subtract
			  let xValue = this.translateXValue + Math.abs(this.lastDelta - Math.abs(event.deltaX));

				this.translateXValue = xValue;

				// Update the y values if we're continuing a right movement.
				if (this.lastDirection === 'right') {
					this.translations.item1 = -50 + this.yMap[`y${Math.abs(xValue) % 100}`].third;
					this.translations.item2 = -20 + this.yMap[`y${Math.abs(xValue) % 100}`].tenth;
					this.translations.item3 = -10 - this.yMap[`y${Math.abs(xValue) % 100}`].tenth;
					this.translations.item4 = -20 - this.yMap[`y${Math.abs(xValue) % 100}`].third;
				}

				// And check to see if we've moved the length of an item and
				// add to array accordingly.
				if (Math.abs(xValue) >= 98) {
					if (this.inactiveItems.length) {
						this.inactiveItems.push(this.activeItems.pop());
						this.activeItems.unshift(this.inactiveItems.shift());
					} else {
						this.activeItems.unshift(this.activeItems.pop());
					}

					this.translateXValue -= xValue;
					this.resetItemYTranslations();
				}

				this.lastDirection = 'right';
			}

			// Make sure we save the last delta position.
			this.lastDelta = Math.abs(event.deltaX);
			// And update the x translation.
			this.setTranslateX();
		});
	}

	resetItemYTranslations() {
		// Set the y translations back to the original values.
		this.translations = {
			item1: -50,
			item2: -20,
			item3: -10,
			item4: -20,
			item5: -50,
		};
	}

	initializeTouchEndEventListener() {
		// When the pan event ends we need to debounce it because for
		// some reason it might be called multiple times.
		Observable.fromEvent(this.wheel.nativeElement, 'touchend')
			.debounceTime(200) // Debounce 200ms
			.subscribe((event: any) => {
				this.lastDirection = '';
				if (this.touchStarted) {
					this.touchStarted = false;

					// Going Left
					if (this.lastVelocity < 0) {
						// If the menu is straddling two items and is closer to the Left
						// we'll add a new item to the array
						if (Math.abs(this.translateXValue) > 50) {
							this.inactiveItems.unshift(this.activeItems.shift());
							this.activeItems.push(this.inactiveItems.pop());
							this.translateXValue = 0;
							this.setTranslateX();
							this.resetItemYTranslations();
							// Otherwise we'll just reset the values.
						} else {
							this.translateXValue = 0;
							this.setTranslateX();
							this.resetItemYTranslations();
						}

					// Going Right
					} else {
						// Same thing happens down here except going right.
						if (Math.abs(this.translateXValue) > 50) {
							this.inactiveItems.push(this.activeItems.pop());
							this.activeItems.unshift(this.inactiveItems.shift());
							this.translateXValue = 0;
							this.setTranslateX();
							this.resetItemYTranslations();
						} else {
							this.translateXValue = 0;
							this.setTranslateX();
							this.resetItemYTranslations();
						}
					}

					// Reset the last delta position
					this.lastDelta = 0;
					// And open the item in the middle of the array.
					this.openComp(this.activeItems[2]);
				}
			}, error => {
				console.error(error);
			});
	}

	setTranslateX() {
		// Update x translation of wheel
		this.translateX = `translateX(${this.translateXValue}px)`;
	}

	setupEventSubscriptions() {
		this.events.subscribe('child:updated', (child) => {
			this.inactiveItems.find(navChild => {
				if (navChild.childUUID === child[0].uuid) {
				  navChild.avatar = child[0].avatar;
					return true;
				}
			});

			this.activeItems.find(navChild => {
				if (navChild.childUUID === child[0].uuid) {
				  navChild.avatar = child[0].avatar;
					return true;
				}
			});
		});
	}

	ngOnChanges(changes: SimpleChanges) {
		this.setUpNavItems();
		this.getChildren();
		this.setupInitialValues();
		this.initializePanGestureListener();
		this.initializeTouchEndEventListener();
	}

	setUpNavItems(){
		this.activeItems = [
			{
				icon: 'add',
				component: 1
			},
			{
				icon: 'about',
				component: 2
			},
			{
				icon: 'family',
				component: 0
			},
			{
				icon: 'feedback',
				component: 3
			},
			{
				icon: 'settings',
				component: 4
			}
		];
	}


	getChildren(){
		this.inactiveItems = [];

		for (let i = 0; i < this.family.length; i++) {
			if( i === 0 ){
				this.inactiveItems.push(
					{
						avatar: this.family[i].avatar,
						childName: this.family[i].name,
						childUUID: this.family[i].uuid,
						component: i + 5
					}
				);
			}else{
				this.inactiveItems.push(
					{
						avatar: this.family[i].avatar,
						childName: this.family[i].name,
						childUUID: this.family[i].uuid,
						component: i + 5
					}
				);
			}

		}
	}

	getCurrChild(child){
		// We need to check the activeItems array first
		let foundChild = this.activeItems.find(item => {
			return item.childUUID === child.uuid;
		});

		// But if it wasn't in there, we'll check the inactiveItems
		if (!foundChild) {
			foundChild = this.inactiveItems.find(item => {
				return item.childUUID === child.uuid;
			});
		}

		// And if we found it, we'll go to that child.
		if (foundChild) {
		  this.goToComp(foundChild);
		}
	}

	goToComp(item){
		if (item) {
			// Search for this item in both arrays
		  let activeIndex = this.activeItems.findIndex(activeItem => {
				return item.component === activeItem.component;
			});

			let inactiveIndex = this.inactiveItems.findIndex(inactiveItem => {
				return item.component === inactiveItem.component;
			});

			// If it's in the activeArray...
			if (activeIndex > -1) {
				// ... we'll check where it is in the array
			  if (activeIndex < 2) {
					// Here it's before the middle so we alter the array to the right
			    for (let i = 0; i < 2 - activeIndex; i++) {
						this.inactiveItems.push(this.activeItems.pop());
						this.activeItems.unshift(this.inactiveItems.shift());
			    }
			  } else if (activeIndex > 2) {
					// And here it's after the middle so we go left.
					for (let i = 0; i < activeIndex - 2; i++) {
						this.inactiveItems.unshift(this.activeItems.shift());
						this.activeItems.push(this.inactiveItems.pop());
			    }
				}
			} else if (inactiveIndex > -1) {
				// Here it's in the inactiveItems so we'll just go left the whole way.
				let loopCount = (this.inactiveItems.length - inactiveIndex) + 2;
			  for (let i = 0; i < loopCount; i++) {
					this.inactiveItems.unshift(this.activeItems.shift());
					this.activeItems.push(this.inactiveItems.pop());
			  }
			}

			// And then open the item component.
			this.openComp(this.activeItems[2]);
		}
	}

	openComp(item) {
		setTimeout(() => {
			this.overviewService.openComponent(item.component);
		}, 300);
	}

}
