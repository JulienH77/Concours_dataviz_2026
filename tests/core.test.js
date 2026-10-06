import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decode,aggregate,color,median,linePath,project,pathGeometry} from '../assets/core.js';

test('Un zéro est valide et un octet absent reste null',()=>{
 const bytes=new Uint8Array([0,255,200,20,50,180]);
 assert.equal(decode(bytes,0,0,3),0);
 assert.equal(decode(bytes,0,1,3),null);
 assert.equal(decode(bytes,1,2,3),90);
 assert.deepEqual(aggregate(bytes,0,[0,1,2],3),{n:2,low:1,high:1,median:50});
 assert.deepEqual(aggregate(bytes,0,[1],3),{n:0,low:0,high:0,median:null});
});
test('Les frontières de classes respectent <10 et >=90',()=>{
 assert.notEqual(color(9.5),color(10));assert.notEqual(color(89.5),color(90));
 assert.equal(color(null),'#a2acae');assert.equal(median([null,0,10]),5);
});
test('Une donnée manquante interrompt la courbe',()=>{
 const path=linePath([0,50,null,75,100]);
 assert.equal((path.match(/M/g)||[]).length,2);
 assert.equal((path.match(/L/g)||[]).length,2);
 assert.ok(!path.includes('NaN'));
});
test('Projection orientée au nord et polygones fermés',()=>{
 assert.ok(project(5,49)[1]<project(5,48)[1]);
 assert.ok(project(6,48)[0]>project(5,48)[0]);
 assert.ok(pathGeometry({type:'Polygon',coordinates:[[[4,48],[5,48],[5,49],[4,48]]]}).endsWith(' Z'));
});
