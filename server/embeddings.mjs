const URL='https://foundation-models.api.cloud.ru/v1/embeddings';
export async function embedCloud(text,key,model,fetcher=fetch){
 if(typeof text!=='string'||!text.trim()||text.length>20000)throw Object.assign(Error('Invalid embedding input'),{status:400});
 if(typeof model!=='string'||!model.trim()||model.length>200)throw Object.assign(Error('Embedding model is not configured'),{status:409});
 const response=await fetcher(URL,{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify({model,input:text}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Object.assign(Error('Embedding provider HTTP '+response.status),{status:502});
 const data=await response.json();const vector=data?.data?.[0]?.embedding;
 if(!Array.isArray(vector)||vector.length<2||vector.length>8192||!vector.every(Number.isFinite))throw Object.assign(Error('Invalid embedding response'),{status:502});
 return vector;
}
export function cosine(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length)return 0;
 let dot=0,na=0,nb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i]}
 return na&&nb?dot/Math.sqrt(na*nb):0;
}
