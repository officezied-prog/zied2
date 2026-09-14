"""Deterministic seed generator for Rabith. Run: python3 generate.py > creators.json"""
import json, random, hashlib
random.seed(42)

first = ["Ayu","Putri","Dewi","Sari","Nadia","Rina","Intan","Citra","Maya","Laila","Salsa","Kirana","Farah","Zahra","Nabila","Dinda","Rani","Tasya","Amira","Alya",
         "Rizky","Bima","Dimas","Fajar","Raka","Arif","Yoga","Galih","Reza","Aldi"]
last  = ["Pratiwi","Lestari","Wulandari","Rahayu","Anggraini","Puspita","Maharani","Kusuma","Saputra","Wijaya","Santoso","Hidayat","Nugroho","Setiawan","Ramadhan"]
cities = [("Jakarta",30),("Bandung",14),("Surabaya",12),("Yogyakarta",8),("Medan",7),("Semarang",6),("Bali",8),("Makassar",5),("Malang",5),("Bekasi",5)]
niches_pool = {
 "beauty":["skincare","makeup","haircare"], "fashion":["modest","streetwear","hijab"], "food":["culinary","halal","coffee"],
 "tech":["gadgets","apps","gaming"], "lifestyle":["travel","home","parenting"], "fitness":["gym","yoga","wellness"], "finance":["investing","umkm","business"]
}
platforms = [("tiktok",0.5),("instagram",0.38),("youtube",0.12)]
tiers = [("nano",1000,10000,0.42),("micro",10000,100000,0.36),("mid",100000,500000,0.14),("macro",500000,2000000,0.06),("mega",2000000,8000000,0.02)]

def pick_w(items):
    r=random.random(); acc=0
    for it in items:
        acc+=it[-1]
        if r<=acc: return it
    return items[-1]

def h(s): return hashlib.md5(s.encode()).hexdigest()[:8]

creators=[]
for i in range(1,121):
    fn=random.choice(first); ln=random.choice(last)
    name=f"{fn} {ln}"
    plat=pick_w(platforms)[0]
    tier=pick_w(tiers)
    followers=int(random.uniform(tier[1],tier[2]))
    main=random.choice(list(niches_pool)); sub=random.sample(niches_pool[main],k=random.choice([1,2]))
    niche=[main]+sub
    city=pick_w(cities)[0]
    # engagement expectation shrinks with size
    base_er={"nano":7.5,"micro":4.8,"mid":3.1,"macro":2.0,"mega":1.4}[tier[0]]
    fraud_case = random.random()
    er=max(0.4, random.gauss(base_er, base_er*0.25))
    growth=max(-5, random.gauss(3.5,3))
    generic=min(0.9,max(0.02,random.gauss(0.12,0.06)))
    following=int(followers*random.uniform(0.02,0.25)) if tier[0] in("mid","macro","mega") else int(random.uniform(300,2500))
    posts=int(random.uniform(80,1200))
    # inject ~12% suspicious accounts
    if fraud_case<0.12:
        kind=random.choice(["pod","bought","spike"])
        if kind=="pod": er=base_er*random.uniform(2.6,4.5); generic=random.uniform(0.55,0.85)
        if kind=="bought": er=base_er*random.uniform(0.08,0.25); following=int(followers*random.uniform(0.6,1.4)) if followers<50000 else following
        if kind=="spike": growth=random.uniform(45,140); er=base_er*random.uniform(0.3,0.6)
    avg_views=int(followers*random.uniform(0.25,1.6) if plat=="tiktok" else followers*random.uniform(0.15,0.6))
    avg_likes=int(followers*er/100)
    avg_comments=int(avg_likes*random.uniform(0.02,0.08))
    price_base=followers*({"tiktok":28,"instagram":32,"youtube":60}[plat])/1000
    price=lambda m: int(round(price_base*m/10000))*10000
    female=int(random.gauss(72 if main in("beauty","fashion","lifestyle") else 48,10)); female=min(95,max(15,female))
    a1=int(random.gauss(40,10)); a2=int(random.gauss(38,8)); a1=max(10,min(65,a1)); a2=max(10,min(60,a2))
    handle="@"+(fn+ln).lower()+random.choice(["","_id",".official",str(random.randint(1,99))])
    langs=["id"]+(["en"] if random.random()<0.55 else [])+(["ar"] if random.random()<0.06 else [])
    creators.append({
      "id":f"cr_{i:04d}","handle":handle,"name":name,"platform":plat,
      "followers":followers,"following":following,"posts":posts,
      "engagementRate":round(er,2),"avgViews":avg_views,"avgLikes":avg_likes,"avgComments":avg_comments,
      "growth30d":round(growth,1),"genericCommentRatio":round(generic,2),
      "niche":niche,"city":city,"languages":langs,"tier":tier[0],
      "priceIDR":{"post":max(50000,price(1)),"story":max(30000,price(0.35)),"video":max(100000,price(2.4)),"live":max(200000,price(4))},
      "audience":{"femalePct":female,"age18_24":a1,"age25_34":a2,"topCities":[city]+random.sample([c for c,_ in cities if c!=city],2)},
      "verified":random.random()<0.35,
      "bio":f"{main.title()} creator from {city}. {random.choice(['Honest reviews only.','Daily content.','Collabs open.','UMKM friendly.','Halal lifestyle.'])}",
      "avatar":f"https://api.dicebear.com/9.x/thumbs/svg?seed={h(handle)}",
      "contact":{"email":f"{handle[1:].replace('.','')}@gmail.com","whatsapp":"+628"+str(random.randint(10**8,10**9-1))},
      "source":"seed"
    })

