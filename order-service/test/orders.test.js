import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateOrder } from '../orders.js';
import { prepList } from '../chef-prep.js';
const meal = (guac = false) => [
  { suffix:'', value:'chipotle' },
  ...['black-beans','sour-cream','salsa','corn-salsa','pico','chips','guacamole'].map(id=>({suffix:'-'+id,checked:id==='guacamole'&&guac})),
];
export const request = () => ({ id:crypto.randomUUID(), customer:{name:'Test Customer',phone:'3135550100',allergies:'',notes:''}, expectedTotalCents:6700, weeks:[{week:'2026-10-19',pickup:'Friday, please confirm',bundles:[[meal(true),meal(),meal(),meal()]]}] });
test('validates selections against canonical menu prices instead of trusting client prices',()=>{
 const body=request(); const result=validateOrder(body);assert.equal(result.totalCents,6700);assert.equal(result.weeks[0].bundles[0][0].extraCents,200);
 body.expectedTotalCents=6500;assert.throws(()=>validateOrder(body),e=>e.status===409);
});
test('rejects incomplete choices, unknown options, duplicate weeks and invalid contact details',()=>{
 for(const mutate of [b=>b.weeks[0].bundles[0].pop(),b=>b.weeks[0].bundles[0][0].push({suffix:'-invented',checked:true}),b=>b.weeks.push(b.weeks[0]),b=>b.customer.phone='',b=>b.weeks[0].bundles[0][0][0].value='unknown',b=>b.weeks[0].bundles[0][0][1].checked='yes']){
  const body=request();mutate(body);assert.throws(()=>validateOrder(body));
 }
});
test('counts nested loaded-potato upgrades and drops nonexistent selections',()=>{
 const values=[{suffix:'',value:'mix-match'},{suffix:'-meat',value:'salmon'},{suffix:'-side-1',value:'baked-potato'},{suffix:'-side-1-baked-potato-loaded',checked:true},{suffix:'-side-2',value:'broccoli'}];
 const body=request();body.weeks[0].week='2026-10-12';body.weeks[0].bundles=[[values,values,values,values]];body.expectedTotalCents=8300;
 assert.equal(validateOrder(body).extrasCents,1800);
 body.weeks[0].bundles[0][0]=values.filter(v=>!v.suffix.endsWith('loaded'));assert.throws(()=>validateOrder(body));
});
test('prep counts confirmed work only, separating variants, weeks and allergy notes',()=>{
 const base=validateOrder(request());const allergy=structuredClone(base);allergy.customer.allergies='Peanut allergy';
 const result=prepList([{status:'Confirmed',order:base},{status:'Cooking',order:allergy},{status:'New',order:base},{status:'Cancelled',order:base},{status:'Picked up',order:base}]);
 assert.equal(result.reduce((s,g)=>s+g.quantity,0),8);assert.equal(result.length,4);assert.equal(prepList([{status:'Ready',order:base}],'2026-10-26').length,0);
});
