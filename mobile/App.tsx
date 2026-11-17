import React,{useCallback,useEffect,useMemo,useState} from "react";
import {ActivityIndicator,Alert,FlatList,KeyboardAvoidingView,Platform,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {StatusBar} from "expo-status-bar";

const API_URL=(process.env.EXPO_PUBLIC_API_URL??"http://localhost:4000").replace(/\/$/,"");
type Variant={id:string;sku:string;size:string;colour:string;selling_price:string|number;tax_rate:string|number;available_stock:number;product_name:string;barcode:string|null};
type CartLine={variant:Variant;quantity:number};
type Sale={id:string;invoice_number:string|null;total:string|number;status:string;sale_date:string;payment_method:string};
type Customer={id:string;full_name:string;phone:string|null;email:string|null;reward_points:number;tier:string};
type Session={token:string;user:{fullName?:string;email:string};shop:{name:string}};
type ApiList<T>={data:T[]};

async function api<T>(path:string,token?:string,body?:unknown):Promise<T>{
 const response=await fetch(`${API_URL}/api/v1${path}`,{method:body?"POST":"GET",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error??`Request failed (${response.status})`);
 return data as T;
}

export default function App(){
 const [mode,setMode]=useState<"login"|"register">("login");
 const [fullName,setFullName]=useState(""),[shopName,setShopName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState("");
 const [session,setSession]=useState<Session|null>(null),[variants,setVariants]=useState<Variant[]>([]),[cart,setCart]=useState<CartLine[]>([]);
 const [query,setQuery]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[lastInvoice,setLastInvoice]=useState("");
 const [activeTab,setActiveTab]=useState<"pos"|"sales"|"customers">("pos");
 const [sales,setSales]=useState<Sale[]>([]),[customers,setCustomers]=useState<Customer[]>([]);
 const loadVariants=useCallback(async(token:string)=>{const result=await api<ApiList<Variant>>("/variants",token);setVariants(result.data);},[]);
 const loadSales=useCallback(async(token:string)=>{const result=await api<ApiList<Sale>>("/sales",token);setSales(result.data);},[]);
 const loadCustomers=useCallback(async(token:string)=>{const result=await api<ApiList<Customer>>("/customers",token);setCustomers(result.data);},[]);
 useEffect(()=>{if(session)Promise.all([loadVariants(session.token),loadSales(session.token),loadCustomers(session.token)]).catch(e=>setError(e.message));},[session,loadVariants,loadSales,loadCustomers]);
 const filtered=useMemo(()=>variants.filter(v=>[v.product_name,v.sku,v.barcode??"",v.size,v.colour].join(" ").toLowerCase().includes(query.toLowerCase())),[variants,query]);
 const total=cart.reduce((sum,line)=>sum+Number(line.variant.selling_price)*line.quantity*(1+Number(line.variant.tax_rate)/100),0);
 async function authenticate(){
  setBusy(true);setError("");
  try{
   const result=await api<Session>(mode==="register"?"/auth/register":"/auth/login",undefined,mode==="register"?{fullName,shopName,email,password}:{email,password});
   setSession(result);
  }catch(e){setError(e instanceof Error?e.message:"Unable to authenticate");}
  finally{setBusy(false);}
 }
 function add(v:Variant){if(v.available_stock<1)return;setCart(old=>{const found=old.find(x=>x.variant.id===v.id);if(found)return old.map(x=>x.variant.id===v.id?{...x,quantity:Math.min(x.quantity+1,v.available_stock)}:x);return [...old,{variant:v,quantity:1}];});}
 async function checkout(){
  if(!session||!cart.length)return;setBusy(true);setError("");
  try{
   const result=await api<{data:{invoice_number:string;total:number|string}}>("/sales/checkout",session.token,{idempotencyKey:`mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`,items:cart.map(x=>({variantId:x.variant.id,quantity:x.quantity})),payments:[{method:"cash",amount:Number(total.toFixed(2))}]});
   setLastInvoice(`${result.data.invoice_number} · ₹${Number(result.data.total).toFixed(2)}`);setCart([]);await Promise.all([loadVariants(session.token),loadSales(session.token),loadCustomers(session.token)]);
  }catch(e){setError(e instanceof Error?e.message:"Checkout failed");}
  finally{setBusy(false);}
 }
 if(!session)return <SafeAreaView style={styles.safe}><StatusBar style="light"/><KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={styles.center}><ScrollView contentContainerStyle={styles.authCard}>
  <Text style={styles.brand}>GARMENTOS</Text><Text style={styles.heading}>{mode==="register"?"Create your shop":"Welcome back"}</Text><Text style={styles.muted}>Sign in to your garment business workspace</Text>
  {mode==="register"&&<><TextInput value={fullName} onChangeText={setFullName} placeholder="Full name" placeholderTextColor="#758096" style={styles.input}/><TextInput value={shopName} onChangeText={setShopName} placeholder="Shop / business name" placeholderTextColor="#758096" style={styles.input}/></>}
  <TextInput value={email} onChangeText={setEmail} placeholder="Email address" autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#758096" style={styles.input}/>
  <TextInput value={password} onChangeText={setPassword} placeholder="Password (10+ characters for registration)" secureTextEntry placeholderTextColor="#758096" style={styles.input}/>
  {!!error&&<Text style={styles.error}>{error}</Text>}
  <Pressable onPress={authenticate} disabled={busy} style={styles.primary}>{busy?<ActivityIndicator color="#07110d"/>:<Text style={styles.primaryText}>{mode==="register"?"Create account":"Sign in"}</Text>}</Pressable>
  <Pressable onPress={()=>{setMode(mode==="login"?"register":"login");setError("");}}><Text style={styles.switch}>{mode==="login"?"New shop? Create an account":"Already registered? Sign in"}</Text></Pressable>
 </ScrollView></KeyboardAvoidingView></SafeAreaView>;

 return <SafeAreaView style={styles.safe}><StatusBar style="light"/><View style={styles.top}><View><Text style={styles.brandSmall}>GARMENTOS MOBILE</Text><Text style={styles.shopTitle}>{session.shop.name}</Text></View><Pressable onPress={()=>{setSession(null);setCart([]);setLastInvoice("");setSales([]);setCustomers([]);}}><Text style={styles.logout}>Logout</Text></Pressable></View>
 <View style={styles.tabs}>{([{id:"pos",label:"POS"},{id:"sales",label:"Sales"},{id:"customers",label:"Customers"}] as const).map(tab=><Pressable key={tab.id} onPress={()=>setActiveTab(tab.id)} style={[styles.tab,activeTab===tab.id&&styles.tabSelected]}><Text style={[styles.tabText,activeTab===tab.id&&styles.tabTextSelected]}>{tab.label}</Text></Pressable>)}</View>
 {!!error&&<Text style={styles.error}>{error}</Text>}
 {activeTab==="pos"&&<>
  <View style={styles.searchWrap}><TextInput value={query} onChangeText={setQuery} placeholder="Search product, SKU, size, colour..." placeholderTextColor="#758096" style={styles.search}/></View>
  {!!lastInvoice&&<Text style={styles.success}>Sale completed: {lastInvoice}</Text>}
  <FlatList data={filtered} keyExtractor={x=>x.id} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.muted}>No sellable variants found. Add products and receive stock from the web app first.</Text>} renderItem={({item})=><Pressable onPress={()=>add(item)} disabled={item.available_stock<1} style={[styles.product,item.available_stock<1&&styles.disabled]}><View style={{flex:1}}><Text style={styles.productName}>{item.product_name}</Text><Text style={styles.muted}>{item.size} / {item.colour} · {item.sku}</Text><Text style={styles.stock}>Available: {item.available_stock}</Text></View><Text style={styles.price}>₹{Number(item.selling_price).toFixed(2)}</Text></Pressable>}/>
  <View style={styles.cart}><Text style={styles.cartTitle}>Cart · {cart.reduce((n,x)=>n+x.quantity,0)} items</Text>{cart.slice(0,3).map(x=><Text key={x.variant.id} style={styles.cartLine}>{x.variant.product_name} ({x.variant.size}/{x.variant.colour}) × {x.quantity}</Text>)}<View style={styles.cartFooter}><Text style={styles.total}>₹{total.toFixed(2)}</Text><Pressable onPress={checkout} disabled={!cart.length||busy} style={[styles.primary,(!cart.length||busy)&&styles.disabled]}>{busy?<ActivityIndicator color="#07110d"/>:<Text style={styles.primaryText}>Cash checkout</Text>}</Pressable></View></View>
 </>}
 {activeTab==="sales"&&<FlatList data={sales} keyExtractor={x=>x.id} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.muted}>No sales recorded yet.</Text>} renderItem={({item})=><View style={styles.dataCard}><View style={{flex:1}}><Text style={styles.productName}>{item.invoice_number||"Sales invoice"}</Text><Text style={styles.muted}>{new Date(item.sale_date).toLocaleDateString("en-IN")} · {item.payment_method}</Text></View><View><Text style={styles.price}>₹{Number(item.total).toFixed(2)}</Text><Text style={styles.stock}>{item.status}</Text></View></View>}/>}
 {activeTab==="customers"&&<FlatList data={customers} keyExtractor={x=>x.id} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.muted}>No customers registered yet.</Text>} renderItem={({item})=><View style={styles.dataCard}><View style={{flex:1}}><Text style={styles.productName}>{item.full_name}</Text><Text style={styles.muted}>{item.phone||item.email||"No contact details"}</Text></View><View><Text style={styles.price}>{item.reward_points||0} pts</Text><Text style={styles.stock}>{item.tier||"Bronze"}</Text></View></View>}/>}
 </SafeAreaView>;
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#0a0d14"},tabs:{flexDirection:"row",paddingHorizontal:14,paddingBottom:8,gap:8},tab:{flex:1,borderRadius:10,borderWidth:1,borderColor:"#293244",padding:10,alignItems:"center"},tabSelected:{backgroundColor:"#12352a",borderColor:"#34d399"},tabText:{color:"#94a3b8",fontWeight:"700"},tabTextSelected:{color:"#6ee7b7"},dataCard:{backgroundColor:"#111520",borderWidth:1,borderColor:"#202a3a",borderRadius:14,padding:15,marginBottom:10,flexDirection:"row",alignItems:"center"},center:{flex:1,justifyContent:"center",padding:22},authCard:{borderRadius:24,backgroundColor:"#111520",padding:24,justifyContent:"center",flexGrow:1},
 brand:{fontSize:15,fontWeight:"900",letterSpacing:3,color:"#34d399",marginBottom:22},brandSmall:{fontSize:10,fontWeight:"800",letterSpacing:2,color:"#34d399"},heading:{fontSize:28,fontWeight:"800",color:"#fff"},muted:{fontSize:12,color:"#94a3b8",marginTop:5},input:{marginTop:15,borderWidth:1,borderColor:"#293244",borderRadius:12,padding:14,color:"#fff",backgroundColor:"#0a0d14"},primary:{backgroundColor:"#34d399",borderRadius:12,paddingVertical:14,paddingHorizontal:18,alignItems:"center",justifyContent:"center",minWidth:130},primaryText:{fontWeight:"800",color:"#07110d"},switch:{color:"#6ee7b7",textAlign:"center",marginTop:20,fontWeight:"600"},error:{color:"#fda4af",backgroundColor:"#451a24",padding:10,borderRadius:10,marginTop:12},success:{color:"#6ee7b7",paddingHorizontal:16,paddingVertical:8},top:{paddingHorizontal:18,paddingVertical:16,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},shopTitle:{color:"#fff",fontWeight:"800",fontSize:20,marginTop:5},logout:{color:"#fda4af",fontWeight:"700"},searchWrap:{paddingHorizontal:16,paddingBottom:10},search:{backgroundColor:"#111520",borderColor:"#293244",borderWidth:1,borderRadius:12,padding:13,color:"#fff"},list:{padding:14,paddingBottom:10},product:{backgroundColor:"#111520",borderWidth:1,borderColor:"#202a3a",borderRadius:14,padding:15,marginBottom:10,flexDirection:"row",alignItems:"center"},disabled:{opacity:0.4},productName:{color:"#fff",fontSize:15,fontWeight:"700"},stock:{color:"#94a3b8",fontSize:11,marginTop:5},price:{color:"#6ee7b7",fontWeight:"800"},cart:{borderTopWidth:1,borderColor:"#293244",backgroundColor:"#111520",padding:16},cartTitle:{color:"#fff",fontWeight:"800",fontSize:16},cartLine:{color:"#94a3b8",fontSize:11,marginTop:5},cartFooter:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:12},total:{color:"#fff",fontSize:21,fontWeight:"900"}
});
