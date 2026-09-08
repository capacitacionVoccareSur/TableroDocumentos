import {chromium} from '@playwright/test'
const browser=await chromium.launch({channel:'msedge',headless:true})
try {
  for(const port of [5175]) {
    const page=await browser.newPage(); const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    page.on('response',r=>{if(r.status()>=400) errors.push(r.status()+' '+r.url())})
    try {
      await page.goto('http://127.0.0.1:'+port+'/',{timeout:10000})
      await page.waitForTimeout(2000)
      console.log(JSON.stringify({port,errors,state:await page.evaluate(()=>({title:document.title,canvas:!!document.querySelector('canvas'),buttons:document.querySelectorAll('.document-hit').length,overlay:!!document.querySelector('vite-error-overlay'),lost:document.querySelector('canvas')?.getContext('webgl2')?.isContextLost()}))}))
    } catch(e) {console.log(JSON.stringify({port,error:e.message}))}
    await page.close()
  }
} finally {await browser.close()}
