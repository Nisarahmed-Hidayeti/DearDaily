import { useEffect, useRef, useState } from 'react'
interface Turnstile { render(element:HTMLElement,options:{sitekey:string;callback:(token:string)=>void;'expired-callback':()=>void;'error-callback':()=>void;theme:'auto'}):string;remove(id:string):void }
declare global {interface Window { turnstile?:Turnstile }}
let loader:Promise<void>|null=null
function loadWidget() {
  if(window.turnstile)return Promise.resolve()
  if(loader)return loader
  loader=new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script')
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async=true;script.defer=true
    script.onload=()=>window.turnstile?resolve():reject(new Error('Verification unavailable'))
    script.onerror=()=>{loader=null;script.remove();reject(new Error('Verification unavailable'))}
    document.head.appendChild(script)
  })
  return loader
}
export default function BotCheck({siteKey,onToken}:{siteKey:string;onToken:(token:string)=>void}) {
  const target=useRef<HTMLDivElement>(null)
  const [failed,setFailed]=useState(false)
  useEffect(()=>{
    let active=true,id:string|undefined
    void loadWidget().then(()=>{
      if(!active||!target.current)return
      id=window.turnstile!.render(target.current,{sitekey:siteKey,theme:'auto',callback:token=>{if(active)onToken(token)},'expired-callback':()=>{if(active)onToken('')},'error-callback':()=>{if(active){onToken('');setFailed(true)}}})
    }).catch(()=>{if(active){onToken('');setFailed(true)}})
    return ()=>{active=false;if(id)window.turnstile?.remove(id)}
  },[siteKey,onToken])
  return <div className="bot-check"><div ref={target}/>{failed?<p role="alert">Verification could not load. Check your connection and reload; no request was sent.</p>:<p className="tiny muted">Complete the verification before continuing. This uses Cloudflare Turnstile.</p>}</div>
}
