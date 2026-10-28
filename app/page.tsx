"use client";

import { useMemo, useState } from "react";
import { Heart, Search, ShoppingBag, Star, ArrowUpRight, Menu, X, Truck, ShieldCheck, Sparkles, Minus, Plus } from "lucide-react";

type Category = "All" | "Shoes" | "Cosmetics" | "Accessories" | "Socks" | "Shoe Care" | "Hair & Body Care";
type Product = { id: number; name: string; category: Exclude<Category, "All">; brand: string; price: number; old?: number; rating: string; image: string; badge?: string };

const categories: Category[] = ["All", "Shoes", "Cosmetics", "Accessories", "Socks", "Shoe Care", "Hair & Body Care"];
const products: Product[] = [
  { id: 1, name: "Everyday Runner Sneakers", category: "Shoes", brand: "UrbanStep", price: 3290, old: 3890, rating: "4.9", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=82", badge: "BESTSELLER" },
  { id: 2, name: "Classic White Sneakers", category: "Shoes", brand: "StreetForm", price: 2890, rating: "4.8", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=82", badge: "POPULAR" },
  { id: 3, name: "Daily Skin Care Set", category: "Cosmetics", brand: "GlowLab", price: 1290, old: 1490, rating: "4.7", image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=82" },
  { id: 4, name: "Essential Makeup Kit", category: "Cosmetics", brand: "ColorMuse", price: 1590, rating: "4.8", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82", badge: "NEW" },
  { id: 5, name: "Everyday Crossbody Bag", category: "Accessories", brand: "Nexora Select", price: 1890, rating: "4.6", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=82" },
  { id: 6, name: "Classic Belt & Wallet Set", category: "Accessories", brand: "UrbanForm", price: 990, old: 1190, rating: "4.6", image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=82" },
  { id: 7, name: "Comfort Cotton Socks 3-Pack", category: "Socks", brand: "StepSoft", price: 390, rating: "4.7", image: "https://images.unsplash.com/photo-1586350977771-b3b0 уга?auto=format&fit=crop&w=900&q=82".replace("уга","") },
  { id: 8, name: "Premium Shoe Polish Kit", category: "Shoe Care", brand: "SoleCare", price: 650, old: 790, rating: "4.8", image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=82", badge: "VALUE SET" },
  { id: 9, name: "Shoe Cleaning Brush Set", category: "Shoe Care", brand: "SoleCare", price: 450, rating: "4.5", image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=82" },
  { id: 10, name: "Daily Fresh Shampoo", category: "Hair & Body Care", brand: "FreshRoot", price: 520, rating: "4.6", image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=82" },
  { id: 11, name: "Signature Body Spray", category: "Hair & Body Care", brand: "AromaDay", price: 690, old: 790, rating: "4.7", image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=82", badge: "TRENDING" },
  { id: 12, name: "Sport Deodorant Spray", category: "Hair & Body Care", brand: "ActiveFresh", price: 490, rating: "4.5", image: "https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=900&q=82" }
];
const categoryInfo: { name: Exclude<Category, "All">; img: string; desc: string }[] = [
  { name: "Shoes", img: "photo-1542291026-7eec264c27ff", desc: "Step out in style" },
  { name: "Cosmetics", img: "photo-1596462502278-27bfdc403348", desc: "Your daily glow" },
  { name: "Accessories", img: "photo-1548036328-c9fa89d128fa", desc: "Finish the look" },
  { name: "Socks", img: "photo-1586350977771-b3b0c4e?x=1", desc: "Everyday comfort" },
  { name: "Shoe Care", img: "photo-1525966222134-fcfa99b8ae77", desc: "Keep them fresh" },
  { name: "Hair & Body Care", img: "photo-1547887538-e3a2f32cb1cc", desc: "Feel fresh daily" }
];
const formatPrice = (n: number) => "৳" + n.toLocaleString("en-BD");

export default function HomePage() {
  const [category, setCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<number[]>([]);
  const [wish, setWish] = useState<number[]>([]);
  const [menu, setMenu] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const visible = useMemo(() => products.filter(p => (category === "All" || p.category === category) && [p.name, p.category, p.brand].some(v => v.toLowerCase().includes(query.toLowerCase()))), [category, query]);
  const cartProducts = cart.map(id => products.find(p => p.id === id)).filter((p): p is Product => Boolean(p));
  const total = cartProducts.reduce((sum, p) => sum + p.price, 0);
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2400); };
  const add = (id: number) => { setCart(old => [...old, id]); showNotice("Product added to your bag"); };
  const chooseCategory = (c: Category) => { setCategory(c); setMenu(false); document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" }); };
  return <main>
    <div className="announcement"><span>✦ YOUR EVERYDAY ESSENTIALS, ALL IN ONE PLACE</span><span>Free delivery on orders over ৳3,000 ↗</span></div>
    <header className="header">
      <button className="menu-button" onClick={() => setMenu(!menu)} aria-label="Toggle navigation">{menu ? <X size={21}/> : <Menu size={21}/>}</button>
      <a className="logo" href="#" aria-label="Nexora home">nexora<span>®</span><i>.</i></a>
      <nav className={menu ? "nav nav-open" : "nav"}><a href="#shop" onClick={() => setMenu(false)}>Shop all</a><a href="#categories" onClick={() => setMenu(false)}>Categories</a><a href="#story" onClick={() => setMenu(false)}>Our story</a></nav>
      <div className="actions">
        <label className="search"><Search size={17}/><input aria-label="Search products" value={query} onChange={e=>{setQuery(e.target.value);}} placeholder="Search products"/></label>
        <button className="icon-action wishlist-action" onClick={() => showNotice(wish.length ? "You have " + wish.length + " saved item(s)" : "Your wishlist is empty")} aria-label="Wishlist"><Heart size={18}/><span>{wish.length}</span></button>
        <button className="bag" onClick={()=>setCartOpen(true)}><ShoppingBag size={17}/><span>Bag</span><b>{cart.length}</b></button>
      </div>
    </header>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow">✳ MEET YOUR NEW FAVOURITE STORE</span><h1>Good finds.<br/><em>Great</em> <span>everyday.</span></h1><p>From your next favourite shoes to beauty and personal-care essentials, discover trusted picks from different brands in one easy place.</p><a className="primary" href="#categories">Explore categories <ArrowUpRight size={17}/></a><div className="social-proof"><div className="avatars"><b>S</b><b>B</b><b>N</b><b>+</b></div><span><strong>Everything you need, together</strong><small>Style, care and everyday essentials</small></span><span className="stars">★★★★★</span></div></div>
      <div className="hero-image"><div className="sticker">GOOD<br/>FINDS ✳<small>live here</small></div><div className="photo-note">Style meets self-care.<small>One store. More possibilities.</small></div><small className="image-caption">SHOES · BEAUTY · ACCESSORIES · PERSONAL CARE</small></div>
    </section>
    <div className="trust"><div><Truck/><span><b>Delivery across Bangladesh</b><small>Convenient shopping, one place</small></span></div><div><ShieldCheck/><span><b>Quality-first selection</b><small>Choose products with confidence</small></span></div><div><Sparkles/><span><b>Everyday essentials</b><small>Style and care made simple</small></span></div></div>
    <section className="section" id="categories"><div className="section-heading"><div><span className="eyebrow">SHOP BY CATEGORY</span><h2>Your essentials,<br/><em>your way.</em></h2></div><p>Explore different brands across shoes, beauty, accessories and daily care.</p></div><div className="category-grid">{categoryInfo.map((c,i)=><button className="category-card" key={c.name} onClick={()=>chooseCategory(c.name)} style={{backgroundImage:"linear-gradient(0deg,#1e1d1acc,transparent 70%),url(https://images.unsplash.com/"+c.img+"?auto=format&fit=crop&w=700&q=80)"}}><small>0{i+1} ✳</small><span><b>{c.name}</b><small>{c.desc}</small></span><ArrowUpRight/></button>)}</div></section>
    <section className="section shop" id="shop"><div className="section-heading"><div><span className="eyebrow">THE NEXORA EDIT</span><h2>Good stuff, <em>picked for you.</em></h2></div><p>Find your next everyday favourite.</p></div><div className="filters" aria-label="Filter products by category">{categories.map(c=><button key={c} className={category===c?"active":""} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="result-count">{visible.length} products {category !== "All" ? "in " + category : "across all categories"}</div><div className="product-grid">{visible.map(p=><article className="product" key={p.id}><div className="product-img"><img src={p.image} alt={p.name} loading="lazy"/>{p.badge&&<span className="badge">{p.badge}</span>}<button className={wish.includes(p.id)?"heart loved":"heart"} aria-label={wish.includes(p.id)?"Remove from wishlist":"Add to wishlist"} onClick={()=>setWish(old=>old.includes(p.id)?old.filter(x=>x!==p.id):[...old,p.id])}><Heart size={17} fill={wish.includes(p.id)?"currentColor":"none"}/></button><button className="quick-add" onClick={()=>add(p.id)}><Plus size={14}/> Add to bag</button></div><div className="product-meta"><span>{p.brand}</span><span><Star size={12} fill="currentColor"/> {p.rating}</span></div><h3>{p.name}</h3><div className="price"><b>{formatPrice(p.price)}</b>{p.old&&<del>{formatPrice(p.old)}</del>}</div><small className="product-category">{p.category}</small></article>)}</div>{visible.length===0&&<p className="empty">No products found. Try a different keyword or category.</p>}</section>
    <section className="editorial" id="story"><div className="editorial-img"/><div><span className="eyebrow">A NOTE FROM NEXORA</span><h2>One store.<br/><em>All your essentials.</em></h2><p>We bring together shoes, beauty, accessories and personal-care products from a range of brands, so you can shop your everyday favourites without hopping between stores.</p><a className="primary" href="#shop">Shop the collection <ArrowUpRight size={16}/></a></div></section>
    <section className="newsletter"><span className="spark">✳</span><span className="eyebrow">THE GOOD FINDS UPDATE</span><h2>Good things, <em>in your inbox.</em></h2><p>Get updates about new arrivals, offers and everyday essentials.</p><form onSubmit={e=>{e.preventDefault();showNotice("Thanks for joining the NEXORA list!");setEmail("");}}><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email address" aria-label="Your email address" required/><button aria-label="Subscribe">↗</button></form><small>Occasional updates about products and offers.</small></section>
    <footer><div className="footer-main"><div><a className="logo" href="#">nexora<span>®</span><i>.</i></a><p>Shoes, beauty and everyday essentials.<br/>Different brands, one convenient store.</p></div><div><b>Shop</b><a href="#shop">All products</a><a href="#categories">Categories</a><a href="#shop" onClick={()=>setCategory("Shoes")}>Shoes</a></div><div><b>Categories</b><a href="#shop" onClick={()=>setCategory("Cosmetics")}>Cosmetics</a><a href="#shop" onClick={()=>setCategory("Shoe Care")}>Shoe care</a><a href="#shop" onClick={()=>setCategory("Hair & Body Care")}>Hair & body care</a></div><div className="footer-promo">YOUR EVERYDAY STORE ✳<h3>Find your<br/>next favourite.</h3></div></div><div className="footer-bottom">© 2026 NEXORA. ALL RIGHTS RESERVED.<span>MADE FOR YOUR EVERYDAY ✳</span><span>TERMS · PRIVACY</span></div></footer>
    {notice&&<div className="toast" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss message">×</button></div>}
    {cartOpen&&<div className="drawer-backdrop" onClick={()=>setCartOpen(false)}><aside className="cart-drawer" onClick={e=>e.stopPropagation()}><div className="drawer-heading"><div><span className="eyebrow">YOUR SELECTION</span><h2>Your bag ({cart.length})</h2></div><button className="close-drawer" onClick={()=>setCartOpen(false)} aria-label="Close bag"><X/></button></div>{cartProducts.length===0?<div className="empty-cart"><ShoppingBag size={32}/><p>Your bag is empty.</p><button className="primary" onClick={()=>setCartOpen(false)}>Continue shopping</button></div>:<><div className="cart-items">{cartProducts.map((p,i)=><div className="cart-item" key={i}><img src={p.image} alt={p.name}/><div className="cart-item-info"><b>{p.name}</b><small>{p.brand}</small><strong>{formatPrice(p.price)}</strong><div className="quantity-controls"><button onClick={()=>setCart(old=>old.filter((_,idx)=>idx!==i))} aria-label="Remove one item"><Minus size={13}/></button><span>1</span><button onClick={()=>setCart(old=>[...old,p.id])} aria-label="Add one more"><Plus size={13}/></button></div></div></div>)}</div><div className="cart-total"><span>Subtotal</span><b>{formatPrice(total)}</b></div><p className="checkout-note">Checkout and online payment will be available after the store backend is connected.</p><button className="checkout-button" onClick={()=>showNotice("Checkout is not connected yet.")}>Continue to checkout <ArrowUpRight size={16}/></button></>}</aside></div>}
  </main>;
}
