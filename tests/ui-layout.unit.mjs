import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLayout, defaults, toggleLayout, effectiveLayout, layoutKey } from '../src/features/hud/useHudLayout.js';
test('default preferences', () => assert.deepEqual(readLayout({getItem:()=>null}),defaults()));
test('damaged JSON remains readable and falls back', () => { let raw='{bad'; assert.deepEqual(readLayout({getItem:()=>raw}),defaults()); assert.equal(raw,'{bad'); });
test('unavailable storage falls back', () => assert.deepEqual(readLayout({getItem(){throw Error();}}),defaults()));
test('invalid fields fall back individually', () => assert.deepEqual(readLayout({getItem:()=>'{"left":true,"right":7}'}),{left:true,right:false,map:true}));
test('desktop sides independent', () => assert.deepEqual(toggleLayout(defaults(),'left'),{left:true,right:false,map:true}));
test('mobile drawer exclusive', () => assert.deepEqual(toggleLayout({left:true,right:false,map:true},'left',true),{left:false,right:true,map:true}));
test('focus folds task and preserves preference', () => { const p=defaults(); assert.equal(effectiveLayout(p,true).left,true); assert.equal(effectiveLayout(p,false).left,false); });
test('keyboard maps brackets and ignores text/repeat/modifiers', () => { assert.equal(layoutKey({key:'['}),'left'); assert.equal(layoutKey({key:']'}),'right'); for(const extra of [{repeat:true},{ctrlKey:true},{target:{tagName:'INPUT'}},{target:{isContentEditable:true}}]) assert.equal(layoutKey({key:'[',...extra}),null); });

