"use client";
import { useEffect,useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, Copy, Smartphone, Info } from "lucide-react";
import { formatPrice,type Product } from "@/lib/products";

const PAYMENT_DETAILS = {
  bKash: { number: "+8801747295464", type: "Send Money", color: "#d91d70" },
  Nagad: { number: "+8801747295464", type: "Send Money", color: "#f07822" },
} as const;

export default function CheckoutPage(){
 const [ids,setIds]=useState<(string|number)[]>([]);const [products,setProducts]=useState<Product[]>([]);
 const [ready,setReady]=useState(false);
 const [form,setForm]=useState({name:"",phone:"",email:"",address:"",city:"Bogura",payment:"Cash on Delivery",senderNumber:"",transactionId:"",notes:""});
 const [error,setError]=useState("");const [numberCopied,setNumberCopied]=useState(false);
 useEffect(()=>{try{setIds(JSON.parse(sessionStorage.getItem("nexora-checkout-cart")||"[]"))}catch{};(async()=>{try{const r=await fetch("/api/products?limit=200",{cache:"no-store"});const d=await r.json();if(r.ok)setProducts((d.products||[]).map((x:any)=>({id:x.id,name:x.name,category:x.categories?.name||"Other",brand:x.brand||"Unbranded",price:Number(x.price)||0,image:x.product_images?.[0]?.storage_path||"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=82",stock:Number(x.stock_quantity)||0} as Product)))}catch{}finally{setReady(true)}})()},[]);
 const items=ids.map(id=>products.find(p=>String(p.id)===String(id))).filter((p):p is Product=>Boolean(p));
 const subtotal=items.reduce((s,p)=>s+p.price,0);
 const delivery=subtotal>=3000||subtotal===0?0:80;
 const update=(key:keyof typeof form,value:string)=>setForm(old=>({...old,[key]:value}));
 const isMobileWallet=form.payment==="bKash"||form.payment==="Nagad";
 const paymentDetails=isMobileWallet?PAYMENT_DETAILS[form.payment as "bKash"|"Nagad"]:null;
 const copyNumber=async()=>{try{await navigator.clipboard.writeText(paymentDetails?.number||"");setNumberCopied(true);window.setTimeout(()=>setNumberCopied(false),2000);}catch{const input=document.getElementById("payment-number") as HTMLInputElement|null;if(input){input.focus();input.select();const ok=document.execCommand("copy");if(ok){setNumberCopied(true);window.setTimeout(()=>setNumberCopied(false),2000);}else{setError("Could not copy automatically. Please select and copy the recipient number.");}}}};
 const submit=(e:React.FormEvent)=>{e.preventDefault();setError("");if(!items.length){setError("Your cart is empty or products are unavailable. Return to the shop and try again.");return}if(isMobileWallet){if(!/^01[3-9]\d{8}$/.test(form.senderNumber.replace(/[\s-]/g,""))){setError("Enter the 11-digit mobile number you used to send money.");return}if(!/^[A-Za-z0-9-]{6,30}$/.test(form.transactionId.trim())){setError("Enter the transaction ID from your bKash/Nagad confirmation message.");return}}
 const order={...form,senderNumber:form.senderNumber.trim(),transactionId:form.transactionId.trim(),items:ids,subtotal,delivery,total:subtotal+delivery,createdAt:new Date().toISOString(),orderId:"",paymentStatus:isMobileWallet?"Pending manual verification":"Cash on Delivery"};
 sessionStorage.setItem("nexora-pending-order",JSON.stringify(order));window.location.href="/order"};
 if(!ready)return <main className="checkout-page">Loading checkout…</main>;
 return <main className="checkout-page"><a className="back-link" href="/"><ArrowLeft size={16}/> Continue shopping</a><div className="checkout-header"><span className="eyebrow">NEXORA CHECKOUT</span><h1>Almost <em>yours.</em></h1><p>Enter delivery details and select how you want to pay.</p></div>
 <div className="checkout-layout"><form className="checkout-form" onSubmit={submit}>
 <h2>Delivery information</h2>
 <label>Full name<input required value={form.name} onChange={e=>update("name",e.target.value)} autoComplete="name" placeholder="Your full name"/></label>
 <div className="form-two"><label>Phone number<input required type="tel" pattern="[0-9+() -]{8,20}" value={form.phone} onChange={e=>update("phone",e.target.value)} autoComplete="tel" placeholder="01XXXXXXXXX"/></label><label>Email (optional)<input type="email" value={form.email} onChange={e=>update("email",e.target.value)} autoComplete="email" placeholder="you@example.com"/></label></div>
 <label>Full delivery address<textarea required rows={3} value={form.address} onChange={e=>update("address",e.target.value)} autoComplete="street-address" placeholder="House, road, area"/></label>
 <label>City / District<input required value={form.city} onChange={e=>update("city",e.target.value)} placeholder="Bogura"/></label>
 <h2>Payment method</h2><div className="payment-options">
 <label className={form.payment==="Cash on Delivery"?"payment-option selected": "payment-option"}><input type="radio" name="payment" checked={form.payment==="Cash on Delivery"} onChange={()=>update("payment","Cash on Delivery")}/><span>Cash on Delivery<small>Pay when your order arrives</small></span></label>
 <label className={form.payment==="bKash"?"payment-option selected": "payment-option"}><input type="radio" name="payment" checked={form.payment==="bKash"} onChange={()=>update("payment","bKash")}/><span className="payment-brand"><span className="wallet-wordmark bkash-wordmark" aria-label="bKash logo">bKash</span><span className="payment-label">Send Money<small>Pay to the number shown below</small></span></span></label>
 <label className={form.payment==="Nagad"?"payment-option selected": "payment-option"}><input type="radio" name="payment" checked={form.payment==="Nagad"} onChange={()=>update("payment","Nagad")}/><span className="payment-brand"><span className="wallet-wordmark nagad-wordmark" aria-label="Nagad logo">নগদ</span><span className="payment-label">Send Money<small>Pay to the number shown below</small></span></span></label>
 </div>
 {paymentDetails&&<section className="manual-payment" aria-live="polite"><div className="manual-payment-head"><div className={"wallet-symbol "+(form.payment==="bKash"?"bkash-symbol":"nagad-symbol")}><span>{form.payment==="bKash"?"bKash":"নগদ"}</span></div><div><b>{form.payment} payment instructions</b><small>Method: {paymentDetails.type}</small></div><span className="pending-pill">Manual verification</span></div>
 <ol className="payment-steps"><li>Open your {form.payment} app.</li><li>Choose <b>Send Money</b> and send exactly <b>{formatPrice(subtotal+delivery)}</b> to the recipient number below.</li><li>After sending, copy the sender number and transaction ID from your payment confirmation.</li></ol>
 <label className="recipient-label">Recipient number (store payment number)<div className="recipient-number"><input id="payment-number" readOnly value={paymentDetails.number} aria-label="Store recipient number"/><button type="button" onClick={copyNumber} aria-label="Select recipient number to copy"><Copy size={15}/> {numberCopied?"Copied":"Copy"}</button></div></label>
 <p className="payment-warning"><Info size={15}/> Send money only to the recipient number shown above. Confirm the number and amount in your bKash/Nagad app before completing payment.</p>
 <label>Your {form.payment} sender number<input required inputMode="numeric" type="tel" pattern="01[3-9][0-9]{8}" value={form.senderNumber} onChange={e=>update("senderNumber",e.target.value)} placeholder="01XXXXXXXXX"/></label>
 <label>Transaction ID (TrxID)<input required autoCapitalize="characters" value={form.transactionId} onChange={e=>update("transactionId",e.target.value)} placeholder="e.g. 8N7ABC12XY"/></label>
 <p className="checkout-note">Order status will be “Pending manual verification” until the store owner verifies the payment in their official account. Never share your PIN or OTP.</p></section>}
 <label>Order notes (optional)<textarea rows={2} value={form.notes} onChange={e=>update("notes",e.target.value)} placeholder="Delivery instructions"/></label>
 {error&&<p className="form-error" role="alert">{error}</p>}
 <button className="checkout-button" type="submit">Review order <ArrowRight size={17}/></button>
 <p className="checkout-note"><ShieldCheck size={14}/> This UI collects a sender number and transaction ID for manual review. It does not verify payment automatically.</p>
 </form><aside className="order-summary"><h2>Order summary ({items.length})</h2>{items.map((p,i)=><div className="summary-item" key={i}><img src={p.image} alt={p.name}/><div><b>{p.name}</b><small>{p.brand} · {p.category}</small><strong>{formatPrice(p.price)}</strong></div></div>)}{!items.length&&<p>Your bag is empty. <a href="/">Shop products</a></p>}<div className="summary-line"><span>Subtotal</span><b>{formatPrice(subtotal)}</b></div><div className="summary-line"><span>Delivery</span><b>{delivery===0?"Free":formatPrice(delivery)}</b></div><div className="summary-line summary-total"><span>Total</span><b>{formatPrice(subtotal+delivery)}</b></div><p className="checkout-note">Delivery fee is a placeholder; configure it for your actual delivery service.</p></aside></div></main>
}
