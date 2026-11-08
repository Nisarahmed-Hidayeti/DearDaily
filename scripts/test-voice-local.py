import urllib.request,urllib.error,json,subprocess,secrets,uuid,wave,io,math,struct
config=json.loads(subprocess.check_output(['npx','supabase','status','-o','json'],stderr=subprocess.DEVNULL))
base=config['API_URL'];assert base.startswith(('http://127.0.0.1:','http://localhost:')),'Local only'
key=config['ANON_KEY'];service=config['SERVICE_ROLE_KEY'];users=[];tokens=[];entries=[];checks=0
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args):return None
opener=urllib.request.build_opener(NoRedirect)
def call(path,method='GET',data=None,token=None,headers=None):
 h={'apikey':key,'Authorization':'Bearer '+(token or key),'Content-Type':'application/json'};h.update(headers or {})
 body=data if isinstance(data,bytes) else json.dumps(data).encode() if data is not None else None
 try:
  r=opener.open(urllib.request.Request(base+path,data=body,headers=h,method=method),timeout=35);raw=r.read();return r.status,json.loads(raw) if raw and r.headers.get('Content-Type','').startswith('application/json') else raw,r.headers
 except urllib.error.HTTPError as e:
  raw=e.read()
  try:d=json.loads(raw)
  except:d=raw
  return e.code,d,e.headers

def check(ok,label):
 global checks
 assert ok,label
 checks+=1;print('PASS',label,flush=True)
try:
 for label in ['a','b']:
  email='voice-'+label+'-'+uuid.uuid4().hex+'@example.test';password=secrets.token_urlsafe(24)
  status,user,_=call('/auth/v1/admin/users','POST',{'email':email,'password':password,'email_confirm':True},service);assert status==200,'Create local fixture'
  users.append(user['id'])
  status,session,_=call('/auth/v1/token?grant_type=password','POST',{'email':email,'password':password});assert status==200,'Local fixture login'
  tokens.append(session['access_token'])
  eid=str(uuid.uuid4());entries.append(eid)
  status,_,_=call('/rest/v1/journal_entries','POST',{'id':eid,'title':'Synthetic voice security test','body':'Synthetic text only'},tokens[-1]);check(status==201,'create synthetic '+label)
 check(users[0]!=users[1],'two genuinely distinct authenticated IDs')
 def query(eid,token):return call('/rest/v1/journal_entries?id=eq.'+eid+'&select=id,version,voice_notes','GET',token=token)[1][0]
 output=io.BytesIO()
 with wave.open(output,'wb') as f:
  f.setparams((1,2,16000,0,'NONE','not compressed'));f.writeframes(b''.join(struct.pack('<h',int(2000*math.sin(i/16))) for i in range(320000)))
 wav=output.getvalue();headers={'Content-Type':'audio/wav','x-action':'upload','x-entry-id':entries[0]}
 status,_,_=call('/functions/v1/voice-gateway','POST',wav,tokens[1],headers);check(status==403,'B cannot upload into A journal')
 status,_,_=call('/functions/v1/voice-gateway','POST',b'fake mp3',tokens[0],headers);check(status==400,'disguised/invalid audio rejected')
 status,asset,_=call('/functions/v1/voice-gateway','POST',wav,tokens[0],headers);check(status==200 and 'id' in asset,'canonical voice upload confirmed')
 aid=asset['id'];note={'id':aid,'title':'Synthetic excerpt','start':10,'end':19,'share':False}
 status,_,_=call('/rest/v1/journal_entries?id=eq.'+entries[0],'PATCH',{'voice_notes':[note]},tokens[0]);check(status==204,'private audio metadata saved')
 status,_,_=call('/functions/v1/voice-gateway','POST',{'action':'read','id':aid},tokens[1]);check(status==404,'B cannot get A signed audio URL')
 status,_,_=call('/functions/v1/voice-gateway','POST',{'action':'read','id':aid});check(status==401,'anonymous private audio blocked')
 status,_,_=call('/rest/v1/journal_entries?id=eq.'+entries[1],'PATCH',{'voice_notes':[note]},tokens[1]);check(status>=400,'ownership spoofing rejected')
 status,_,_=call('/rest/v1/journal_entries?select=voice_notes',token=tokens[1]);check(status==200,'B retains access to own journal')
 row=query(entries[0],tokens[0]);status,prepared,_=call('/functions/v1/voice-gateway','POST',{'action':'prepare','entry':entries[0],'version':row['version']},tokens[0]);check(status==200 and prepared['notes']==[],'unapproved private recording excluded from public preparation')
 note['share']=True
 status,_,_=call('/rest/v1/journal_entries?id=eq.'+entries[0],'PATCH',{'voice_notes':[note]},tokens[0]);check(status==204,'explicit audio approval saved')
 row=query(entries[0],tokens[0]);status,prepared,_=call('/functions/v1/voice-gateway','POST',{'action':'prepare','entry':entries[0],'version':row['version']},tokens[0]);check(status==200 and len(prepared.get('notes',[]))==1,'approved excerpt prepared')
 public=prepared['notes'][0];check(public['id']!=aid and 'share' not in public,'public copy hides private asset ID and approval metadata')
 status,_,_=call('/functions/v1/voice-gateway?public='+public['id']);check(status==404,'staged copy unreadable before publication')
 status,_,_=call('/rest/v1/public_stories','POST',{'id':entries[0],'user_id':users[0],'title':'Synthetic public audio','body':'Synthetic public text','voice_notes':[public]},tokens[0]);check(status==201,'approved audio snapshot published')
 status,_,headers=call('/functions/v1/voice-gateway?public='+public['id']);check(status==302,'anonymous can request published excerpt only')
 signed=headers['Location'];assert signed.startswith(('http://127.0.0.1:','http://localhost:'))
 clip=urllib.request.urlopen(signed).read()
 with wave.open(io.BytesIO(clip))as f:check(f.getnframes()==9*16000,'public bytes contain exactly 9 seconds, not the private 20 seconds')
 check(len(clip)==9*32000+44,'no trailing private audio or metadata')
 status,_,_=call('/rest/v1/public_stories?id=eq.'+entries[0],'DELETE',token=tokens[1]);check(status==204,'B cannot match A story for unpublishing')
 status,_,_=call('/functions/v1/voice-gateway?public='+public['id']);check(status==302,'B did not remove A public story')
 status,_,_=call('/rest/v1/public_stories?id=eq.'+entries[0],'DELETE',token=tokens[0]);check(status==204,'A unpublishes')
 status,_,_=call('/functions/v1/voice-gateway?public='+public['id']);check(status==404,'unpublish immediately blocks new public URLs')
 status,_,_=call('/functions/v1/voice-gateway','POST',{'action':'read','id':aid},tokens[0]);check(status==200,'unpublish preserves owner private recording')
finally:
 for i,eid in enumerate(entries):
  if i<len(tokens):
   call('/rest/v1/public_stories?id=eq.'+eid,'DELETE',token=tokens[i]);call('/rest/v1/journal_entries?id=eq.'+eid,'DELETE',token=tokens[i]);status,receipt,_=call('/functions/v1/voice-gateway','POST',{'action':'cleanup'},tokens[i]);assert status==200 and receipt.get('pending')==0,'Exact fixture object cleanup'
 for uid in users:call('/auth/v1/admin/users/'+uid,'DELETE',token=service)
 print('Exact local synthetic fixtures cleaned; checks:',checks,flush=True)