brands=[
 # Indonesian beauty
 ("Somethinc","brand","beauty","enterprise","ID","somethinc.com",["Serum Niacinamide","Sunscreen","Lip tint"],150_000_000,"en"),
 ("Scarlett Whitening","brand","beauty","enterprise","ID","scarlettwhitening.com",["Body lotion","Facial wash"],200_000_000,"id"),
 ("MS Glow","brand","beauty","enterprise","ID","msglow.id",["Skincare set","Acne series"],180_000_000,"id"),
 ("Avoskin","brand","beauty","smb","ID","avoskinbeauty.com",["Retinol serum","Toner"],80_000_000,"en"),
 ("Y.O.U Beauty","brand","beauty","enterprise","ID","youbeauty.co.id",["Cushion","Mascara"],120_000_000,"en"),
 ("Azarine","brand","beauty","smb","ID","azarine.co.id",["Sunscreen","Hydrasoothe"],70_000_000,"id"),
 ("Skintific","brand","beauty","enterprise","ID","skintific.com",["5X Ceramide","Barrier cream"],160_000_000,"en"),
 # FMCG
 ("Unilever Indonesia — Pond's","brand","fmcg","enterprise","ID","unilever.co.id",["Pond's Bright Beauty"],400_000_000,"en"),
 ("Indofood — Indomie","brand","fmcg","enterprise","ID","indofood.com",["Indomie Goreng","Hype Abis"],350_000_000,"id"),
 ("Mayora — Kopiko","brand","fmcg","enterprise","ID","mayora.com",["Kopiko Candy","Torabika"],300_000_000,"id"),
 ("Nutrifood — Tropicana Slim","brand","fmcg","enterprise","ID","nutrifood.co.id",["Tropicana Slim","L-Men"],220_000_000,"en"),
 # Tech / fintech / ecommerce
 ("Tokopedia","company","ecommerce","enterprise","ID","tokopedia.com",["Beauty category","Ramadan sale"],500_000_000,"id"),
 ("Shopee Indonesia","company","ecommerce","enterprise","ID","shopee.co.id",["Shopee Live","9.9 sale"],600_000_000,"id"),
 ("Erigo","brand","fashion","smb","ID","erigostore.co.id",["Streetwear","Jackets"],90_000_000,"id"),
 ("Kopi Kenangan","brand","food","enterprise","ID","kopikenangan.com",["Kenangan Mantan","Bottled coffee"],140_000_000,"id"),
 # Gulf brands entering Indonesia
 ("Al Haramain Perfumes","brand","beauty","enterprise","AE","alharamainperfumes.com",["Amber Oud","L'Aventure"],250_000_000,"ar"),
 ("Modanisa","brand","fashion","enterprise","TR",  "modanisa.com",["Modest fashion"],200_000_000,"en"),
 ("Almarai","brand","fmcg","enterprise","SA","almarai.com",["Dairy","Juices"],300_000_000,"ar"),
 ("Nahdi Care","brand","beauty","enterprise","SA","nahdionline.com",["Nahdi skincare"],150_000_000,"ar"),
 ("Bateel","brand","food","smb","AE","bateel.com",["Gourmet dates"],90_000_000,"ar"),
 # Agencies
 ("AnyMind Group","agency","marketing","enterprise","SG","anymindgroup.com",["AnyTag"],0,"en"),
 ("Partipost","agency","marketing","smb","ID","partipost.com",["Nano campaigns"],0,"en"),
 ("GRIN","agency","martech","enterprise","US","grin.co",["Creator CRM"],0,"en"),
 ("Kulo Agency Jakarta","agency","marketing","smb","ID","kulo.id",["KOL management"],0,"id"),
 # SMB / UMKM clients
 ("Rumah Hijab Aisyah","brand","fashion","startup","ID","instagram.com/rumahhijab.aisyah",["Hijab instan"],12_000_000,"id"),
 ("Warung Sambal Bu Tini","brand","food","startup","ID","",["Sambal botol"],6_000_000,"id"),
]
roles=["Brand Manager","Head of Marketing","KOL Manager","Digital Marketing Lead","Partnerships Lead"]
pipe=["lead","lead","lead","contacted","contacted","replied","pilot","active","lead","contacted"]
out=[]
for i,(n,t,ind,size,cc,web,prods,budget,lg) in enumerate(brands,1):
    cname = random.choice(["Rania","Dita","Kevin","Sarah","Andi","Nabil","Fatimah","Michael","Yusuf","Grace"])+" "+random.choice(["Halim","Prasetyo","Tan","Al-Farsi","Wibowo","Kurniawan","Rahman","Gunawan"])
    dom = web.split('/')[0] or "example.com"
    out.append({
      "id":f"br_{i:04d}","name":n,"type":t,"industry":ind,"size":size,"country":cc,"website":("https://"+web) if web else "",
      "logo":f"https://api.dicebear.com/9.x/initials/svg?seed={n.split()[0]}",
      "contacts":[{"id":f"ct_{i:04d}a","name":cname,"role":random.choice(roles),"email":f"partnership@{dom}","linkedin":f"https://linkedin.com/in/{cname.lower().replace(' ','-')}","lang":lg}],
      "products":prods,"targetAudience":random.choice(["Women 18–34, urban Java","Gen Z, Tier-1 & Tier-2 cities","Muslim families, nationwide","Young professionals 25–40","Students & first jobbers"]),
      "budgetIDR":budget,"pipeline":pipe[i%len(pipe)],"source":"seed","lastOutreachAt":None,
      "notes":random.choice(["Ran a KOL campaign last Ramadan.","Uses macro influencers only — nano gap.","Active on TikTok Shop.","Entering Indonesia in Q4.","Wants measurable pilot."])
    })

json.dump({"creators":creators,"brands":out}, open("seed.json","w"), ensure_ascii=False, indent=1)
print(len(creators),"creators,",len(out),"brands")
