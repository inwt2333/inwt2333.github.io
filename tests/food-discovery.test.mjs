import test from 'node:test';
import assert from 'node:assert/strict';
import {foodCandidates, drawWithoutRepeat, boardPage} from '../assets/food/discovery.mjs';
const meals=[{date:'2026-11-02',photos:[{file:'a',dishes:[{name:'面'},{name:'包子'}]},{file:'b',dishes:[]}]},{date:'2026-11-01',photos:[{file:'c',dish:'甜品'}]}];
test('every dish is a candidate; unnamed photos remain discoverable',()=>{const pool=foodCandidates(meals);assert.equal(pool.length,4);assert.equal(pool[0].dish.name,'面');assert.equal(pool[2].dish,null);assert.equal(pool[3].dish.name,'甜品');});
test('draws exhaust the bag before repeating and avoid immediate repeat across cycles',()=>{let state={remaining:[],last:null};let cycle=[];for(let i=0;i<9;i++){const result=drawWithoutRepeat(['a','b','c'],state,()=>0);if(state.last!==null)assert.notEqual(result.value,state.last);state=result.state;cycle.push(result.value);}for(let i=0;i<9;i+=3)assert.equal(new Set(cycle.slice(i,i+3)).size,3);});
test('empty and single item bags work',()=>{assert.equal(drawWithoutRepeat([],{}).value,null);assert.equal(drawWithoutRepeat(['a'],{}).value,'a');});
test('board paging wraps and never duplicates a small collection',()=>{assert.deepEqual(boardPage([1,2],0),[1,2]);assert.deepEqual(boardPage([1,2,3,4],1),[4,1,2]);assert.deepEqual(boardPage([],3),[]);});
