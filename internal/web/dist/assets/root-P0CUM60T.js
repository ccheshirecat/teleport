import{o as m,p as y,q as f,t as g,r as i,_ as x,n as t,O as w,M as S,L as j,S as k}from"./components-qZBQBQPF.js";/**
 * @remix-run/react v2.16.7
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */let a="positions";function M({getKey:e,...l}){let{isSpaMode:c}=m(),o=y(),p=f();g({getKey:e,storageKey:a});let u=i.useMemo(()=>{if(!e)return null;let s=e(o,p);return s!==o.key?s:null},[]);if(c)return null;let h=((s,d)=>{if(!window.history.state||!window.history.state.key){let r=Math.random().toString(32).slice(2);window.history.replaceState({key:r},"")}try{let n=JSON.parse(sessionStorage.getItem(s)||"{}")[d||window.history.state.key];typeof n=="number"&&window.scrollTo(0,n)}catch(r){console.error(r),sessionStorage.removeItem(s)}}).toString();return i.createElement("script",x({},l,{suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${h})(${JSON.stringify(a)}, ${JSON.stringify(u)})`}}))}const L=()=>[{rel:"preconnect",href:"https://fonts.googleapis.com"},{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"},{rel:"stylesheet",href:"https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"}];function N({children:e}){return t.jsxs("html",{lang:"en",className:"h-full",children:[t.jsxs("head",{children:[t.jsx("meta",{charSet:"utf-8"}),t.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),t.jsx(S,{}),t.jsx(j,{}),t.jsx("title",{children:"Teleport - Caddy Controller"})]}),t.jsxs("body",{className:"h-full bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900 antialiased",children:[e,t.jsx(M,{}),t.jsx(k,{})]})]})}function b(){return t.jsx(w,{})}export{N as Layout,b as default,L as links};
