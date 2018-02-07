/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {defineComponent} from '../../src/render3/index';
import {componentRefresh, container, containerRefreshEnd, containerRefreshStart, elementEnd, elementStart, listener, text, viewEnd, viewStart} from '../../src/render3/instructions';

import {containerEl, renderComponent, renderToHtml} from './render_util';


describe('event listeners', () => {
  let comps: MyComp[] = [];

  class MyComp {
    showing = true;
    counter = 0;

    onClick() { this.counter++; }

    static ngComponentDef = defineComponent({
      type: MyComp,
      tag: 'comp',
      /** <button (click)="onClick()"> Click me </button> */
      template: function CompTemplate(ctx: any, cm: boolean) {
        if (cm) {
          elementStart(0, 'button');
          {
            listener('click', ctx.onClick.bind(ctx));
            text(1, 'Click me');
          }
          elementEnd();
        }
      },
      factory: () => {
        let comp = new MyComp();
        comps.push(comp);
        return comp;
      }
    });
  }

  beforeEach(() => { comps = []; });

  it('should call function on event emit', () => {
    const comp = renderComponent(MyComp);
    const button = containerEl.querySelector('button') !;
    button.click();
    expect(comp.counter).toEqual(1);

    button.click();
    expect(comp.counter).toEqual(2);
  });

  it('should evaluate expression on event emit', () => {

    /** <button (click)="showing=!showing"> Click me </button> */
    function Template(ctx: any, cm: boolean) {
      if (cm) {
        elementStart(0, 'button');
        {
          listener('click', () => ctx.showing = !ctx.showing);
          text(1, 'Click me');
        }
        elementEnd();
      }
    }

    const ctx = {showing: false};
    renderToHtml(Template, ctx);
    const button = containerEl.querySelector('button') !;

    button.click();
    expect(ctx.showing).toBe(true);

    button.click();
    expect(ctx.showing).toBe(false);
  });

  it('should support listeners in views', () => {

    /**
     * % if (ctx.showing) {
       *  <button (click)="onClick()"> Click me </button>
       * % }
     */
    function Template(ctx: any, cm: boolean) {
      if (cm) {
        container(0);
      }
      containerRefreshStart(0);
      {
        if (ctx.showing) {
          if (viewStart(1)) {
            elementStart(0, 'button');
            {
              listener('click', ctx.onClick.bind(ctx));
              text(1, 'Click me');
            }
            elementEnd();
          }
          viewEnd();
        }
      }
      containerRefreshEnd();
    }

    let comp = new MyComp();
    renderToHtml(Template, comp);
    const button = containerEl.querySelector('button') !;

    button.click();
    expect(comp.counter).toEqual(1);

    button.click();
    expect(comp.counter).toEqual(2);

    // the listener should be removed when the view is removed
    comp.showing = false;
    renderToHtml(Template, comp);
    button.click();
    expect(comp.counter).toEqual(2);
  });

  it('should destroy listeners in nested views', () => {

    /**
     * % if (showing) {
       *    Hello
       *    % if (button) {
       *      <button (click)="onClick()"> Click </button>
       *    % }
       * % }
     */
    function Template(ctx: any, cm: boolean) {
      if (cm) {
        container(0);
      }
      containerRefreshStart(0);
      {
        if (ctx.showing) {
          if (viewStart(0)) {
            text(0, 'Hello');
            container(1);
          }
          containerRefreshStart(1);
          {
            if (ctx.button) {
              if (viewStart(0)) {
                elementStart(0, 'button');
                {
                  listener('click', ctx.onClick.bind(ctx));
                  text(1, 'Click');
                }
                elementEnd();
              }
              viewEnd();
            }
          }
          containerRefreshEnd();
          viewEnd();
        }
      }
      containerRefreshEnd();
    }

    const comp = {showing: true, counter: 0, button: true, onClick: function() { this.counter++; }};
    renderToHtml(Template, comp);
    const button = containerEl.querySelector('button') !;

    button.click();
    expect(comp.counter).toEqual(1);

    // the child view listener should be removed when the parent view is removed
    comp.showing = false;
    renderToHtml(Template, comp);
    button.click();
    expect(comp.counter).toEqual(1);
  });

  it('should destroy listeners in component views', () => {

    /**
     * % if (showing) {
       *    Hello
       *    <comp></comp>
       *    <comp></comp>
       * % }
     *
     * comp:
     * <button (click)="onClick()"> Click </button>
     */
    function Template(ctx: any, cm: boolean) {
      if (cm) {
        container(0);
      }
      containerRefreshStart(0);
      {
        if (ctx.showing) {
          if (viewStart(0)) {
            text(0, 'Hello');
            elementStart(1, MyComp);
            elementEnd();
            elementStart(3, MyComp);
            elementEnd();
          }
          MyComp.ngComponentDef.h(2, 1);
          MyComp.ngComponentDef.h(4, 3);
          componentRefresh(2, 1);
          componentRefresh(4, 3);
          viewEnd();
        }
      }
      containerRefreshEnd();
    }

    const ctx = {showing: true};
    renderToHtml(Template, ctx);
    const buttons = containerEl.querySelectorAll('button') !;

    buttons[0].click();
    expect(comps[0] !.counter).toEqual(1);

    buttons[1].click();
    expect(comps[1] !.counter).toEqual(1);

    // the child view listener should be removed when the parent view is removed
    ctx.showing = false;
    renderToHtml(Template, ctx);
    buttons[0].click();
    buttons[1].click();
    expect(comps[0] !.counter).toEqual(1);
    expect(comps[1] !.counter).toEqual(1);
  });

  it('should support listeners with sibling nested containers', () => {
    /**
     * % if (condition) {
     *   Hello
     *   % if (sub1) {
     *     <button (click)="counter1++">there</button>
     *   % }
     *
     *   % if (sub2) {
     *    <button (click)="counter2++">world</button>
     *   % }
     * % }
     */
    function Template(ctx: any, cm: boolean) {
      if (cm) {
        container(0);
      }
      containerRefreshStart(0);
      {
        if (ctx.condition) {
          if (viewStart(0)) {
            text(0, 'Hello');
            container(1);
            container(2);
          }
          containerRefreshStart(1);
          {
            if (ctx.sub1) {
              if (viewStart(0)) {
                elementStart(0, 'button');
                {
                  listener('click', () => ctx.counter1++);
                  text(1, 'Click');
                }
                elementEnd();
              }
              viewEnd();
            }
          }
          containerRefreshEnd();
          containerRefreshStart(2);
          {
            if (ctx.sub2) {
              if (viewStart(0)) {
                elementStart(0, 'button');
                {
                  listener('click', () => ctx.counter2++);
                  text(1, 'Click');
                }
                elementEnd();
              }
              viewEnd();
            }
          }
          containerRefreshEnd();
          viewEnd();
        }
      }
      containerRefreshEnd();
    }

    const ctx = {condition: true, counter1: 0, counter2: 0, sub1: true, sub2: true};
    renderToHtml(Template, ctx);
    const buttons = containerEl.querySelectorAll('button') !;

    buttons[0].click();
    expect(ctx.counter1).toEqual(1);

    buttons[1].click();
    expect(ctx.counter2).toEqual(1);

    // the child view listeners should be removed when the parent view is removed
    ctx.condition = false;
    renderToHtml(Template, ctx);
    buttons[0].click();
    buttons[1].click();
    expect(ctx.counter1).toEqual(1);
    expect(ctx.counter2).toEqual(1);

  });

});
