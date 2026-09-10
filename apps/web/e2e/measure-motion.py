import gzip, json, pathlib, statistics, sys, os
from playwright.sync_api import sync_playwright

phase = sys.argv[1]
if phase not in ('before', 'after'):
    raise SystemExit('Use before or after as the measurement phase.')
out = pathlib.Path('.artifacts/motion-upgrade') / phase
out.mkdir(parents=True, exist_ok=True)
base = 'http://127.0.0.1:3100'
ident = '11111111-1111-4111-8111-111111111111'
research = '22222222-2222-4222-8222-222222222222'
long_chat = '33333333-3333-4333-8333-333333333333'
core = ['/dashboard', '/drug-letters', '/chat/'+ident, '/research?run='+research, '/chat/'+long_chat, '/cases/'+ident]
observer = '''window.__bench={shifts:[],tasks:[],events:[]};
new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)window.__bench.shifts.push(e.value)})).observe({type:'layout-shift',buffered:true});
new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__bench.tasks.push({start:e.startTime,duration:e.duration}))).observe({type:'longtask',buffered:true});
new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__bench.events.push({name:e.name,duration:e.duration}))).observe({type:'event',buffered:true,durationThreshold:16});'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_EXECUTABLE', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'))
    reports=[]
    for repeat in range(2):
        for route in core:
            context=browser.new_context(viewport={'width':1440,'height':1000})
            context.add_cookies([{'name':'dli_locale','value':'en','url':base}])
            context.add_init_script(observer)
            page=context.new_page(); cdp=context.new_cdp_session(page)
            cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
            cdp.send('Network.enable')
            cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':40,'downloadThroughput':1250000,'uploadThroughput':625000})
            assets={}; errors=[]
            def resource(response):
                if '/_next/static/' in response.url and response.url.endswith(('.js','.css')):
                    try:
                        body=response.body()
                        assets[response.url.split('/_next/')[1]]={'bytes':len(body),'gzip':len(gzip.compress(body,mtime=0)),'encoding':response.headers.get('content-encoding','identity')}
                    except Exception: pass
            page.on('response',resource); page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(base+route); page.wait_for_load_state('networkidle')
            if route=='/dashboard': page.locator('#home-objective').wait_for(state='visible')
            data=page.evaluate('''()=>({navigation:performance.getEntriesByType('navigation')[0].toJSON(),resources:performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').pop(),encoded:r.encodedBodySize,decoded:r.decodedBodySize,transfer:r.transferSize})),...window.__bench,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)})''')
            data.update({'route':route,'repeat':repeat,'assets':assets,'errors':errors,'jsGzip':sum(v['gzip'] for k,v in assets.items() if k.endswith('.js')),'cssGzip':sum(v['gzip'] for k,v in assets.items() if k.endswith('.css'))})
            reports.append(data); print(phase,repeat,route,data['jsGzip'],data['cssGzip'],flush=True)
            context.close()
    (out/'performance.json').write_text(json.dumps({'browser':browser.version,'cpuRate':4,'latencyMs':40,'downloadBytesPerSecond':1250000,'viewport':[1440,1000],'reports':reports},indent=2),encoding='utf-8')
    # Same unthrottled visual inventory, with stable fixtures and fonts.
    routes=['/dashboard','/drug-letters','/drug-letters/'+ident,'/chat/'+ident,'/research','/research?run='+research,'/requests','/saved-views','/cases','/approvals','/agents','/evaluations','/control-tower','/admin','/review','/trends','/settings','/help','/sign-in','/not-a-route']
    routes += ['/cases/'+ident+'?view='+v for v in ['overview','plan','execution','impact','review','integrations','evidence','history']]
    visuals=[]
    for width in [390,1440]:
        context=browser.new_context(viewport={'width':width,'height':1000 if width>400 else 844})
        context.add_cookies([{'name':'dli_locale','value':'en','url':base}]); page=context.new_page()
        for route in routes:
            response=page.goto(base+route); page.wait_for_load_state('networkidle'); page.evaluate('document.fonts.ready')
            slug=route.replace('/','-').replace('?','-').replace('=','-').strip('-')
            page.screenshot(path=str(out/f'{slug}-{width}.png'),full_page=True,animations='disabled')
            visuals.append({'route':route,'width':width,'status':response.status if response else None,'url':page.url,'overflow':page.evaluate('Math.max(0,document.documentElement.scrollWidth-innerWidth)')})
        context.close()
    (out/'visuals.json').write_text(json.dumps(visuals,indent=2),encoding='utf-8')
    context=browser.new_context(viewport={'width':1440,'height':1000},record_video_dir=str(out/'video'))
    context.add_cookies([{'name':'dli_locale','value':'en','url':base}]); context.tracing.start(screenshots=True,snapshots=True)
    page=context.new_page(); cdp=context.new_cdp_session(page); cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
    page.goto(base+'/chat/'+ident); page.wait_for_load_state('networkidle')
    trace=[]; cdp.on('Tracing.dataCollected',lambda e:trace.extend(e['value']))
    cdp.send('Tracing.start',{'categories':'devtools.timeline,blink.user_timing','options':'record-as-much-as-possible'})
    page.evaluate('window.__frames=[];window.__recordFrames=true;let last=performance.now();function frame(t){window.__frames.push(t-last);last=t;if(window.__recordFrames)requestAnimationFrame(frame)}requestAnimationFrame(frame)')
    for _ in range(4):
        page.get_by_role('button',name='Sources (1)',exact=True).click()
        page.get_by_role('heading',name='Read the source').wait_for()
        page.keyboard.press('Escape')
        page.get_by_role('button',name='Sources (1)',exact=True).wait_for()
    frames=page.evaluate('window.__recordFrames=false;window.__frames')
    cdp.send('Tracing.end'); page.wait_for_timeout(250) # trace transport flush, not an app assertion
    (out/'interaction-trace.json').write_text(json.dumps({'traceEvents':trace}),encoding='utf-8')
    (out/'frames.json').write_text(json.dumps({'samples':frames,'medianMs':statistics.median(frames) if frames else None,'over32ms':sum(x>32 for x in frames),'cpuRate':4}),encoding='utf-8')
    context.tracing.stop(path=str(out/'interaction.zip')); context.close(); browser.close()
